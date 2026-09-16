import { createClient } from '@/lib/supabase/server';
import { tenantUsage } from '@/lib/tenancy/context';
import WhatsAppConsole from './Console';

export default async function WhatsAppPage() {
  const { context, isActive } = await tenantUsage();
  const db = await createClient();
  const [numbers, templates, messages, contacts] = await Promise.all([
    db.from('whatsapp_numbers').select('id,phone,status').eq('tenant_id', context.tenantId),
    db.from('whatsapp_templates').select('id,name,status,language,provider_status').eq('tenant_id', context.tenantId).order('name').limit(100),
    db.from('whatsapp_messages').select('id,contact_id,direction,kind,body,status,created_at').eq('tenant_id', context.tenantId).order('created_at', { ascending: false }).limit(100),
    db.from('whatsapp_contacts').select('id,wa_id').eq('tenant_id', context.tenantId).order('last_inbound_at', { ascending: false }).limit(200),
  ]);
  const unavailable = [numbers, templates, messages, contacts].some(result => result.error);
  if (unavailable) return <div role="status" className="rounded-xl border border-sage-200 bg-white p-6"><h1 className="text-2xl font-bold">واتساب</h1><p className="mt-4">لم تكتمل تهيئة قاعدة بيانات واتساب بعد. تواصل مع إدارة المنصة.</p></div>;
  const phoneByContact = new Map(contacts.data?.map(contact => [contact.id, contact.wa_id]));
  const labels: Record<string,string> = { received: 'واردة', queued: 'في القائمة', processing: 'قيد التنفيذ', accepted: 'استلمت Meta الطلب', sent: 'أُرسلت', delivered: 'تم التسليم', read: 'مقروءة', failed: 'فشل الطلب', unknown: 'نتيجة غير مؤكدة', pending: 'قيد مراجعة Meta', approved: 'معتمد', rejected: 'مرفوض', archived: 'مؤرشف' };
  return <div className="space-y-8">
    <div><h1 className="text-3xl font-bold">واتساب</h1><p className="mt-2">المحادثات والقوالب في مساحة {context.name}</p></div>
    <div className="rounded-xl border border-sage-200 bg-white p-5">{numbers.data?.length ? numbers.data.map(number => <p key={number.id}><b dir="ltr">{number.phone}</b> — {number.status === 'connected' ? 'تفويض محفوظ؛ تحقق من الإرسال والاستقبال' : 'الربط غير مكتمل'}</p>) : 'لم يُربط رقم بهذه المساحة بعد.'}</div>
    <WhatsAppConsole templates={templates.data ?? []} canManage={['owner','admin'].includes(context.role)} canConnect={context.role === 'owner' && isActive} appId={process.env.NEXT_PUBLIC_META_APP_ID} configId={process.env.NEXT_PUBLIC_META_CONFIG_ID} version={process.env.META_GRAPH_VERSION} />
    <section className="space-y-3"><h2 className="text-xl font-bold">القوالب</h2>{templates.data?.map(template => <p key={template.id} className="rounded-lg border border-sage-200 bg-white p-3"><span dir="ltr">{template.name}</span> — {labels[template.status] ?? template.status} ({template.language})</p>)}{!templates.data?.length && <p>لا توجد قوالب بعد.</p>}</section>
    <section className="space-y-3"><h2 className="text-xl font-bold">آخر 100 رسالة</h2>{messages.data?.map(message => <article key={message.id} className="rounded-xl border border-sage-200 bg-white p-4"><div className="flex flex-wrap gap-3 text-sm"><b>{message.direction === 'inbound' ? 'واردة' : 'صادرة'}</b><span dir="ltr">{phoneByContact.get(message.contact_id) ?? 'عميل'}</span><span>{labels[message.status] ?? message.status}</span><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })}</time></div><p className="mt-3 whitespace-pre-wrap break-words">{message.body}</p></article>)}{!messages.data?.length && <p>ستظهر الرسائل بعد اختبار الربط والاستقبال.</p>}</section>
  </div>;
}
