import Link from 'next/link';
import { tenantUsage, currentMerchant } from '@/lib/tenancy/context';
import { StudioHeader, cardClass } from '../studio/ui';
import Connections from './Connections';
export default async function IntegrationsPage() {
  const { context, plan, isActive } = await tenantUsage();
  const { db } = await currentMerchant();
  const [items, deliveries] = await Promise.all([
    db
      .from('crm_integrations')
      .select('id,name,endpoint_url,status')
      .eq('tenant_id', context.tenantId)
      .order('created_at', { ascending: false }),
    db
      .from('crm_deliveries')
      .select('id,event_type,status,attempts,error_code,created_at')
      .eq('tenant_id', context.tenantId)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);
  if (items.error || deliveries.error) throw new Error('تعذر تحميل التكاملات.');
  const available = isActive && plan.api_enabled;
  return (
    <div className="space-y-8">
      <StudioHeader
        title="التكاملات وAPI"
        description="اربط نظام شركتك بالمحادثات، وأرسل الرسائل من نظامك، واستقبل تحديثات الحالة في وجهة موثوقة."
      />
      <Link href="/app/guide?goal=integration" className="block rounded-2xl border border-sage-200 bg-sage-50 p-5 text-sm leading-7"><strong className="block text-lg">تريد الربط ولا تعرف التفاصيل التقنية؟</strong>صف نظامك والنتيجة المطلوبة؛ نحفظ التجهيز ليُراجع قبل الاتفاق على نطاق الربط ورسومه ←</Link>
      {!available && (
        <p className={cardClass}>
          التكاملات متاحة مع اشتراك نمو نشط.{' '}
          <Link className="underline" href="/app/billing/upgrade">
            عرض باقة النمو
          </Link>
        </p>
      )}
      <Connections
        items={items.data}
        canManage={available && ['owner', 'admin'].includes(context.role)}
      />
      <section className={cardClass + ' space-y-4'}>
        <h2 className="text-xl font-bold">دليل المطور</h2>
        <p>
          احفظ المفاتيح على خادم نظامك. حد API هو 60 طلبًا في الدقيقة لكل تكامل.
          ينتهي المفتاح بعد 90 يومًا ويمكن تدويره أو تعطيله من هنا.
        </p>
        <pre
          dir="ltr"
          className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-100"
        >{`POST https://www.soulvd.sa/api/v1/messages\nAuthorization: Bearer <API_KEY>\nIdempotency-Key: <UUID>\nContent-Type: application/json\n\n{"to":"+9665xxxxxxxx","body":"مرحبًا"}\n\nGET https://www.soulvd.sa/api/v1/messages\nAuthorization: Bearer <API_KEY>`}</pre>
        <p>
          للحصول على معرّفات القوالب المعتمدة استخدم GET /api/v1/templates.
          استجابة الإرسال تتضمن id للرسالة، ويمكن متابعة حالتها باستخدام GET
          /api/v1/messages?id=ID. لتصفح السجل أرسل nextCursor في معامل cursor.
        </p>
        <p>
          إرسال قالب: أضف templateId وقائمة parameters بالترتيب وconsent بعد
          موافقة العميل. الرد النصي يتطلب رسالة واردة خلال 24 ساعة. الاستجابة
          202 تعني تسجيل طلب الإرسال؛ حالة التسليم تصل لاحقًا.
        </p>
        <p>
          الأحداث: message.received وmessage.accepted وmessage.unknown وmessage.sent وmessage.delivered
          وmessage.read وmessage.failed. تحقق من X-Soulvd-Signature باستخدام
          HMAC-SHA256 على timestamp.rawBody وسر التوقيع، وارفض طابعًا زمنيًا
          أقدم من 5 دقائق. امنع معالجة الحدث مرتين باستخدام X-Soulvd-Event-Id.
        </p>
        <p>
          أعد HTTP 2xx بعد حفظ الحدث. نعيد المحاولة للأخطاء المؤقتة حتى 5 مرات.
          الربط يدعم روابط HTTPS عامة دون تحويلات أو عناوين شبكات داخلية.
        </p>
      </section>
      <section className={cardClass + ' space-y-3'}>
        <h2 className="text-xl font-bold">سجل تسليم الأحداث</h2>
        {!deliveries.data.length && <p>لا توجد أحداث بعد.</p>}
        {deliveries.data.map((d) => (
          <div key={d.id} className="border-b py-3">
            <bdi>{d.event_type}</bdi>
            <p>
              {d.status === 'delivered'
                ? 'تم التسليم'
                : d.status === 'failed'
                  ? 'تعذر التسليم'
                  : d.status === 'processing'
                    ? 'قيد التنفيذ'
                    : 'في الانتظار'}{' '}
              · المحاولات {d.attempts}
              {d.error_code ? ` · ${d.error_code}` : ''}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
