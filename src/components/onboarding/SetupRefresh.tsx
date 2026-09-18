"use client";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
export default function SetupRefresh({ watch = false }: { watch?: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  useEffect(() => {
    if (!watch) return;
    const refresh = () => {
      if (document.visibilityState === "visible") start(() => router.refresh());
    };
    const timer = setInterval(refresh, 20000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [watch, router]);
  return (
    <button
      onClick={() => start(() => router.refresh())}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-sage-700 hover:bg-sage-50 disabled:opacity-50"
    >
      <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
      {busy ? "جارٍ التحديث…" : "تحديث الحالة"}
    </button>
  );
}
