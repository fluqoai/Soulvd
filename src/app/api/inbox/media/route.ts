import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { tenantUsage } from '@/lib/tenancy/context';
import { uploadMediaKind, MEDIA_UPLOAD_LIMIT } from '@/lib/inbox/media';
import { contactPhone } from '@/lib/growth/contacts';
import { dispatchOne } from '@/lib/meta/worker';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 40;
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return new Response(null, { status: 403 });
  const session = await createClient();
  if (!(await session.auth.getUser()).data.user) return NextResponse.json({ ok: false, message: 'يرجى تسجيل الدخول.' }, { status: 401 });
  const { context, isActive } = await tenantUsage();
  if (!isActive) return NextResponse.json({ ok: false, message: 'فعّل الاشتراك قبل إرسال المرفقات.' }, { status: 403 });
  // Keep the complete multipart request below Vercel's request body limit.
  if (Number(request.headers.get('content-length')) > 4_000_000) return NextResponse.json({ ok: false, message: 'الحد الأقصى للمرفق 3.8 ميجابايت.' }, { status: 413 });
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ ok: false, message: 'تعذر قراءة المرفق.' }, { status: 400 }); }
  const file = form.get('file');
  const id = z.uuid().safeParse(form.get('requestId'));
  const to = contactPhone(String(form.get('to') ?? ''));
  const caption = String(form.get('caption') ?? '').trim();
  if (!id.success || !to || !(file instanceof File) || file.size > MEDIA_UPLOAD_LIMIT || caption.length > 1024)
    return NextResponse.json({ ok: false, message: 'راجع الرقم والمرفق؛ الحد 3.8 ميجابايت ووصف من 1,024 حرفًا.' }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = uploadMediaKind(file.type, bytes);
  if (!kind) return NextResponse.json({ ok: false, message: 'نوع الملف غير مدعوم أو لا يطابق محتواه. استخدم JPEG أو PNG أو PDF أو MP3 أو OGG أو AAC أو MP4.' }, { status: 400 });
  const db = createAdminClient();
  const { data: contact } = await db.from('whatsapp_contacts').select('last_inbound_at').eq('tenant_id', context.tenantId).eq('wa_id', to).maybeSingle();
  if (!contact?.last_inbound_at || Date.parse(contact.last_inbound_at) < Date.now() - 86_400_000)
    return NextResponse.json({ ok: false, message: 'المرفقات متاحة خلال 24 ساعة من آخر رسالة واردة. استخدم قالبًا معتمدًا لبدء المحادثة.' }, { status: 409 });
  const hash = createHash('sha256').update(bytes).digest('hex');
  const reserved = await db.rpc('soulvd_reserve_media_upload', { p_tenant: context.tenantId, p_actor: context.userId, p_request: id.data, p_sha256: hash });
  if (reserved.error || reserved.data !== true) return NextResponse.json({ ok: false, message: 'تعذر حجز رفع المرفق. الحد 10 طلبات في الدقيقة و100 يوميًا؛ انتظر قليلًا ثم حاول مجددًا.' }, { status: 429 });
  const path = `${context.tenantId}/${id.data}`;
  const uploaded = await db.storage.from('conversation-media').upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploaded.error && String(uploaded.error.statusCode) !== '409' && uploaded.error.message !== 'The resource already exists')
    return NextResponse.json({ ok: false, message: 'تعذر حفظ المرفق. تحقق من إعدادات التخزين.' }, { status: 503 });
  // On retries verify the immutable storage bytes, not just a client-supplied hash.
  if (uploaded.error) {
    const existing = await db.storage.from('conversation-media').download(path);
    if (!existing.data || createHash('sha256').update(new Uint8Array(await existing.data.arrayBuffer())).digest('hex') !== hash)
      return NextResponse.json({ ok: false, message: 'هذا الطلب مرتبط بمرفق مختلف. أعد اختيار الملف لبدء طلب جديد.' }, { status: 409 });
  }
  const { data, error } = await db.rpc('soulvd_enqueue_media', { p_tenant: context.tenantId, p_actor: context.userId, p_request: id.data, p_to: to, p_kind: kind, p_mime: file.type, p_filename: file.name.replace(/[\r\n\x00-\x1f]/g, '').slice(0,200), p_sha256: hash, p_caption: kind === 'audio' ? '' : caption });
  if (error || !data?.allowed) return NextResponse.json({ ok: false, message: data?.code === 'WALLET_INSUFFICIENT' ? 'رصيد واتساب غير كافٍ. اشحن المحفظة ثم أعد المحاولة.' : data?.code === 'WINDOW_CLOSED' ? 'انتهت نافذة الرد. استخدم قالبًا معتمدًا.' : data?.code === 'MEDIA_DAILY_LIMIT' ? 'وصلت إلى الحد اليومي للمرفقات (100).' : 'تعذر قبول المرفق. راجع الاشتراك والحصة والربط والرصيد.' }, { status: 409 });
  let message = 'حُفظ المرفق في قائمة الإرسال.';
  try {
    const result = await dispatchOne(data.id);
    if (result?.status === 'accepted') message = 'استلمت خدمة واتساب المرفق. تابع حالة التسليم في المحادثة.';
    else if (result?.status === 'failed') message = 'تعذر إرسال المرفق. راجع حالة الطلب في المحادثة.';
    else if (result?.status === 'unknown') message = 'نتيجة الإرسال غير مؤكدة؛ لن نكرر الطلب تلقائيًا.';
  } catch { /* The durable worker completes the saved job. */ }
  return NextResponse.json({ ok: true, id: data.id, message }, { headers: { 'Cache-Control': 'no-store' } });
}
