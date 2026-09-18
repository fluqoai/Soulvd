"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Bell, BellRing, Check, Volume2, VolumeX, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Conversation } from "@/lib/inbox/types";

type Snapshot = {
  threads: Conversation[];
  alerts: Conversation[];
  unread: number;
  incoming: number;
  hasMore: boolean;
};
type Context = Snapshot & {
  tenant: string;
  revision: number;
  loading: boolean;
  error: string;
  live: boolean;
  refresh: () => Promise<void>;
  sound: boolean;
  toggleSound: () => void;
  enableDesktop: () => Promise<void>;
  desktop: string;
};
const empty: Snapshot = {
  threads: [],
  alerts: [],
  unread: 0,
  incoming: 0,
  hasMore: false,
};
const InboxContext = createContext<Context | null>(null);
export function useInbox() {
  const value = useContext(InboxContext);
  if (!value) throw new Error("InboxProvider required");
  return value;
}

export function InboxProvider({
  tenant,
  user,
  children,
}: {
  tenant: string;
  user: string;
  children: ReactNode;
}) {
  const [snapshot, setSnapshot] = useState(empty),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(Boolean(tenant)),
    [error, setError] = useState(""),
    [live, setLive] = useState(false),
    [sound, setSound] = useState(false),
    [desktop, setDesktop] = useState(""),
    [toast, setToast] = useState(false);
  const incoming = useRef<number | null>(null),
    audio = useRef<AudioContext | null>(null),
    soundRef = useRef(false),
    desktopRef = useRef(false),
    controller = useRef<AbortController | null>(null),
    active = useRef(true),
    pending = useRef(false);
  const storageKey = `soulvd.notifications.${user}.${tenant}`;
  const refresh = useCallback(
    async function refreshRequest() {
      if (!tenant || !active.current) return;
      if (controller.current) {
        pending.current = true;
        return;
      }
      const request = new AbortController();
      controller.current = request;
      try {
        const r = await fetch(`/api/inbox?tenant=${tenant}`, {
          signal: request.signal,
          cache: "no-store",
        });
        if (!r.ok)
          throw new Error("تعذر تحديث المحادثات. سنعيد المحاولة تلقائيًا.");
        const data: Snapshot = await r.json();
        if (!active.current) return;
        if (
          incoming.current !== null &&
          data.incoming > incoming.current &&
          data.unread > 0
        ) {
          setToast(true);
          if (soundRef.current && audio.current?.state === "running") {
            const oscillator = audio.current.createOscillator(),
              gain = audio.current.createGain(),
              now = audio.current.currentTime;
            oscillator.frequency.setValueAtTime(740, now);
            oscillator.frequency.exponentialRampToValueAtTime(520, now + 0.15);
            gain.gain.setValueAtTime(0.045, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            oscillator.connect(gain);
            gain.connect(audio.current.destination);
            oscillator.start();
            oscillator.stop(now + 0.25);
          }
          if (
            document.hidden &&
            desktopRef.current &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            try {
              const n = new Notification("Soulvd · رسالة جديدة", {
                body: "لديك رسالة غير مقروءة في مساحة عملك.",
                tag: `soulvd-${tenant}`,
                icon: "/brand/soulvd-logo.png",
              });
              n.onclick = () => {
                window.focus();
                n.close();
              };
            } catch {
              desktopRef.current = false;
              setDesktop("غير مدعومة في هذا المتصفح");
            }
          }
        }
        incoming.current = data.incoming;
        setSnapshot(data);
        setRevision((n) => n + 1);
        setError("");
      } catch (e) {
        if (!request.signal.aborted && active.current)
          setError(e instanceof Error ? e.message : "تعذر التحديث");
      } finally {
        controller.current = null;
        if (active.current) setLoading(false);
        if (pending.current && active.current) {
          pending.current = false;
          void refreshRequest();
        }
      }
    },
    [tenant],
  );
  useEffect(() => {
    active.current = true;
    let timer: ReturnType<typeof setTimeout>;
    const trigger = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 350);
    };
    const db = createClient();
    const channel = tenant
      ? db
          .channel(`inbox-${tenant}-${user}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "inbox_threads",
              filter: `tenant_id=eq.${tenant}`,
            },
            trigger,
          )
          .subscribe((status: string) => {
            if (active.current) setLive(status === "SUBSCRIBED");
          })
      : null;
    const poll = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 15000);
    const wake = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    trigger();
    return () => {
      active.current = false;
      pending.current = false;
      controller.current?.abort();
      clearInterval(poll);
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
      if (channel) void db.removeChannel(channel);
    };
  }, [refresh, tenant, user]);
  useEffect(() => {
    let enabled = false;
    try {
      enabled = localStorage.getItem(storageKey) === "desktop";
    } catch {}
    desktopRef.current =
      enabled &&
      "Notification" in window &&
      Notification.permission === "granted";
    setDesktop(
      desktopRef.current
        ? "مفعّلة"
        : "Notification" in window
          ? "غير مفعّلة"
          : "غير مدعومة في هذا المتصفح",
    );
    return () => {
      void audio.current?.close();
    };
  }, [storageKey]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  function toggleSound() {
    const next = !soundRef.current;
    soundRef.current = next;
    setSound(next);
    if (next) {
      if (!("AudioContext" in window)) {
        soundRef.current = false;
        setSound(false);
        return;
      }
      audio.current ??= new AudioContext();
      void audio.current.resume().catch(() => {
        soundRef.current = false;
        setSound(false);
      });
    }
  }
  async function enableDesktop() {
    if (!("Notification" in window)) {
      setDesktop("غير مدعومة في هذا المتصفح");
      return;
    }
    if (desktopRef.current) {
      desktopRef.current = false;
      setDesktop("غير مفعّلة");
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      return;
    }
    const permission = await Notification.requestPermission();
    desktopRef.current = permission === "granted";
    setDesktop(
      permission === "granted"
        ? "مفعّلة"
        : permission === "denied"
          ? "محظورة من إعدادات المتصفح"
          : "لم تُفعّل",
    );
    try {
      if (permission === "granted") localStorage.setItem(storageKey, "desktop");
    } catch {}
  }
  return (
    <InboxContext.Provider
      value={{
        ...snapshot,
        tenant,
        revision,
        loading,
        error,
        live,
        refresh,
        sound,
        toggleSound,
        desktop,
        enableDesktop,
      }}
    >
      {children}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 left-5 z-50 flex items-center gap-3 rounded-2xl bg-sage-900 px-5 py-4 text-sm text-white shadow-xl"
        >
          <BellRing size={18} />
          <Link href="/app/whatsapp" onClick={() => setToast(false)}>
            وصلت رسالة جديدة إلى صندوقك
          </Link>
          <button
            aria-label="إغلاق التنبيه"
            onClick={() => setToast(false)}
            className="p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </InboxContext.Provider>
  );
}

export function NotificationBell() {
  const {
    unread,
    alerts,
    loading,
    error,
    sound,
    toggleSound,
    desktop,
    enableDesktop,
  } = useInbox();
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        onClick={() => dialog.current?.showModal()}
        aria-label={`الإشعارات، ${unread} رسالة غير مقروءة`}
        className="relative rounded-xl border border-sage-100 p-2.5 text-sage-800 hover:bg-sage-50"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-sage-700 px-1 text-[10px] text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="notifications-title"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-sage-100 bg-white p-0 text-ink-900 shadow-xl backdrop:bg-sage-900/30"
      >
        <div className="flex items-center justify-between border-b border-sage-100 p-5">
          <div>
            <h2 id="notifications-title" className="font-bold">
              إشعارات المحادثات
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              {unread} رسالة لم تقرأها بعد
            </p>
          </div>
          <button
            aria-label="إغلاق الإشعارات"
            onClick={() => dialog.current?.close()}
            className="p-2"
          >
            <X size={19} />
          </button>
        </div>
        <div className="max-h-[45dvh] overflow-y-auto p-2">
          {error ? (
            <p role="status" className="p-5 text-sm">
              {error}
            </p>
          ) : loading ? (
            <p className="p-5 text-sm">جارٍ التحميل…</p>
          ) : !alerts.length ? (
            <div className="p-8 text-center">
              <Check className="mx-auto mb-3 text-sage-600" />
              <p className="text-sm">أنت على اطلاع بكل الرسائل</p>
            </div>
          ) : (
            alerts.map((c) => (
              <Link
                key={c.contact_id}
                href={`/app/whatsapp?phone=${c.phone}`}
                onClick={() => dialog.current?.close()}
                className="flex items-center gap-3 rounded-xl p-3 hover:bg-sage-50"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage-100 font-bold text-sage-800">
                  {c.name?.slice(0, 1) || c.phone.slice(-2)}
                </span>
                <span className="min-w-0 flex-1">
                  <bdi className="block truncate text-sm font-semibold">
                    {c.name || "+" + c.phone}
                  </bdi>
                  <span className="block truncate text-xs text-ink-500">
                    {c.preview || "رسالة جديدة"}
                  </span>
                </span>
                <span className="rounded-full bg-sage-700 px-2 py-0.5 text-xs text-white">
                  {c.unread}
                </span>
              </Link>
            ))
          )}
        </div>
        <div className="space-y-3 border-t border-sage-100 p-5 text-xs">
          <button
            onClick={toggleSound}
            className="flex w-full items-center justify-between rounded-lg bg-sage-50 p-3"
          >
            <span className="flex items-center gap-2">
              {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}صوت التنبيه
              في هذه الجلسة
            </span>
            <strong>{sound ? "مفعّل" : "متوقف"}</strong>
          </button>
          <button
            onClick={() => void enableDesktop()}
            className="flex w-full items-center justify-between rounded-lg bg-sage-50 p-3"
          >
            <span>تنبيهات المتصفح</span>
            <strong>{desktop}</strong>
          </button>
          <p className="leading-5 text-ink-500">
            تعمل التنبيهات أثناء فتح المنصة. لا يظهر نص الرسالة في تنبيه
            المتصفح. القراءة هنا خاصة بحسابك في Soulvd.
          </p>
        </div>
      </dialog>
    </>
  );
}
