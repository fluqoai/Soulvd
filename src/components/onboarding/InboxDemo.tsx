"use client";
import { useState } from "react";
import { CheckCheck, RotateCcw, Send, Sparkles } from "lucide-react";
type Message = { body: string; incoming: boolean };
const initial: Message[] = [
  { body: "مرحبًا، هل الطلب جاهز للاستلام؟", incoming: true },
];
export default function InboxDemo() {
  const [messages, setMessages] = useState(initial);
  const [draft, setDraft] = useState("");
  const [complete, setComplete] = useState(false);
  function send() {
    const body = draft.trim();
    if (!body || complete) return;
    setMessages([
      ...initial,
      { body, incoming: false },
      { body: "شكرًا على سرعة الرد! سأمر اليوم لاستلامه.", incoming: true },
    ]);
    setDraft("");
    setComplete(true);
  }
  return (
    <section
      aria-label="تجربة صندوق المحادثات"
      className="overflow-hidden rounded-3xl border border-sage-200 bg-white shadow-sm"
    >
      <div className="flex items-center gap-3 border-b border-sage-100 p-4">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-sage-100 font-bold text-sage-800">
          ن
        </span>
        <div className="flex-1">
          <h2 className="text-sm font-bold">نورة · عميلة توضيحية</h2>
          <p className="mt-1 text-xs text-ink-500">تجربة محلية في هذه الصفحة</p>
        </div>
        <button
          aria-label="إعادة التجربة"
          onClick={() => {
            setMessages(initial);
            setDraft("");
            setComplete(false);
          }}
          className="rounded-lg p-2 text-ink-500 hover:bg-sage-50"
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <div
        className="space-y-4 bg-[#f0f2ed] p-4 sm:p-7"
        aria-live="polite"
        aria-relevant="additions"
      >
        <p className="mx-auto w-fit rounded-full bg-white/80 px-3 py-1 text-[11px] text-ink-500">
          محادثة توضيحية · لا توجد رسائل حقيقية
        </p>
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl p-4 text-sm leading-7 shadow-sm ${m.incoming ? "me-auto rounded-ss-sm bg-white" : "ms-auto rounded-se-sm bg-[#dce9d8]"}`}
          >
            <p>{m.body}</p>
            {!m.incoming && (
              <span className="mt-1 flex justify-end gap-1 text-[10px] text-sage-700">
                <CheckCheck size={14} />
                معاينة شكل الرد
              </span>
            )}
          </div>
        ))}
      </div>
      {complete ? (
        <div className="flex flex-wrap items-center gap-3 p-5">
          <Sparkles className="text-sage-600" size={22} />
          <p role="status" className="flex-1 text-sm leading-7">
            هكذا تبدو المحادثة في سولفد. بعد الربط والتفعيل، ستظهر رسائل عملائك
            الفعلية هنا.
          </p>
          <button
            onClick={() => {
              setMessages(initial);
              setComplete(false);
            }}
            className="rounded-xl border border-sage-200 px-4 py-2 text-sm"
          >
            جرّب مرة أخرى
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="space-y-3 p-4"
        >
          <button
            type="button"
            onClick={() =>
              setDraft("أهلًا نورة، طلبك جاهز للاستلام. يسعدنا زيارتك اليوم 🌿")
            }
            className="rounded-full border border-sage-200 bg-sage-50 px-4 py-2 text-xs text-sage-800"
          >
            استخدم ردًا جاهزًا: طلبك جاهز للاستلام
          </button>
          <div className="flex items-end gap-2">
            <label className="flex-1">
              <span className="sr-only">اكتب ردًا للتجربة</span>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="اكتب ردًا للتجربة…"
                className="w-full resize-none rounded-xl border border-sage-200 p-3 text-sm"
              />
            </label>
            <button
              type="submit"
              aria-label="معاينة إرسال الرد"
              disabled={!draft.trim()}
              className="mb-1 rounded-xl bg-sage-900 p-4 text-white disabled:opacity-40"
            >
              <Send size={19} />
            </button>
          </div>
          <p className="text-[11px] text-ink-500">
            لا تُحفظ هذه الرسائل ولا تُرسل عبر واتساب، ولا يُستهلك أي رصيد.
          </p>
        </form>
      )}
    </section>
  );
}
