"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sar } from "@/lib/billing/terms";

export default function WalletNotice({ tenantId }: { tenantId: string }) {
  const [available, setAvailable] = useState<number | null>(null);
  useEffect(() => {
    const db = createClient();
    let disposed = false;
    let loading = false;
    async function refresh() {
      if (document.hidden || loading) return;
      loading = true;
      try {
        const { data, error } = await db.from("messaging_wallets")
          .select("balance_micro,held_micro").eq("tenant_id", tenantId).maybeSingle();
        if (!disposed && !error) setAvailable(Number(data?.balance_micro ?? 0) - Number(data?.held_micro ?? 0));
      } catch {
        // Keep the last known balance; a network failure is not a zero balance.
      } finally { loading = false; }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [tenantId]);

  if (available === null || available > 2000000) return null;
  return (
    <aside role="status" className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <Wallet size={20} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{available <= 0 ? "أضف رصيدًا للرسائل المدفوعة" : "رصيد واتساب يقترب من النفاد"}</p>
        <p className="mt-1 leading-6">المتاح {sar(available / 1000000)} ريال. اشحن مبكرًا لتجنب توقف الرسائل المدفوعة؛ تأكيد التحويل البنكي يتطلب مراجعة.</p>
      </div>
      <Link href="/app/wallet" className="rounded-xl border border-amber-300 bg-white px-4 py-2 font-semibold">متابعة الرصيد</Link>
    </aside>
  );
}
