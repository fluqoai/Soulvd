import Link from "next/link";
import { CheckCircle2, ArrowUpLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { tenantUsage } from "@/lib/tenancy/context";
import WhatsAppConsole from "./Console";
import InboxDemo from "@/components/onboarding/InboxDemo";

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
  if (!connected && !context.isTest)
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-5 p-2">
          <h1 className="text-2xl font-bold">صندوقك جاهز لأول محادثة</h1>
          <p className="text-sm leading-7 text-ink-500">
            اربط رقم نشاطك وفعّل اشتراكك لاستقبال رسائل عملائك. إلى ذلك الحين،
            جرّب الرد في المحادثة التوضيحية أدناه.
          </p>
          <Link
            href="/app/connect"
            className="inline-flex rounded-xl bg-sage-900 px-5 py-3 text-sm text-white"
          >
            متابعة ربط واتساب
          </Link>
          <InboxDemo />
        </div>
      </div>
    );
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
