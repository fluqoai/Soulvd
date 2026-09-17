import Link from "next/link";
import { currentMerchant, requireTenant } from "@/lib/tenancy/context";
import { sar } from "@/lib/billing/terms";
import BankDetails from "@/components/billing/BankDetails";
import {
  RequestPayment,
  PaymentRequestCard,
} from "@/components/billing/PaymentForms";
import { paymentRequests } from "../billing/actions";
export default async function WalletPage() {
  const context = await requireTenant();
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
  const canManage = context.role === "owner" && !context.isTest;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">رصيد واتساب</h1>
        <p className="mt-2 text-sm text-wood-600">
          محفظة مستقلة عن اشتراك المنصة؛ الشحن بالتحويل البنكي.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["المتاح للإرسال", balance - held],
          ["قيد التسوية", held],
          ["الرصيد الكلي", balance],
        ].map(([label, value]) => (
          <section
            key={label}
            className="rounded-2xl border border-sage-200 bg-white p-6"
          >
            <h2 className="text-sm text-wood-600">{label}</h2>
            <p className="mt-3 text-3xl font-bold">
              {sar(Number(value) / 1000000)}{" "}
              <span className="text-sm font-normal">ريال</span>
            </p>
          </section>
        ))}
      </div>
      <section className="space-y-3 rounded-xl border bg-white p-5 text-sm leading-7">
        <h2 className="font-bold">كيف تُحسب التكلفة؟</h2>
        <p>
          تكلفة المزود الفعلية × 3.75 للتحويل إلى الريال، ثم تضاف 15% رسوم خدمة.
          مثلًا: تكلفة مزود قدرها 10 ريالات تصبح 11.50 ريال.
        </p>
        <p>
          يُحجز تقدير محافظ قبل إرسال الرسالة ويُخصم المبلغ النهائي عند تأكيد
          التسليم. تُحرر الزيادة والرسائل المجانية بعد التسوية، وتبقى الحالات
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
      {canManage && (
        <>
          <BankDetails />
          {!open.length && <RequestPayment purpose="wallet" />}
        </>
      )}
      {open.map((r) => (
        <PaymentRequestCard key={r.id} item={r} canManage={canManage} />
      ))}
      <section className="rounded-xl border bg-white p-5">
        <h2 className="mb-4 text-xl font-bold">آخر العمليات</h2>
        {!ledger.data.length && (
          <p className="text-sm text-wood-600">لم تُسجل عمليات مالية بعد.</p>
        )}
        <ul className="divide-y">
          {ledger.data.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap justify-between gap-3 py-3 text-sm"
            >
              <span>
                {row.kind === "topup" ? "شحن مؤكد" : row.kind === "test_credit" ? "ميزانية اختبار من المنصة" : "تكلفة رسالة"} ·{" "}
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
