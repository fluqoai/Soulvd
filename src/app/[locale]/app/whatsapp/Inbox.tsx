"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  CheckCheck,
  Clock,
  MessageCircle,
  Plus,
  Search,
  TriangleAlert,
} from "lucide-react";
import { useInbox } from "@/components/inbox/InboxProvider";
import { mergeRecentMessages } from "@/lib/inbox/history";
import { readConversation } from "@/lib/inbox/actions";
import type { ChatMessage, Conversation } from "@/lib/inbox/types";
const time = (date: string) =>
  new Intl.DateTimeFormat("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
const day = (date: string) =>
  new Intl.DateTimeFormat("ar-SA", {
    day: "numeric",
    month: "long",
    calendar: "gregory",
  }).format(new Date(date));
const statuses: Record<string, string> = {
  queued: "بانتظار الإرسال",
  processing: "قيد الإرسال",
  accepted: "قُبل طلب الإرسال",
  sent: "أُرسلت",
  delivered: "تم التسليم",
  read: "قرأها العميل",
  failed: "تعذر الإرسال",
  unknown: "نتيجة الإرسال غير مؤكدة",
};
function Receipt({ status }: { status: string }) {
  const Icon = ["delivered", "read"].includes(status)
    ? CheckCheck
    : status === "sent"
      ? Check
      : ["failed", "unknown"].includes(status)
        ? TriangleAlert
        : Clock;
  return (
    <span
      title={statuses[status] || status}
      aria-label={statuses[status] || status}
    >
      <Icon
        size={14}
        className={
          status === "read"
            ? "text-sky-600"
            : status === "failed"
              ? "text-red-600"
              : ""
        }
      />
    </span>
  );
}
function Avatar({ name, phone }: { name?: string | null; phone: string }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sage-100 text-sm font-bold text-sage-800">
      {name?.trim().slice(0, 2) || phone.slice(-2)}
    </span>
  );
}
export default function Inbox({
  recipient,
  select,
  children,
}: {
  recipient: string;
  select: (phone: string) => void;
  children: ReactNode;
}) {
  const inbox = useInbox();
  const [search, setSearch] = useState(""),
    [unreadOnly, setUnreadOnly] = useState(false),
    [newChat, setNewChat] = useState(false);
  const [filtered, setFiltered] = useState<{
      threads: Conversation[];
      hasMore: boolean;
    } | null>(null),
    [more, setMore] = useState<Conversation[]>([]),
    [moreAvailable, setMoreAvailable] = useState(false),
    [listError, setListError] = useState(""),
    [busy, setBusy] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const phone = recipient.replace(/\D/g, "");

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setListError("");
      if (!search.trim() && !unreadOnly) {
        setFiltered(null);
        return;
      }
      try {
        const q = new URLSearchParams({
          tenant: inbox.tenant,
          search,
          ...(unreadOnly ? { unread: "1" } : {}),
        });
        const r = await fetch("/api/inbox?" + q, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!r.ok) throw new Error();
        setFiltered(await r.json());
      } catch {
        if (!controller.signal.aborted) setListError("تعذر تحميل نتائج البحث.");
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [search, unreadOnly, inbox.tenant, inbox.revision]);
  const base = filtered ?? inbox,
    threads = [
      ...new Map(
        [...base.threads, ...more].map((c) => [c.contact_id, c]),
      ).values(),
    ];
  async function loadMore() {
    setBusy(true);
    const last = threads.at(-1);
    if (!last) {
      setBusy(false);
      return;
    }
    try {
      const q = new URLSearchParams({
        tenant: inbox.tenant,
        search,
        threadBefore: last.last_message_at,
        threadCursor: last.contact_id,
        ...(unreadOnly ? { unread: "1" } : {}),
      });
      const r = await fetch("/api/inbox?" + q, { cache: "no-store" });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setMore((v) => [...v, ...data.threads]);
      setMoreAvailable(data.hasMore);
    } catch {
      setListError("تعذر تحميل المحادثات الأقدم. حاول مجددًا.");
    } finally {
      setBusy(false);
    }
  }
  const active = Boolean(phone) || newChat;
  return (
    <section
      aria-label="صندوق المحادثات"
      className="grid min-h-0 flex-1 overflow-hidden rounded-2xl border border-sage-200 bg-white shadow-sm md:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]"
    >
      <aside
        className={`${active ? "hidden md:flex" : "flex"} min-h-0 flex-col border-l border-sage-100`}
      >
        <div className="space-y-4 border-b border-sage-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">صندوق الوارد</h2>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-500">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${inbox.live ? "bg-emerald-500" : "bg-amber-400"}`}
                />
                {inbox.live ? "تحديث مباشر" : "تحديث دوري كل 15 ثانية"}
              </p>
            </div>
            <button
              aria-label="محادثة جديدة"
              onClick={() => {
                select("");
                setNewChat(true);
              }}
              className="rounded-full bg-sage-900 p-2 text-white hover:bg-sage-700"
            >
              <Plus size={19} />
            </button>
          </div>
          <label className="flex items-center gap-2 rounded-xl bg-[#f3f5f3] px-3 py-2.5 text-ink-500">
            <Search size={17} />
            <input
              type="search"
              aria-label="البحث بالاسم أو الرقم"
              placeholder="ابحث عن عميل…"
              value={search}
              maxLength={80}
              onChange={(e) => {
                setSearch(e.target.value);
                setMore([]);
              }}
              className="w-full min-w-0 bg-transparent text-sm outline-none focus-visible:ring-2 focus-visible:ring-sage-300"
            />
          </label>
          <div className="flex gap-2 text-xs">
            {[false, true].map((only) => (
              <button
                key={String(only)}
                aria-pressed={unreadOnly === only}
                onClick={() => {
                  setUnreadOnly(only);
                  setMore([]);
                }}
                className={`rounded-full px-3 py-1.5 ${unreadOnly === only ? "bg-sage-100 font-bold text-sage-900" : "bg-sage-50 text-ink-500"}`}
              >
                {only
                  ? `غير المقروءة${inbox.unread ? " · " + inbox.unread : ""}`
                  : "الكل"}
              </button>
            ))}
          </div>
        </div>
        {(inbox.error || listError) && (
          <p role="status" className="bg-amber-50 p-3 text-xs text-amber-900">
            {listError || inbox.error}
          </p>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {inbox.loading ? (
            <p className="p-6 text-center text-sm text-ink-500">
              جارٍ تحميل المحادثات…
            </p>
          ) : !threads.length ? (
            <div className="px-6 py-12 text-center">
              <MessageCircle className="mx-auto mb-3 text-sage-300" size={32} />
              <p className="text-sm font-semibold">
                {search
                  ? "لا توجد نتائج"
                  : unreadOnly
                    ? "قرأت جميع الرسائل"
                    : "هنا تبدأ علاقتك بعملائك"}
              </p>
              <p className="mt-2 text-xs leading-6 text-ink-500">
                {search
                  ? "جرّب اسمًا أو رقمًا آخر."
                  : unreadOnly
                    ? "ستظهر الرسائل الجديدة هنا."
                    : "عند وصول أول رسالة إلى رقمك، ستظهر المحادثة هنا."}
              </p>
            </div>
          ) : (
            threads.map((c) => (
              <button
                key={c.contact_id}
                onClick={() => {
                  select(c.phone);
                  setNewChat(false);
                }}
                aria-current={phone === c.phone ? "true" : undefined}
                className={`flex w-full items-center gap-3 border-b border-sage-50 px-4 py-4 text-start transition-colors hover:bg-sage-50 ${phone === c.phone ? "bg-sage-50 shadow-[inset_-3px_0_0_#315e4a]" : ""}`}
              >
                <Avatar name={c.name} phone={c.phone} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <bdi
                      className={`min-w-0 flex-1 truncate text-sm ${c.unread ? "font-bold" : "font-medium"}`}
                    >
                      {c.name || "+" + c.phone}
                    </bdi>
                    <span
                      className={`shrink-0 text-[10px] ${c.unread ? "font-bold text-sage-700" : "text-ink-500"}`}
                    >
                      {new Date(c.last_message_at).toDateString() ===
                      new Date().toDateString()
                        ? time(c.last_message_at)
                        : day(c.last_message_at)}
                    </span>
                  </span>
                  <span className="mt-1.5 flex items-center gap-1.5">
                    {c.direction === "outbound" && (
                      <Receipt status={c.status} />
                    )}
                    <span className="flex-1 truncate text-xs text-ink-500">
                      {c.preview || "رسالة غير نصية"}
                    </span>
                    {c.unread > 0 && (
                      <span className="min-w-5 rounded-full bg-sage-700 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                        {c.unread}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            ))
          )}
          {(more.length ? moreAvailable : base.hasMore) && (
            <button
              onClick={() => void loadMore()}
              disabled={busy}
              className="w-full p-4 text-xs font-semibold text-sage-700 disabled:opacity-50"
            >
              {busy ? "جارٍ التحميل…" : "تحميل محادثات أقدم"}
            </button>
          )}
        </div>
      </aside>
      <div
        className={`${active ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-col`}
      >
        {newChat ? (
          <div className="grid h-full place-items-center bg-sage-50 p-6">
            <form
              className="w-full max-w-sm space-y-5 rounded-2xl border border-sage-100 bg-white p-6"
              onSubmit={(e) => {
                e.preventDefault();
                const value = newPhone.replace(/\D/g, "");
                if (/^\d{7,15}$/.test(value)) {
                  select(value);
                  setNewChat(false);
                  setNewPhone("");
                }
              }}
            >
              <h3 className="text-xl font-bold">محادثة جديدة</h3>
              <p className="text-xs leading-6 text-ink-500">
                أدخل رقم العميل مع رمز الدولة. يحتاج بدء التواصل إلى قالب معتمد
                وموافقة العميل.
              </p>
              <label className="block text-sm">
                رقم العميل الدولي
                <input
                  aria-label="رقم العميل الدولي"
                  type="tel"
                  dir="ltr"
                  autoFocus
                  required
                  pattern="[+0-9 ]{7,25}"
                  maxLength={25}
                  placeholder="+9665xxxxxxxx"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-sage-200 p-3"
                />
              </label>
              <button className="w-full rounded-xl bg-sage-800 py-3 text-sm font-bold text-white">
                فتح المحادثة
              </button>
              <button
                type="button"
                onClick={() => setNewChat(false)}
                className="w-full text-xs text-ink-500"
              >
                إلغاء
              </button>
            </form>
          </div>
        ) : active ? (
          <Thread
            key={phone}
            phone={phone}
            back={() => {
              select("");
              setNewChat(false);
            }}
          >
            {children}
          </Thread>
        ) : (
          <div className="grid h-full place-items-center bg-[#f8faf8] p-8 text-center">
            <div>
              <span className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-sage-100 text-sage-700">
                <MessageCircle size={38} strokeWidth={1.4} />
              </span>
              <h3 className="text-xl font-bold">كل محادثة، فرصة أقرب</h3>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-7 text-ink-500">
                اختر محادثة لتتابع طلب العميل، أو ابدأ تواصلًا جديدًا من صندوق
                Soulvd.
              </p>
              <button
                onClick={() => setNewChat(true)}
                className="mt-6 rounded-xl bg-sage-900 px-5 py-3 text-sm text-white"
              >
                ابدأ محادثة
              </button>
              <p className="mt-8 text-[11px] text-ink-500">
                الرسائل وحالة القراءة خاصة بمساحة عملك
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
function Thread({
  phone,
  back,
  children,
}: {
  phone: string;
  back: () => void;
  children: ReactNode;
}) {
  const { tenant, revision, refresh, threads } = useInbox();
  const [history, setMessages] = useState<ChatMessage[]>([]),
    [clock, setClock] = useState(() => Date.now()),
    [hasMore, setHasMore] = useState(false),
    [loading, setLoading] = useState(/^\d{7,15}$/.test(phone)),
    [error, setError] = useState(""),
    [olderBusy, setOlderBusy] = useState(false),
    [atBottom, setAtBottom] = useState(true),
    [visible, setVisible] = useState(true),
    [contact, setContact] = useState<{
      name: string | null;
      last_inbound_at: string | null;
    } | null>(null);
  const scroll = useRef<HTMLDivElement>(null),
    nearBottom = useRef(true),
    read = useRef(""),
    first = useRef(true),
    preserve = useRef<{ height: number; top: number } | null>(null);
  const historyRef = useRef<ChatMessage[]>([]);
  const messages = history;
  const latest = threads.find((c) => c.phone === phone);
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!/^\d{7,15}$/.test(phone)) return;
      try {
        const r = await fetch(`/api/inbox?tenant=${tenant}&phone=${phone}`, {
          signal,
          cache: "no-store",
        });
        if (!r.ok) throw new Error();
        const data = await r.json();
        if (signal.aborted) return;
        const merged = mergeRecentMessages(historyRef.current, data.messages);
        historyRef.current = merged.messages;
        setMessages(merged.messages);
        if (first.current || merged.reset) setHasMore(data.hasMore);
        if (merged.reset) first.current = true;
        setClock(Date.now());
        setContact(data.contact);
        setError("");
      } catch {
        if (!signal.aborted) setError("تعذر تحميل الرسائل. أعد المحاولة.");
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [phone, tenant],
  );
  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load, revision]);
  useEffect(() => {
    const wake = () => setVisible(!document.hidden);
    wake();
    document.addEventListener("visibilitychange", wake);
    return () => document.removeEventListener("visibilitychange", wake);
  }, []);
  useEffect(() => {
    const el = scroll.current;
    if (!el || loading) return;
    if (preserve.current) {
      el.scrollTop =
        preserve.current.top + el.scrollHeight - preserve.current.height;
      preserve.current = null;
    } else if (nearBottom.current || first.current) {
      el.scrollTop = el.scrollHeight;
      first.current = false;
    }
  }, [messages, loading]);
  const lastInbound = messages.reduce<ChatMessage | undefined>(
    (a, m) =>
      m.direction === "inbound" &&
      (!a || (m.inbox_seq ?? 0) > (a.inbox_seq ?? 0))
        ? m
        : a,
    undefined,
  );
  useEffect(() => {
    if (
      !lastInbound ||
      !atBottom ||
      !visible ||
      read.current === lastInbound.id
    )
      return;
    const id = lastInbound.id;
    const timer = setTimeout(() => {
      if (
        document.hidden ||
        !nearBottom.current ||
        document.querySelector("dialog[open]")
      )
        return;
      read.current = id;
      void readConversation(tenant, id)
        .then((ok) => {
          if (ok) void refresh();
          else read.current = "";
        })
        .catch(() => {
          read.current = "";
        });
    }, 700);
    return () => clearTimeout(timer);
  }, [lastInbound, atBottom, visible, tenant, refresh]);
  async function older() {
    const oldest = messages[0];
    if (!oldest || olderBusy) return;
    setOlderBusy(true);
    try {
      const q = new URLSearchParams({
        tenant,
        phone,
        before: oldest.created_at,
        cursor: oldest.id,
      });
      const r = await fetch("/api/inbox?" + q, { cache: "no-store" });
      if (!r.ok) throw new Error();
      const data = await r.json();
      const el = scroll.current;
      if (el) preserve.current = { height: el.scrollHeight, top: el.scrollTop };
      nearBottom.current = false;
      setAtBottom(false);
      const combined = [
        ...new Map<string, ChatMessage>(
          [...data.messages, ...historyRef.current].map((m) => [m.id, m]),
        ).values(),
      ];
      historyRef.current = combined;
      setMessages(combined);
      setHasMore(data.hasMore);
      setError("");
    } catch {
      setError("تعذر تحميل الرسائل الأقدم. حاول مجددًا.");
    } finally {
      setOlderBusy(false);
    }
  }
  const inboundAt = contact?.last_inbound_at || latest?.last_inbound_at;
  const windowOpen =
    inboundAt && clock - new Date(inboundAt).getTime() < 86400000;
  return (
    <>
      <header className="flex shrink-0 items-center gap-3 border-b border-sage-100 bg-white px-4 py-3">
        <button
          onClick={back}
          aria-label="العودة إلى المحادثات"
          className="-mr-2 p-2 md:hidden"
        >
          <ArrowRight size={20} />
        </button>
        <Avatar name={contact?.name} phone={phone || "+"} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold">
            <bdi>{contact?.name || (phone ? "+" + phone : "محادثة جديدة")}</bdi>
          </h3>
          <p className="mt-1 text-[11px] text-ink-500">
            {windowOpen
              ? "نافذة الرد النصي متاحة · 24 ساعة من آخر رسالة واردة"
              : phone
                ? "ابدأ التواصل بقالب معتمد وموافقة العميل"
                : "أدخل رقم العميل الدولي لإرسال قالب معتمد"}
          </p>
        </div>
      </header>
      <div className="relative min-h-0 flex-1">
        <div
          ref={scroll}
          onScroll={() => {
            const el = scroll.current;
            if (!el) return;
            const bottom =
              el.scrollHeight - el.scrollTop - el.clientHeight < 70;
            nearBottom.current = bottom;
            setAtBottom(bottom);
          }}
          className="h-full overflow-y-auto overscroll-contain bg-[#edf2ed] px-4 py-5 sm:px-6"
          style={{
            backgroundImage:
              "radial-gradient(#cad7cc 0.65px, transparent 0.65px)",
            backgroundSize: "18px 18px",
          }}
        >
          {hasMore && (
            <button
              onClick={() => void older()}
              disabled={olderBusy}
              className="mx-auto mb-4 block rounded-full bg-white px-4 py-2 text-xs text-sage-700 shadow-sm"
            >
              {olderBusy ? "جارٍ التحميل…" : "الرسائل السابقة"}
            </button>
          )}
          {error && (
            <p
              role="status"
              className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
            >
              {error}{" "}
              <button className="underline" onClick={() => void refresh()}>
                تحديث
              </button>
            </p>
          )}
          {loading ? (
            <p className="py-12 text-center text-sm text-ink-500">
              جارٍ تحميل الرسائل…
            </p>
          ) : !messages.length ? (
            <div className="mx-auto mt-12 max-w-xs rounded-2xl bg-white/85 p-5 text-center text-sm leading-7 text-ink-500">
              {phone
                ? "لا توجد رسائل بعد. سيظهر سجل تواصلك مع هذا العميل هنا."
                : "أول رسالة تبدأ علاقة جديدة. استخدم قالبًا معتمدًا إذا لم يراسلك العميل خلال آخر 24 ساعة."}
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={m.id}>
                {(!i ||
                  new Date(messages[i - 1].created_at).toDateString() !==
                    new Date(m.created_at).toDateString()) && (
                  <div className="my-5 text-center">
                    <span className="rounded-lg bg-white/90 px-3 py-1.5 text-[10px] text-ink-500 shadow-sm">
                      {day(m.created_at)}
                    </span>
                  </div>
                )}
                <div
                  className={`mb-2 flex ${m.direction === "outbound" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3 py-2 shadow-sm sm:max-w-[78%] ${m.direction === "outbound" ? "rounded-tr-sm bg-[#dceccb]" : "rounded-tl-sm bg-white"}`}
                  >
                    <p
                      dir="auto"
                      className="whitespace-pre-wrap break-words text-[14px] leading-7 [overflow-wrap:anywhere]"
                    >
                      {m.body ||
                        (
                          {
                            image: "صورة واردة",
                            audio: "رسالة صوتية",
                            video: "فيديو",
                            document: "مستند",
                          } as Record<string, string>
                        )[m.kind] ||
                        "رسالة غير نصية"}
                    </p>
                    <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-ink-500">
                      <time dateTime={m.created_at}>{time(m.created_at)}</time>
                      {m.direction === "outbound" && (
                        <Receipt status={m.status} />
                      )}
                    </div>
                    {["failed", "unknown"].includes(m.status) && (
                      <p className="mt-1 text-[10px] text-red-700">
                        {statuses[m.status]} · تحقق من الحالة قبل إعادة الإرسال
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {!atBottom && (
          <button
            aria-label="الانتقال إلى أحدث الرسائل"
            onClick={() =>
              scroll.current?.scrollTo({
                top: scroll.current.scrollHeight,
                behavior: "smooth",
              })
            }
            className="absolute bottom-4 left-4 rounded-full border border-sage-100 bg-white p-3 text-sage-800 shadow-lg"
          >
            <ArrowDown size={19} />
          </button>
        )}
      </div>
      <div className="shrink-0 border-t border-sage-100 bg-[#f8faf8] p-3 sm:p-4">
        {children}
      </div>
    </>
  );
}
