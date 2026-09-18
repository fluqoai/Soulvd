import Link from "next/link";
import { currentMerchant, requireTenant } from "@/lib/tenancy/context";
import Importer from "./Importer";
export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page, q = "" } = await searchParams;
  const n = Math.max(1, Math.min(400, Math.floor(Number(page) || 1)));
  const c = await requireTenant(),
    { db } = await currentMerchant();
  let query = db
    .from("audience_contacts")
    .select("id,phone,name,segment,consent_at,suppressed", { count: "exact" })
    .eq("tenant_id", c.tenantId);
  if (q.trim())
    query = query.ilike(
      /^[+\d\s]+$/.test(q.trim()) ? "phone" : "name",
      "%" + q.trim().slice(0, 100).replace(/[%_+]/g, "") + "%",
    );
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range((n - 1) * 50, n * 50 - 1);
  if (error) throw new Error("تعذر تحميل دفتر العملاء.");
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-sage-700">جمهورك في مكان واحد</p>
          <h1 className="mt-2 text-3xl font-bold">العملاء</h1>
          <p className="mt-3 text-sm text-ink-500">
            استورد الأسماء والأرقام، ونظّمها في شرائح لحملاتك. الاستيراد لا يرسل
            أي رسالة.
          </p>
        </div>
        <Link
          href="/app/campaigns"
          className="rounded-xl bg-sage-900 px-4 py-3 text-sm text-white"
        >
          تجهيز حملة ←
        </Link>
      </header>
      <Importer
        rows={data ?? []}
        total={count ?? 0}
        canManage={["owner", "admin"].includes(c.role)}
      />
      <form className="flex gap-2">
        <input
          aria-label="البحث بالاسم أو الرقم"
          name="q"
          defaultValue={q}
          placeholder="البحث بالاسم أو الرقم"
          className="min-w-0 rounded-xl border bg-white p-3"
        />
        <button className="rounded-xl border px-4">بحث</button>
      </form>
      <div className="flex gap-4 text-sm">
        {n > 1 && (
          <Link href={`?page=${n - 1}&q=${encodeURIComponent(q)}`}>السابق</Link>
        )}
        {n * 50 < (count ?? 0) && (
          <Link href={`?page=${n + 1}&q=${encodeURIComponent(q)}`}>التالي</Link>
        )}
      </div>
    </div>
  );
}
