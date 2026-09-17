"use client";
import { useState, type ReactNode } from "react";
import { CheckCheck, MessageCircle, Plus, Search } from "lucide-react";

export type InboxMessage = {
  id: string;
  phone: string;
  direction: string;
  body: string;
  status: string;
  created_at: string;
};
const statuses: Record<string, string> = {
  received: "واردة",
  queued: "بانتظار الإرسال",
  processing: "قيد الإرسال",
  accepted: "قُبل الطلب",
  sent: "أُرسلت",
  delivered: "تم التسليم",
  read: "مقروءة",
  failed: "تعذر الإرسال",
  unknown: "نتيجة غير مؤكدة",
};
export default function Inbox({
  messages,
  recipient,
  select,
  children,
}: {
  messages: InboxMessage[];
  recipient: string;
  select: (phone: string) => void;
  children: ReactNode;
}) {
  const [search, setSearch] = useState("");
  const phone = recipient.replace(/\D/g, "");
  const contacts = [
    ...new Map(
      messages
        .filter((m) => m.phone)
        .map((m) => [m.phone, m] as const)
        .reverse(),
    ).values(),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const thread = messages.filter((m) => m.phone === phone).toReversed();
  return (
    <section
      aria-label="صندوق المحادثات"
      className="grid overflow-hidden rounded-2xl border border-sage-200 bg-white md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)]"
    >
      <aside className="border-b border-sage-100 md:border-b-0 md:border-l">
        <div className="border-b border-sage-100 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">المحادثات</h2>
            <button
              onClick={() => select("")}
              aria-label="محادثة جديدة"
              className="rounded-lg bg-sage-50 p-2 text-sage-700"
            >
              <Plus size={17} />
            </button>
          </div>
          <label className="flex items-center gap-2 rounded-xl bg-sage-50 px-3 py-2 text-ink-500">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              aria-label="بحث برقم العميل"
              placeholder="ابحث برقم العميل"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 w-full bg-transparent text-xs outline-none"
            />
          </label>
        </div>
        <div className="max-h-48 overflow-y-auto md:max-h-[620px]">
          {contacts
            .filter((c) => c.phone.includes(search.replace(/\D/g, "")))
            .map((c) => (
              <button
                key={c.phone}
                onClick={() => select(c.phone)}
                aria-pressed={phone === c.phone}
                className={`flex w-full gap-3 border-b border-sage-50 p-4 text-right ${phone === c.phone ? "bg-sage-100/70" : "hover:bg-sage-50"}`}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage-200/70 text-xs font-semibold text-sage-800">
                  {c.phone.slice(-2)}
                </span>
                <span className="min-w-0 flex-1">
                  <bdi className="block truncate text-sm font-semibold">
                    +{c.phone}
                  </bdi>
                  <span className="mt-1 block truncate text-xs text-ink-500">
                    {c.direction === "outbound" ? "أنت: " : ""}
                    {c.body}
                  </span>
                </span>
              </button>
            ))}
          {!contacts.length && (
            <p className="px-4 py-8 text-center text-xs leading-6 text-ink-500">
              ستظهر محادثات العملاء عند وصول أول رسالة.
            </p>
          )}
        </div>
        <p className="p-4 text-xs leading-6 text-ink-500">
          المحادثات ضمن آخر 100 رسالة في المساحة.
        </p>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center gap-3 border-b border-sage-100 px-5 py-4">
          <span className="rounded-xl bg-sage-50 p-2 text-sage-700">
            <MessageCircle size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">
              {phone ? <bdi>+{phone}</bdi> : "محادثة جديدة"}
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              الرسائل والردود في مساحة عملك
            </p>
          </div>
        </header>
        <div
          role="log"
          aria-label="رسائل المحادثة"
          className="flex h-72 flex-col gap-3 overflow-y-auto bg-[#fafbf9] p-4 sm:h-80 sm:p-5"
        >
          {thread.map((m) => (
            <article
              key={m.id}
              className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm sm:max-w-[85%] ${m.direction === "outbound" ? "self-end rounded-bl-sm border border-sage-200 bg-sage-100" : "self-start rounded-br-sm border border-sage-100 bg-white"}`}
            >
              <p className="whitespace-pre-wrap break-words leading-7">
                {m.body}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-500">
                <time dateTime={m.created_at}>
                  {new Date(m.created_at).toLocaleString("ar-SA", {
                    timeZone: "Asia/Riyadh",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                {m.direction === "outbound" && (
                  <span
                    className={`flex items-center gap-1 ${m.status === "failed" ? "text-red-700" : ""}`}
                  >
                    {["delivered", "read"].includes(m.status) && (
                      <CheckCheck size={13} aria-hidden="true" />
                    )}
                    {statuses[m.status] ?? m.status}
                  </span>
                )}
              </div>
            </article>
          ))}
          {!thread.length && (
            <div className="m-auto max-w-xs text-center text-sm leading-7 text-ink-500">
              <MessageCircle
                size={30}
                className="mx-auto mb-3 text-sage-300"
                aria-hidden="true"
              />
              {phone
                ? "لا توجد رسائل لهذا الرقم ضمن السجل المعروض."
                : "اختر محادثة أو أدخل رقم عميل لإرسال رسالة."}
            </div>
          )}
        </div>
        <div className="border-t border-sage-100 p-4 sm:p-5">{children}</div>
      </div>
    </section>
  );
}
