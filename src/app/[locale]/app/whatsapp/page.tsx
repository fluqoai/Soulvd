import Link from "next/link";
import { CheckCircle2, ArrowUpLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { tenantUsage } from "@/lib/tenancy/context";
import WhatsAppConsole from "./Console";

export default async function WhatsAppPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const q = await searchParams;
  const initialRecipient = q.phone && /^\d{7,15}$/.test(q.phone) ? q.phone : "";
  const { context, isActive } = await tenantUsage();
  const db = await createClient();
  const [numbers, templates] = await Promise.all([
    db
      .from("whatsapp_numbers")
      .select("id,phone,status")
      .eq("tenant_id", context.tenantId),
    db
      .from("whatsapp_templates")
      .select("id,name,status,language,provider_status,parameter_count,body")
      .eq("tenant_id", context.tenantId)
      .order("name")
      .limit(100),
  ]);
  if ([numbers, templates].some((r) => r.error))
    throw new Error("تعذر تحميل محادثات واتساب.");
  const connected = numbers.data?.find((n) => n.status === "connected");
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <h1 className="text-lg font-bold">المحادثات</h1>
        {connected ? (
          <span className="flex items-center gap-2 text-sage-700">
            <CheckCircle2 size={15} />
            <bdi>{connected.phone}</bdi>
            <span>متصل</span>
          </span>
        ) : (
          <Link
            href="/app/connect"
            className="font-semibold text-sage-700 underline"
          >
            اربط رقمك لبدء المحادثات
          </Link>
        )}
        <Link
          href="/app/readiness"
          className="flex items-center gap-1 text-ink-500"
        >
          اختبار الربط
          <ArrowUpLeft size={14} />
        </Link>
      </div>
      <WhatsAppConsole
        key={`${context.tenantId}.${initialRecipient}`}
        initialRecipient={initialRecipient}
        templates={templates.data ?? []}
        connected={Boolean(connected)}
        canManage={["owner", "admin"].includes(context.role)}
        canConnect={
          context.role === "owner" && isActive && context.isTest === true
        }
        appId={process.env.NEXT_PUBLIC_META_APP_ID}
        configId={process.env.NEXT_PUBLIC_META_CONFIG_ID}
        version={process.env.META_GRAPH_VERSION}
      />
    </div>
  );
}
