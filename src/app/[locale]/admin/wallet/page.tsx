import Link from "next/link";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { currentMerchant } from "@/lib/tenancy/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { sar } from "@/lib/billing/terms";
import { TestCredit, RetrySettlement } from "./Forms";
type Audit = {
  wallets: {
    tenant_id: string;
    name: string;
    is_test: boolean;
    balance_micro: number;
    held_micro: number;
  }[];
  holds: {
    job_id: string;
    name: string;
    held_micro: number;
    error_code: string | null;
    state: string;
    provider_id: string | null;
    created_at: string;
    attempts: number;
  }[];
  rates: {
    destination_pattern: string;
    valid_from: string;
    valid_until: string;
    reserve_usd: number;
    source_url: string;
  }[];
  test_spaces: { id: string; name: string }[];
};
export default async function WalletAdmin() {
  const { db, user } = await currentMerchant();
  const { data: profile } = await db
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "owner") redirect("/admin");
  const { data, error } = await createAdminClient().rpc("soulvd_wallet_audit", {
    p_actor: user.id,
  });
  if (error) throw new Error("تعذر تحميل مراجعة المحافظ.");
  const audit = data as Audit;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">متابعة محافظ واتساب</h1>
      <Link href="/admin/subscriptions" className="block underline">
        مراجعة تحويلات الشحن
      </Link>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">الأرصدة</h2>
        {!audit.wallets.length && <p>لا توجد محافظ نشطة بعد.</p>}
        {audit.wallets.map((w) => (
          <article key={w.tenant_id} className="rounded-xl border bg-white p-4">
            <h3 className="font-bold">
              {w.name}
              {w.is_test ? " · اختبار" : ""}
            </h3>
            <p className="mt-2">
              متاح: {sar((w.balance_micro - w.held_micro) / 1000000)} ريال ·
              محجوز: {sar(w.held_micro / 1000000)} ريال
            </p>
            {w.balance_micro < 0 && (
              <p className="text-red-700">
                تجاوزت التكلفة الفعلية الرصيد. الإرسال متوقف حتى التسوية.
              </p>
            )}
          </article>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">الحجوزات والتنبيهات</h2>
        {!audit.holds.length && <p>لا توجد عمليات معلقة أو تنبيهات تكلفة.</p>}
        {audit.holds.map((h) => (
          <article
            key={h.job_id}
            className="rounded-xl border bg-white p-4 text-sm"
          >
            <h3 className="font-bold">{h.name}</h3>
            <p className="mt-2">
              {h.state} · {sar(h.held_micro / 1000000)} ريال ·{" "}
              {h.error_code ?? "بانتظار التكلفة النهائية"}
            </p>
            <p className="mt-2">
              {new Date(h.created_at).toLocaleString("ar-SA", {
                timeZone: "Asia/Riyadh",
                calendar: "gregory",
              })}
            </p>
            {h.provider_id && h.state === "held" ? (
              <RetrySettlement id={h.job_id} />
            ) : (
              h.state === "held" && (
                <p className="mt-2 text-amber-800">
                  لم يصل معرف الرسالة من المزود. راجع سجل YCloud والمرجع الخارجي
                  قبل أي إجراء؛ لا تعِد إرسالها تلقائيًا.
                </p>
              )
            )}
            <bdi className="mt-2 block select-all text-xs">{h.job_id}</bdi>
          </article>
        ))}
      </section>
      <details className="rounded-xl border bg-white p-5">
        <summary className="cursor-pointer font-bold">
          تعرفة الحجز ومواعيد مراجعتها
        </summary>
        <p className="mt-3 text-sm">
          هذه حدود حجز احتياطية، وليست أسعار الخصم. تُراجع التعرفة قبل انتهاء
          صلاحيتها؛ عند الانتهاء يتوقف الإرسال لهذه الوجهة حتى التحديث.
        </p>
        {audit.rates.map((r) => (
          <p key={r.valid_from} className="mt-3 text-sm">
            السعودية · سقف المزود ${r.reserve_usd} · حتى{" "}
            {new Date(r.valid_until).toLocaleDateString("ar-SA", {
              calendar: "gregory",
            })}{" "}
            ·{" "}
            <a
              href={r.source_url}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              المصدر
            </a>
          </p>
        ))}
      </details>
      <TestCredit spaces={audit.test_spaces} request={randomUUID()} />
    </div>
  );
}
