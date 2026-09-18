import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { tenantContext } from "@/lib/tenancy/context";
import { contactSearch } from "@/lib/growth/contacts";
const query = z.object({
  tenant: z.uuid(),
  phone: z
    .string()
    .regex(/^\d{7,15}$/)
    .optional(),
  before: z.iso.datetime({ offset: true }).optional(),
  cursor: z.uuid().optional(),
  search: z.string().max(80).optional(),
  unread: z.enum(["1"]).optional(),
  threadBefore: z.iso.datetime({ offset: true }).optional(),
  threadCursor: z.uuid().optional(),
});
export async function GET(request: Request) {
  const parsed = query.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "يرجى تسجيل الدخول" }, { status: 401 });
  const context = await tenantContext();
  if (!context || context.tenantId !== parsed.data.tenant)
    return NextResponse.json({ error: "مساحة غير متاحة" }, { status: 403 });
  const p = parsed.data;
  const headers = { "Cache-Control": "private, no-store" };
  if (p.phone) {
    const c = await db
      .from("whatsapp_contacts")
      .select("id,name,wa_id,last_inbound_at")
      .eq("tenant_id", p.tenant)
      .eq("wa_id", p.phone)
      .maybeSingle();
    if (c.error)
      return NextResponse.json(
        { error: "تعذر تحميل المحادثة" },
        { status: 500, headers },
      );
    if (!c.data)
      return NextResponse.json(
        { messages: [], hasMore: false, contact: null },
        { headers },
      );
    let request = db
      .from("whatsapp_messages")
      .select("id,contact_id,direction,kind,body,status,created_at,inbox_seq,media")
      .eq("tenant_id", p.tenant)
      .eq("contact_id", c.data.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(51);
    if (p.before && p.cursor)
      request = request.or(
        `created_at.lt.${p.before},and(created_at.eq.${p.before},id.lt.${p.cursor})`,
      );
    const r = await request;
    if (r.error)
      return NextResponse.json(
        { error: "تعذر تحميل الرسائل" },
        { status: 500, headers },
      );
    return NextResponse.json(
      {
        messages: r.data.slice(0, 50).reverse(),
        hasMore: r.data.length > 50,
        contact: c.data,
      },
      { headers },
    );
  }
  let list = db
    .from("inbox_overview")
    .select("*")
    .eq("tenant_id", p.tenant)
    .order("last_message_at", { ascending: false })
    .order("contact_id", { ascending: false })
    .limit(41);
  if (p.threadBefore && p.threadCursor)
    list = list.or(
      `last_message_at.lt.${p.threadBefore},and(last_message_at.eq.${p.threadBefore},contact_id.lt.${p.threadCursor})`,
    );
  // Escape PostgREST filter syntax; search is plain text, never raw filter code.
  if (p.search) {
    const search = contactSearch(p.search);
    const value = search.term.replace(/[^\p{L}\p{N}\s+]/gu, "").trim();
    if (value) list = list.ilike(search.column, `%${value}%`);
  }
  if (p.unread) list = list.gt("unread", 0);
  const [rows, counts, alerts] = await Promise.all([
    list,
    db.rpc("soulvd_inbox_counts", { p_tenant: p.tenant }),
    db
      .from("inbox_overview")
      .select("*")
      .eq("tenant_id", p.tenant)
      .gt("unread", 0)
      .order("last_message_at", { ascending: false })
      .limit(6),
  ]);
  if (rows.error || counts.error || alerts.error)
    return NextResponse.json(
      { error: "تعذر تحديث صندوق الوارد" },
      { status: 500, headers },
    );
  return NextResponse.json(
    {
      threads: rows.data.slice(0, 40),
      hasMore: rows.data.length > 40,
      ...counts.data,
      alerts: alerts.data,
    },
    { headers },
  );
}
