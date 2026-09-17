import Link from "next/link";
import { CheckCircle2, ArrowUpLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { tenantUsage } from "@/lib/tenancy/context";
import WhatsAppConsole from "./Console";

export default async function WhatsAppPage() {
  const { context, isActive } = await tenantUsage();
  const db = await createClient();
  const [numbers, templates, messages] = await Promise.all([
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
    db
      .from("whatsapp_messages")
      .select("id,contact_id,direction,kind,body,status,created_at")
      .eq("tenant_id", context.tenantId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if ([numbers, templates, messages].some((r) => r.error))
    throw new Error("تعذر تحميل محادثات واتساب.");
  const contactIds = [
    ...new Set((messages.data ?? []).map((m) => m.contact_id)),
  ];
  const contacts = contactIds.length
    ? await db
        .from("whatsapp_contacts")
        .select("id,wa_id")
        .eq("tenant_id", context.tenantId)
        .in("id", contactIds)
    : { data: [], error: null };
  if (contacts.error) throw new Error("تعذر تحميل جهات اتصال المحادثات.");
  const phoneByContact = new Map(contacts.data?.map((c) => [c.id, c.wa_id]));
  const connected = numbers.data?.find((n) => n.status === "connected");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">المحادثات</h1>
          <p className="mt-2 text-sm text-ink-500">
            تواصل مع عملائك وتابع حالة كل رد من مكان واحد.
          </p>
        </div>
        <Link
          href="/app/readiness"
          className="inline-flex items-center gap-2 rounded-xl border border-sage-200 bg-white px-4 py-2.5 text-sm font-medium"
        >
          اختبار الربط
          <ArrowUpLeft size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sage-100 bg-white px-5 py-3 text-sm">
        {connected ? (
          <>
            <CheckCircle2
              size={18}
              className="text-sage-600"
              aria-hidden="true"
            />
            <span>الرقم المربوط</span>
            <bdi className="font-semibold">{connected.phone}</bdi>
            <span className="text-xs text-ink-500">
              تابع دليل التسليم في المحادثة
            </span>
          </>
        ) : (
          <span>
            لم يُربط رقم بهذه المساحة بعد.{" "}
            <Link href="/app/connect" className="underline">
              ابدأ طلب الربط
            </Link>
          </span>
        )}
      </div>
      <WhatsAppConsole
        key={context.tenantId}
        messages={(messages.data ?? []).map((m) => ({
          ...m,
          phone: phoneByContact.get(m.contact_id) ?? "",
        }))}
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
      {Boolean(templates.data?.length) && (
        <details className="rounded-xl border border-sage-100 bg-white p-5">
          <summary className="cursor-pointer text-sm font-semibold">
            حالة القوالب ({templates.data?.length})
          </summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {templates.data?.map((t) => (
              <p key={t.id} className="rounded-lg bg-sage-50 p-3 text-xs">
                <bdi>{t.name}</bdi> ·{" "}
                {t.status === "approved"
                  ? "معتمد"
                  : t.status === "pending"
                    ? "قيد المراجعة"
                    : t.status === "rejected"
                      ? "مرفوض"
                      : "مؤرشف"}{" "}
                ({t.language})
              </p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
