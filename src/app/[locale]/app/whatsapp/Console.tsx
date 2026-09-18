"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import Inbox from "./Inbox";
import { Send, Smile, LayoutTemplate, X } from "lucide-react";
import { useInbox } from "@/components/inbox/InboxProvider";
import {
  createTemplate,
  finishSignup,
  refreshTemplates,
  sendMessage,
  type ActionResult,
} from "./actions";

type Facebook = {
  init(options: object): void;
  login(
    callback: (response: { authResponse?: { code?: string } }) => void,
    options: object,
  ): void;
};
declare global {
  interface Window {
    FB?: Facebook;
  }
}
type Template = {
  id: string;
  name: string;
  status: string;
  language: string;
  parameter_count: number;
  body: string;
};
const field = "w-full rounded-lg border border-sage-200 bg-white p-3";
const button =
  "rounded-lg bg-sage-900 px-5 py-3 text-white hover:bg-sage-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-700 disabled:cursor-not-allowed disabled:opacity-50";

export default function WhatsAppConsole({
  templates,
  initialRecipient = "",
  canManage,
  canConnect,
  connected,
  appId,
  configId,
  version,
}: {
  templates: Template[];
  initialRecipient?: string;
  canManage: boolean;
  canConnect: boolean;
  connected: boolean;
  appId?: string;
  configId?: string;
  version?: string;
}) {
  const router = useRouter();
  const inbox = useInbox();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [emoji, setEmoji] = useState(false);
  const settings = useRef<HTMLDialogElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [result, setResult] = useState<ActionResult>();
  const [busy, setBusy] = useState(false);
  const [recipient, setRecipient] = useState(initialRecipient);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const chosenTemplate = templates.find((t) => t.id === selectedTemplate);
  const [mode, setMode] = useState<"api" | "coexistence">("coexistence");
  const code = useRef<string | null>(null);
  const assets = useRef<{ wabaId: string; phoneNumberId: string } | null>(null);
  const connecting = useRef(false);
  const finalized = useRef(false);
  const selectedMode = useRef(mode);
  // Preserve the same key after uncertain responses; a deliberate new submission
  // after an accepted result receives a new key.
  const messageKey = useRef("");
  const templateKey = useRef("");
  useEffect(() => {
    let mounted = true;
    async function complete() {
      if (!code.current || !assets.current || finalized.current) return;
      finalized.current = true;
      try {
        const response = await finishSignup({
          code: code.current,
          ...assets.current,
          mode: selectedMode.current,
        });
        if (mounted) {
          setResult(response);
          router.refresh();
        }
      } catch {
        if (mounted)
          setResult({
            ok: false,
            message:
              "تعذر حفظ نتيجة الربط. راجع حالة المساحة قبل إعادة المحاولة.",
          });
      } finally {
        code.current = null;
        assets.current = null;
        connecting.current = false;
        if (mounted) setBusy(false);
      }
    }
    function receive(event: MessageEvent) {
      if (
        !connecting.current ||
        !["https://www.facebook.com", "https://web.facebook.com"].includes(
          event.origin,
        )
      )
        return;
      let data;
      try {
        data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data?.type !== "WA_EMBEDDED_SIGNUP") return;
      if (
        data.event === "FINISH" ||
        data.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
      ) {
        if (!data.data?.waba_id || !data.data?.phone_number_id) return;
        assets.current = {
          wabaId: String(data.data.waba_id),
          phoneNumberId: String(data.data.phone_number_id),
        };
        void complete();
      } else if (data.event === "CANCEL" || data.event === "ERROR") {
        code.current = null;
        assets.current = null;
        connecting.current = false;
        setBusy(false);
        setResult({ ok: false, message: "لم يكتمل التسجيل لدى Meta." });
      }
    }
    window.addEventListener("message", receive);
    const timer = window.setInterval(() => {
      if (!document.hidden) {
        void complete();
      }
    }, 1_000);
    return () => {
      mounted = false;
      window.removeEventListener("message", receive);
      window.clearInterval(timer);
    };
  }, [router]);

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
    kind: "message" | "template",
  ) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    const key = kind === "message" ? messageKey : templateKey;
    key.current ||= crypto.randomUUID();
    try {
      const response =
        kind === "message"
          ? await sendMessage({
              requestId: key.current,
              to: String(data.get("to")),
              body: String(data.get("body") || ""),
              templateId: String(data.get("templateId") || "") || undefined,
              consent: data.get("consent") === "on",
              parameters: data.getAll("parameter").map(String),
            })
          : await createTemplate({
              requestId: key.current,
              name: String(data.get("name")),
              language: String(data.get("language")),
              category: String(data.get("category")),
              body: String(data.get("body")),
              examples: String(data.get("examples") || "")
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            });
      setResult(response);
      if (response.ok) {
        key.current = "";
        form.reset();
        if (kind === "message") {
          setSelectedTemplate("");
          setDrafts((old) => ({ ...old, [recipient]: "" }));
          void inbox.refresh();
        }
      }
      router.refresh();
    } catch {
      setResult({
        ok: false,
        message:
          "تعذر تأكيد الطلب. أعد المحاولة بالبيانات نفسها؛ سيُستخدم معرّف الطلب نفسه لمنع التكرار.",
      });
    } finally {
      setBusy(false);
    }
  }
  function start() {
    if (!window.FB || !appId || !configId || !version) {
      setResult({ ok: false, message: "لم تكتمل إعدادات Meta بعد." });
      return;
    }
    selectedMode.current = mode;
    code.current = null;
    assets.current = null;
    finalized.current = false;
    connecting.current = true;
    setBusy(true);
    window.FB.init({ appId, version, cookie: false, xfbml: false });
    window.FB.login(
      (response) => {
        if (!response.authResponse?.code) {
          connecting.current = false;
          setBusy(false);
          setResult({ ok: false, message: "لم يصل رمز تفويض من Meta." });
          return;
        }
        code.current = response.authResponse.code;
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          sessionInfoVersion: "3",
          ...(mode === "coexistence"
            ? { featureType: "whatsapp_business_app_onboarding" }
            : {}),
        },
      },
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {canConnect && appId && configId && version && (
        <Script
          src="https://connect.facebook.net/en_US/sdk.js"
          strategy="afterInteractive"
        />
      )}
      <button
        type="button"
        onClick={() => settings.current?.showModal()}
        className="flex shrink-0 items-center gap-1.5 self-end rounded-lg px-2 py-1 text-xs font-semibold text-sage-700 hover:bg-sage-50"
      >
        <LayoutTemplate size={14} />
        القوالب وإعدادات الربط
      </button>
      <Inbox recipient={recipient} select={setRecipient}>
        <form
          onSubmit={(event) => void submit(event, "message")}
          className="space-y-2 text-sm"
        >
          <fieldset
            disabled={busy || !connected}
            className="space-y-2 disabled:opacity-60"
          >
            <div className="flex items-center gap-2">
              <input type="hidden" name="to" value={recipient} />
              <label className="flex min-w-0 w-full items-center gap-1 text-sage-700">
                <LayoutTemplate size={16} className="shrink-0" />
                <select
                  name="templateId"
                  aria-label="نوع الرسالة أو القالب"
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="min-w-0 rounded-lg bg-transparent py-2 text-xs"
                >
                  <option value="">رد نصي</option>
                  {templates
                    .filter((t) => t.status === "approved")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.language})
                      </option>
                    ))}
                </select>
              </label>
            </div>
            {chosenTemplate && (
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-sage-100 bg-white p-3">
                <p className="whitespace-pre-wrap text-xs leading-6">
                  {chosenTemplate.body}
                </p>
                {Array.from(
                  { length: chosenTemplate.parameter_count },
                  (_, i) => (
                    <label
                      key={`${chosenTemplate.id}-${i}`}
                      className="block text-xs"
                    >
                      قيمة المتغير {i + 1}
                      <input
                        name="parameter"
                        className={field}
                        required
                        maxLength={1000}
                      />
                    </label>
                  ),
                )}
                <label className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    name="consent"
                    required
                    className="mt-1"
                  />
                  أؤكد موافقة العميل على استقبال رسائل القوالب.
                </label>
              </div>
            )}
            <div className="flex items-end gap-2">
              {!chosenTemplate && (
                <>
                  <div className="relative">
                    <button
                      type="button"
                      aria-label="إضافة رمز تعبيري"
                      aria-expanded={emoji}
                      onClick={() => setEmoji(!emoji)}
                      className="rounded-full p-2.5 text-ink-500 hover:bg-sage-100"
                    >
                      <Smile size={22} />
                    </button>
                    {emoji && (
                      <div className="absolute right-0 bottom-12 z-10 flex gap-1 rounded-xl border border-sage-100 bg-white p-2 shadow-lg">
                        {["😊", "👍", "شكراً 🙏", "✅", "🌿"].map((e) => (
                          <button
                            key={e}
                            type="button"
                            aria-label={e}
                            onClick={() => {
                              setDrafts((old) => ({
                                ...old,
                                [recipient]: (old[recipient] || "") + e,
                              }));
                              setEmoji(false);
                              textarea.current?.focus();
                            }}
                            className="whitespace-nowrap rounded p-2 hover:bg-sage-50"
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <textarea
                    ref={textarea}
                    aria-label="نص الرد"
                    name="body"
                    value={drafts[recipient] || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDrafts((old) => ({ ...old, [recipient]: value }));
                    }}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        !e.nativeEvent.isComposing
                      ) {
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder="اكتب ردك…"
                    required
                    maxLength={4096}
                    rows={1}
                    className="max-h-28 min-h-12 min-w-0 flex-1 resize-y rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-100"
                  />
                </>
              )}
              <button
                type="submit"
                aria-label="إرسال الرسالة"
                className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-sage-800 px-4 text-white hover:bg-sage-700 disabled:opacity-50"
                disabled={busy || !connected}
              >
                <Send size={18} className="rotate-180" />
                <span className="text-xs font-bold">
                  {busy ? "جارٍ الإرسال" : "إرسال"}
                </span>
              </button>
            </div>
          </fieldset>
          {result && (
            <p
              role="status"
              className={`rounded-lg px-3 py-2 text-xs ${result.ok ? "bg-sage-100 text-sage-900" : "bg-amber-50 text-amber-900"}`}
            >
              {result.message}
            </p>
          )}
          <p className="text-[10px] text-ink-500">
            {!connected
              ? "اربط رقم واتساب لتفعيل الإرسال."
              : chosenTemplate
                ? "تُخصم تكلفة القالب من رصيد واتساب حسب التسعير."
                : "Enter للإرسال · Shift + Enter لسطر جديد · الرد النصي خلال نافذة 24 ساعة"}
          </p>
        </form>
      </Inbox>
      <dialog
        ref={settings}
        aria-labelledby="whatsapp-settings-title"
        className="m-auto w-[calc(100%-2rem)] max-w-2xl max-h-[85dvh] overflow-y-auto rounded-2xl border border-sage-100 bg-white p-5 text-ink-900 shadow-xl backdrop:bg-sage-900/30"
      >
        <header className="mb-5 flex items-center justify-between">
          <h2 id="whatsapp-settings-title" className="font-bold">
            القوالب وإعدادات الربط
          </h2>
          <button
            type="button"
            onClick={() => settings.current?.close()}
            aria-label="إغلاق إعدادات الربط"
            className="p-2"
          >
            <X size={20} />
          </button>
        </header>
        {result && (
          <p role="status" className="mb-4 rounded-lg bg-sage-50 p-3 text-sm">
            {result.message}
          </p>
        )}
        <div className="space-y-4">
          {canManage && (
            <details
              open={!connected}
              className="rounded-xl border border-sage-200 bg-white p-5 space-y-4"
            >
              <summary className="cursor-pointer text-sm font-semibold">
                إعدادات الربط والقوالب
              </summary>
              <select
                aria-label="طريقة الربط"
                className={field}
                value={mode}
                onChange={(event) => setMode(event.target.value as typeof mode)}
              >
                <option value="coexistence">
                  رقمي موجود في تطبيق واتساب الأعمال
                </option>
                <option value="api">رقم مخصص لمنصة واتساب API</option>
              </select>
              <p className="text-sm">
                لا تحذف حساب تطبيق واتساب الأعمال. التسجيل والتفويض يتمان داخل
                نافذة Meta.
              </p>
              {!connected && (
                <button
                  className={button}
                  disabled={
                    busy || !canConnect || !appId || !configId || !version
                  }
                  onClick={start}
                >
                  الربط عبر Meta
                </button>
              )}
              <button
                className={`${button} ms-3`}
                disabled={busy || !connected}
                onClick={async () => {
                  setBusy(true);
                  try {
                    setResult(await refreshTemplates());
                    router.refresh();
                  } catch {
                    setResult({ ok: false, message: "تعذر تحديث القوالب." });
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                تحديث القوالب
              </button>
              {connected ? (
                <p className="text-sm">
                  الرقم مربوط بهذه المساحة. يمكنك إرسال الرسائل وإدارة القوالب
                  هنا.
                </p>
              ) : (
                (!canConnect || !appId || !configId || !version) && (
                  <p className="text-sm">
                    تواصل مع إدارة المنصة لإكمال تفعيل الرقم.
                  </p>
                )
              )}
            </details>
          )}

          {canManage && (
            <details className="rounded-xl border border-sage-200 bg-white p-5">
              <summary className="cursor-pointer text-sm font-semibold">
                إنشاء قالب جديد
              </summary>
              <p className="mt-3 text-sm text-ink-500">
                استخدم{" "}
                <Link
                  href="/app/templates"
                  className="font-medium text-sage-700 underline"
                >
                  مكتبة القوالب
                </Link>{" "}
                لحفظ المسودات وتخصيص النماذج، أو أرسل قالبًا جديدًا من هنا.
              </p>
              <form
                onSubmit={(event) => void submit(event, "template")}
                className="mt-5 max-w-2xl space-y-4 text-sm"
              >
                <h2 className="text-xl font-bold">إنشاء قالب</h2>
                <label className="block">
                  اسم القالب
                  <input
                    className={field}
                    name="name"
                    dir="ltr"
                    placeholder="order_update"
                    pattern="[a-z][a-z0-9_]*"
                    maxLength={120}
                    required
                  />
                </label>
                <label className="block">
                  اللغة
                  <select className={field} name="language">
                    <option value="ar">العربية</option>
                    <option value="en_US">English</option>
                  </select>
                </label>
                <label className="block">
                  الفئة
                  <select className={field} name="category">
                    <option value="UTILITY">خدمي</option>
                    <option value="MARKETING">تسويقي</option>
                  </select>
                </label>
                <label className="block">
                  نص القالب
                  <textarea
                    className={field}
                    name="body"
                    required
                    maxLength={1024}
                  />
                </label>
                <label className="block">
                  أمثلة المتغيرات، مثال لكل سطر
                  <textarea
                    className={field}
                    name="examples"
                    placeholder={"أحمد\n1024"}
                  />
                </label>
                <p className="text-sm">
                  تدعم القوالب النصية متغيرات مثل {"{{1}}"} و{"{{2}}"}. القرار
                  النهائي للفئة والاعتماد لدى Meta. تجد النماذج الجاهزة في مكتبة
                  القوالب.
                </p>
                <button className={button} disabled={busy || !connected}>
                  إرسال للمراجعة
                </button>
              </form>
            </details>
          )}
          <details className="rounded-xl border border-sage-100 p-5">
            <summary className="cursor-pointer text-sm font-semibold">
              حالة القوالب ({templates.length})
            </summary>
            <div className="mt-3 space-y-2">
              {templates.map((t) => (
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
        </div>
      </dialog>
    </div>
  );
}
