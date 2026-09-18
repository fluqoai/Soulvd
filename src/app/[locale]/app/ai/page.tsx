import Link from 'next/link';
import { tenantUsage } from '@/lib/tenancy/context';
import { aiStatus } from '@/lib/studio/ai-status';
import { aiReady } from '@/lib/studio/worker';
import { launchSettings } from '@/lib/billing/launch';
import { paymentRequests } from '../billing/actions';
import { PaymentRequestCard, RequestPayment } from '@/components/billing/PaymentForms';
import BankDetails from '@/components/billing/BankDetails';

export default async function AIPage() {
  const {context,isActive,plan}=await tenantUsage();
  const manager=['owner','admin'].includes(context.role);
  if(!manager) return <p>إدارة حصة المساعد الذكي متاحة لمالك المساحة ومديرها.</p>;
  const [status,requests,launch]=await Promise.all([aiStatus(context.tenantId,context.userId),paymentRequests(),launchSettings()]);
  const ready=aiReady();
  const payments=requests.filter(r=>r.purpose==='ai');
  const open=payments.some(r=>['pending','submitted'].includes(r.status));
  const canBuy=context.role==='owner'&&!context.isTest&&isActive&&ready&&launch.payments;
  const percent=status.total?Math.round((status.total-status.remaining)/status.total*100):0;
  return <div className="mx-auto max-w-5xl space-y-6">
    <section className="relative overflow-hidden rounded-3xl border border-sage-300 bg-sage-900 p-6 text-white sm:p-8">
      <p className="text-sm opacity-80">معلومات نشاطك، بأسلوبك</p>
      <h1 className="mt-2 text-3xl font-bold">مساعد سولفد الذكي</h1>
      <p className="mt-3 max-w-2xl leading-8">يرد من المعلومات التي تضيفها، ويساعد فريقك بالمسودات أو الرد التلقائي. عندما لا يجد إجابة موثوقة، يحوّل المحادثة للموظف.</p>
      <Link href="/app/automations" className="mt-5 inline-block rounded-xl bg-white px-5 py-3 font-bold text-sage-900">إعداد معرفة المساعد ومساراته ←</Link>
    </section>
    {!ready&&<p role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-4">المساعد قيد التجهيز. شراء الردود متوقف حتى جاهزية الخدمة.</p>}
    {!isActive&&<p className="sv-surface p-5">تبدأ الحصة بعد تأكيد اشتراكك المدفوع. <Link className="underline" href="/app/billing">عرض الاشتراك</Link></p>}
    <section className="sv-surface space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-bold">رصيد الردود الذكية</h2><p className="mt-2 text-4xl font-bold">{status.remaining.toLocaleString('ar-SA')} <span className="text-base font-normal">رد متبقٍ</span></p></div><p className="text-sm">المتاح ضمن حدك اليومي: {Math.min(status.remaining,status.dailyRemaining).toLocaleString('ar-SA')}</p></div>
      <progress aria-label="استهلاك حصة الردود الذكية" max={100} value={percent} className="h-3 w-full accent-sage-700" />
      <div className="grid gap-3 sm:grid-cols-2"><p className="rounded-xl border border-sage-200 p-4">المشمول في الباقة: <strong>{status.included}</strong></p><p className="rounded-xl border border-sage-200 p-4">الشحن الإضافي: <strong>{status.extra}</strong></p></div>
      {status.total>0&&percent>=80&&<p role="status" className="rounded-xl bg-amber-50 p-4 text-sm">{status.remaining===0?'انتهت الحصة. أضف ردودًا لمتابعة المساعد؛ يظل فريقك قادرًا على إدارة المحادثات.':'استهلكت 80% أو أكثر من رصيدك الحالي. اشحن قبل نفاده لتجنب توقف الردود الذكية.'}</p>}
      {status.buckets.map((b,i)=><p key={i} className="text-sm text-wood-600">{b.kind==='monthly'?'الحصة الشهرية':b.kind==='trial'?'تجربة الانطلاق':'شحن إضافي'}: {b.remaining} من {b.quantity} رد · تنتهي {new Date(b.expiresAt).toLocaleDateString('ar-SA',{calendar:'gregory',timeZone:'Asia/Riyadh'})}</p>)}
      <p className="text-sm leading-7">{plan.code==='pro_growth'?'تتجدد 1,000 رد شهريًا حسب تاريخ بداية اشتراكك، حتى في الاشتراك السنوي. الحصة الشهرية غير المستخدمة لا تتراكم.':'تتضمن الانطلاق 100 رد للتجربة مرة واحدة بعد أول اشتراك مدفوع. النمو تمنحك 1,000 رد كل شهر.'}</p>
      <p className="text-xs leading-6 text-wood-600">عند نفاد الحصة تتحول المحادثة للموظف. بعد الشحن، راجع المحادثات المحوّلة واستأنف البوت من الأتمتة عندما تكون جاهزًا؛ لا نعيد تشغيله فوق محادثة يتولاها فريقك.</p>
      {plan.code==='starter'&&<Link className="inline-block font-bold underline" href="/app/billing/upgrade">اكتشف باقة النمو ←</Link>}
    </section>
    <section className="sv-surface space-y-4 p-6"><h2 className="text-xl font-bold">مزيد من الردود عند الحاجة</h2>
      {open?<p>لديك طلب شحن مفتوح أدناه؛ أكمله أو ألغِه قبل إنشاء طلب آخر.</p>:<RequestPayment purpose="ai" disabled={!canBuy}/>}
      {!launch.payments&&<p className="text-sm text-wood-600">عرض للأسعار فقط حتى فتح استقبال المدفوعات. لا تحوّل مبلغًا الآن.</p>}
      {canBuy&&open&&<BankDetails/>}
    </section>
    {payments.map(item=><PaymentRequestCard key={item.id} item={item} canManage={context.role==='owner'}/>)}
    <section className="sv-surface space-y-3 p-6 text-sm leading-7"><h2 className="text-lg font-bold">ما الذي يُحسب ردًا؟</h2><p>مسودة ذكية صالحة للمراجعة أو رد آلي مقبول للإرسال يُحسب مرة واحدة. لا تُحسب ردود الأتمتة الثابتة، أو أعطال التوليد، أو إحالة المساعد للمستخدم إلى موظف. تكلفة إرسال واتساب مستقلة.</p><p>تشمل الخدمة إجابات نصية من معرفة محدودة وسياق حديث، بحد أقصى 500 وحدة توليد للرد. تحليل الملفات الطويلة والصوت والصور وتنفيذ عمليات في نظام خارجي ليست ضمن هذه الحزم. لا يؤكد المساعد حجزًا أو دفعًا دون تكامل فعلي يتحقق منه.</p></section>
  </div>;
}
