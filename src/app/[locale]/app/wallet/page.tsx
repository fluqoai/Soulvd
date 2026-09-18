import Link from "next/link";
import { ArrowDownLeft, ArrowUpLeft, Wallet, Hourglass, ReceiptText, ShieldCheck } from "lucide-react";
import { currentMerchant, tenantUsage } from "@/lib/tenancy/context";
import { launchSettings } from "@/lib/billing/launch";
import { sar } from "@/lib/billing/terms";
import BankDetails from "@/components/billing/BankDetails";
import {
  RequestPayment,
  PaymentRequestCard,
} from "@/components/billing/PaymentForms";
import { paymentRequests } from "../billing/actions";
export default async function WalletPage() {
  const { context, isActive } = await tenantUsage();
  const launch = await launchSettings();
  const { db } = await currentMerchant();
  const [wallet, ledger, requests] = await Promise.all([
    db
      .from("messaging_wallets")
      .select("balance_micro,held_micro")
      .eq("tenant_id", context.tenantId)
      .maybeSingle(),
    db
      .from("wallet_ledger")
      .select("id,amount_micro,kind,created_at")
      .eq("tenant_id", context.tenantId)
      .order("created_at", { ascending: false })
      .limit(50),
    paymentRequests(),
  ]);
  if (wallet.error || ledger.error) throw new Error("تعذر تحميل المحفظة.");
  const balance = Number(wallet.data?.balance_micro ?? 0),
    held = Number(wallet.data?.held_micro ?? 0);
  const open = requests.filter(
    (r) =>
      r.purpose === "wallet" && ["pending", "submitted"].includes(r.status),
  );
  const canManage =
    context.role === "owner" &&
    !context.isTest &&
    (launch.payments || isActive);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
        <p className="sv-kicker mb-3 text-sage-700"><Wallet size={16} aria-hidden="true" /> محفظة مساحة العمل</p>
        <h1 className="text-3xl font-bold">رصيد واتساب</h1>
        <p className="mt-2 text-sm text-wood-600">
          محفظة مستقلة عن اشتراك المنصة؛ الشحن بالتحويل البنكي.
        </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-sage-200 bg-white px-4 py-2 text-xs text-sage-800">
          <ShieldCheck size={15} aria-hidden="true" /> سجل واضح لكل عملية
        </span>
      </header>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr_1fr]">
        <section className="sv-hero p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm text-white/80">المتاح للإرسال</h2>
            <Wallet size={22} aria-hidden="true" className="text-[#d9e8b5]" />
          </div>
          <p className="my-5 text-5xl font-semibold tabular-nums">
            {sar((balance - held) / 1000000)} <span className="text-base font-normal text-white/75">ريال</span>
          </p>
          <p className="text-sm leading-7 text-white/80">
            {balance - held <= 0 ? "يلزم رصيد متاح للرسائل المدفوعة. الردود التي يثبت النظام مجانيتها تُرسل دون حجز مالي." : "هذا المبلغ متاح بعد استبعاد العمليات التي تنتظر التسوية."}
          </p>
          {canManage && (
            <a href="#wallet-funding" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#d9e8b5] px-4 py-3 text-sm font-bold text-[#173e32] hover:bg-white">
              {open.length ? "متابعة طلب الشحن" : "شحن رصيد واتساب"}<ArrowUpLeft size={17} aria-hidden="true" />
            </a>
          )}
        </section>
        {[
          { label: "قيد التسوية", value: held, icon: Hourglass, hint: "محجوز مؤقتًا حتى وصول التكلفة النهائية", tone: "bg-amber-50 text-amber-800" },
          { label: "الرصيد الكلي", value: balance, icon: ReceiptText, hint: "يشمل المبلغ المتاح والمبلغ المحجوز", tone: "bg-slate-100 text-slate-700" },
        ].map(({label, value, icon: Icon, hint, tone}) => (
          <section
            key={label}
            className="sv-surface sv-stat flex flex-col items-start p-6"
          >
            <span className={`mb-5 rounded-xl p-3 ${tone}`}><Icon size={21} aria-hidden="true" /></span>
            <h2 className="text-sm text-ink-600">{label}</h2>
            <p className="mb-3 mt-3 text-3xl font-bold tabular-nums">
              {sar(Number(value) / 1000000)}{" "}
              <span className="text-sm font-normal">ريال</span>
            </p>
            <p className="mt-auto text-xs leading-6 text-ink-500">{hint}</p>
          </section>
        ))}
      </div>
      <section className="sv-surface space-y-3 p-6 text-sm leading-7">
        <h2 className="font-bold">كيف تُحسب التكلفة؟</h2>
        <p>
          تكلفة المزود الفعلية × 3.75 للتحويل إلى الريال، ثم تضاف 15% رسوم خدمة.
          مثلًا: تكلفة مزود قدرها 10 ريالات تصبح 11.50 ريال.
        </p>
        <p>
          يُحجز تقدير محافظ قبل إرسال الرسالة ويُخصم المبلغ النهائي عند تأكيد
          التسليم. لا نطلب حجزًا للردود النصية والوسائط التي تثبت مجانيتها وفق سياسة التسعير السارية؛ وتُحرر الزيادة بعد التسوية. تبقى الحالات
          غير المحسومة محجوزة للمراجعة. يظهر الرصيد بمنزلتين، وتُحفظ الحسابات
          بدقة أعلى.
        </p>
        <p>
          الإطلاق الحالي يدعم تسعير المستلمين السعوديين؛ لإضافة وجهات أخرى{" "}
          <Link href="/contact" className="underline">
            تواصل معنا
          </Link>
          . إذا لم تتوفر تعرفة معتمدة أو رصيد كافٍ يتوقف الإرسال قبل الخصم.
        </p>
      </section>
      {context.isTest && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm">
          مساحة اختبار: لا تُسجل تحويلات عملاء هنا. يلزم رصيد اختبار معتمد من
          الإدارة قبل إرسال رسائل مدفوعة.
        </p>
      )}
      {!launch.payments && !isActive && !context.isTest && (
        <p className="rounded-2xl bg-sage-50 p-5 text-sm leading-7">
          لا تحتاج شحن الرصيد أثناء تجهيز المساحة. يصبح الشحن متاحًا عند فتح
          تفعيل الخدمة.
        </p>
      )}
      {canManage && (
        <section id="wallet-funding" className="sv-surface scroll-mt-28 space-y-5 p-6">
          <div>
            <p className="sv-kicker mb-2 text-sage-700">ثلاث خطوات، ورصيدك جاهز</p>
            <h2 className="text-xl font-bold">شحن المحفظة بالتحويل البنكي</h2>
          </div>
          <ol className="grid gap-3 text-sm sm:grid-cols-3">
            {["أنشئ طلب الشحن بالمبلغ المطلوب", "حوّل المبلغ وأدخل مرجع العملية", "نعتمد وصول التحويل ويضاف الرصيد"].map((step, index) => (
              <li key={step} className="flex items-start gap-3 rounded-xl border border-sage-100 bg-sage-50/60 p-4 leading-7">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-sage-800">{index + 1}</span>{step}
              </li>
            ))}
          </ol>
          <p className="text-sm text-ink-500">الحد الأدنى للشحن 50 ريالًا. لا يضاف الرصيد بمجرد إرسال المرجع؛ نتحقق من وصول التحويل أولًا.</p>
          <BankDetails />
          {!open.length && <RequestPayment purpose="wallet" />}
          {open.map((r) => <PaymentRequestCard key={r.id} item={r} canManage />)}
        </section>
      )}
      {!canManage && open.map((r) => (
        <PaymentRequestCard key={r.id} item={r} canManage={canManage} />
      ))}
      <section className="sv-surface p-6">
        <h2 className="mb-4 text-xl font-bold">آخر العمليات</h2>
        {!ledger.data.length && (
          <div className="rounded-2xl border border-dashed border-sage-300 bg-sage-50/40 px-5 py-8 text-center">
            <ReceiptText className="mx-auto mb-3 text-sage-600" size={28} aria-hidden="true" />
            <p className="font-semibold">سجلّك المالي يبدأ من أول عملية</p>
            <p className="mt-2 text-sm text-ink-500">ستظهر هنا عمليات الشحن وتكاليف الرسائل بعد تسويتها.</p>
          </div>
        )}
        <ul className="divide-y">
          {ledger.data.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap justify-between gap-3 py-3 text-sm"
            >
              <span className="flex items-center gap-3">
                <span className={`rounded-lg p-2 ${row.kind === "message" ? "bg-slate-100 text-slate-600" : "bg-sage-50 text-sage-700"}`}><ArrowDownLeft size={16} aria-hidden="true" /></span>
                {row.kind === "topup"
                  ? "شحن مؤكد"
                  : row.kind === "welcome_credit"
                    ? "هدية بداية من سولفد"
                  : row.kind === "test_credit"
                    ? "ميزانية اختبار من المنصة"
                    : "تكلفة رسالة"}{" "}
                ·{" "}
                {new Date(row.created_at).toLocaleString("ar-SA", {
                  calendar: "gregory",
                  timeZone: "Asia/Riyadh",
                })}
              </span>
              <bdi>{sar(Number(row.amount_micro) / 1000000)} ريال</bdi>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
