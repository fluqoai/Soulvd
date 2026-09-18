"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, Users } from "lucide-react";
import { parseContactsFile, previewContacts } from "@/lib/growth/contacts";
import { importAudience, suppressAudience } from "../growth/actions";
import { inputClass, buttonClass, cardClass } from "../studio/ui";
type Contact = {
  id: string;
  phone: string;
  name: string;
  segment: string;
  consent_at: string | null;
  suppressed: boolean;
};
export default function Importer({
  rows,
  total,
  canManage,
}: {
  rows: Contact[];
  total: number;
  canManage: boolean;
}) {
  const [raw, setRaw] = useState<string[][]>([]),
    [phone, setPhone] = useState(0),
    [name, setName] = useState(-1),
    [header, setHeader] = useState(true),
    [segment, setSegment] = useState(""),
    [source, setSource] = useState(""),
    [consent, setConsent] = useState(false),
    [review, setReview] = useState(false),
    [message, setMessage] = useState(""),
    [pending, start] = useTransition();
  const router = useRouter();
  const preview = previewContacts(raw, phone, name, header);
  async function read(text: string) {
    try {
      const parsed = parseContactsFile(text);
      setRaw(parsed);
      const h = parsed[0] ?? [];
      setPhone(
        Math.max(
          0,
          h.findIndex((v) => /phone|mobile|رقم|جوال|هاتف/i.test(v)),
        ),
      );
      setName(h.findIndex((v) => /name|اسم/i.test(v)));
      setReview(false);
      setMessage("");
    } catch (e) {
      setRaw([]);
      setMessage((e as Error).message);
    }
  }
  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl bg-sage-900 p-5 text-white">
        <Users size={24} />
        <strong className="text-2xl">{total.toLocaleString("ar-SA")}</strong>
        <span className="text-sm">جهة اتصال · سعة الدفتر 20,000</span>
      </div>
      {canManage && (
        <section className={cardClass + " space-y-5"}>
          <div>
            <h2 className="text-xl font-bold">أضف جمهورك</h2>
            <p className="mt-2 text-sm leading-7 text-ink-500">
              صدّر ملف Excel بصيغة CSV UTF-8 أو الصق الأعمدة أدناه. نقبل الأرقام
              السعودية المحلية والدولية؛ الأرقام الأخرى تبدأ بمفتاح الدولة.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-sage-200 bg-sage-50 p-5">
            <Upload className="shrink-0" />
            <span className="text-sm">
              اختر ملف CSV / TSV · حتى 5,000 جهة و500 كيلوبايت
              <input
                disabled={pending}
                type="file"
                accept=".csv,.tsv,.txt"
                className="mt-2 block w-full text-xs"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    if (f.size > 500000) {
                      setMessage("الحد الأقصى 500 كيلوبايت.");
                      return;
                    }
                    await read(await f.text());
                  }
                }}
              />
            </span>
          </label>
          <details>
            <summary className="cursor-pointer text-sm underline">
              أو الصق من Excel / قائمة أرقام
            </summary>
            <textarea
              aria-label="لصق جهات الاتصال"
              rows={4}
              className={inputClass}
              placeholder={"الاسم\tالجوال\nنورة\t05xxxxxxxx"}
              onChange={(e) => {
                void read(e.target.value);
              }}
              disabled={pending}
            />
          </details>
          <a
            className="text-sm underline"
            href="data:text/csv;charset=utf-8,%EF%BB%BFname%2Cphone%0A"
            download="soulvd-contacts.csv"
          >
            تنزيل ملف أعمدة فارغ
          </a>
          {raw.length > 0 && (
            <fieldset disabled={pending} className="space-y-4">
              <legend className="mb-3 font-bold">١. مطابقة الأعمدة</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={header}
                  onChange={(e) => {
                    setHeader(e.target.checked);
                    setReview(false);
                  }}
                />
                الصف الأول عناوين
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["عمود الرقم", phone, setPhone],
                  ["عمود الاسم (اختياري)", name, setName],
                ].map(([label, value, setter]) => (
                  <label key={String(label)}>
                    {String(label)}
                    <select
                      className={inputClass}
                      value={value as number}
                      onChange={(e) => {
                        (setter as (v: number) => void)(Number(e.target.value));
                        setReview(false);
                      }}
                    >
                      {String(label).includes("الاسم") && (
                        <option value={-1}>بدون اسم</option>
                      )}
                      {raw[0].map((h, i) => (
                        <option key={i} value={i}>
                          {header ? h : `العمود ${i + 1}`} · {i + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <label className="block">
                الشريحة
                <input
                  className={inputClass}
                  maxLength={80}
                  value={segment}
                  onChange={(e) => {
                    setSegment(e.target.value);
                    setReview(false);
                  }}
                  placeholder="مثل: عملاء الرياض"
                />
              </label>
              <label className="flex items-start gap-2 text-sm leading-7">
                <input
                  type="checkbox"
                  className="mt-2"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    setReview(false);
                  }}
                />
                لدي موافقة هؤلاء العملاء على استقبال رسائل واتساب من نشاطي.
              </label>
              {consent && (
                <label className="block text-sm">
                  مصدر الموافقة
                  <input
                    className={inputClass}
                    maxLength={300}
                    value={source}
                    onChange={(e) => {
                      setSource(e.target.value);
                      setReview(false);
                    }}
                    placeholder="مثل: نموذج اشتراك واتساب في المتجر، سبتمبر 2026"
                  />
                </label>
              )}
              <p className="text-xs leading-6 text-ink-500">
                يمكن الحفظ دون موافقة، لكن لن تدخل هذه الجهات في الحملات. نحافظ
                على الأرقام الموجودة وموافقاتها واستبعاداتها دون تعديل.
              </p>
              <button
                type="button"
                className={buttonClass}
                onClick={() => setReview(true)}
              >
                ٢. مراجعة الاستيراد
              </button>
              {review && (
                <div className="space-y-4 rounded-xl bg-sage-50 p-4">
                  <p className="font-semibold">
                    {preview.contacts.length} رقم صالح · {preview.duplicates}{" "}
                    مكرر داخل الملف · {preview.invalid.length} غير صالح
                  </p>
                  {preview.invalid.length > 0 && (
                    <p className="text-sm text-amber-800">
                      الصفوف المستبعدة:{" "}
                      {preview.invalid.slice(0, 30).join("، ")}
                      {preview.invalid.length > 30 ? "…" : ""}. صحّح الملف وأعد
                      رفعه لإضافتها.
                    </p>
                  )}
                  <div className="space-y-2 text-sm">
                    {preview.contacts.slice(0, 5).map((c) => (
                      <div key={c.phone} className="flex justify-between gap-2">
                        <span>{c.name || "بدون اسم"}</span>
                        <bdi>+{c.phone}</bdi>
                      </div>
                    ))}
                  </div>
                  <button
                    disabled={
                      !preview.contacts.length ||
                      (consent && source.trim().length < 3)
                    }
                    className={buttonClass}
                    onClick={() =>
                      start(async () => {
                        let added = 0,
                          existing = 0;
                        try {
                          for (
                            let i = 0;
                            i < preview.contacts.length;
                            i += 500
                          ) {
                            const r = await importAudience({
                              rows: preview.contacts.slice(i, i + 500),
                              segment,
                              source: consent ? source : "",
                            });
                            if (!r.ok) {
                              setMessage(
                                `حُفظ ${added} قبل توقف الاستيراد. ${r.message}`,
                              );
                              router.refresh();
                              return;
                            }
                            added += r.added ?? 0;
                            existing += r.existing ?? 0;
                            setMessage(
                              `جارٍ الاستيراد… ${Math.min(i + 500, preview.contacts.length)} / ${preview.contacts.length}`,
                            );
                          }
                          setMessage(
                            `اكتمل: ${added} جهة جديدة، و${existing} موجودة مسبقًا. لم تُرسل رسائل.`,
                          );
                          setRaw([]);
                          router.refresh();
                        } catch {
                          setMessage(
                            `انقطع الاتصال بعد حفظ ${added} جهة مؤكدة. أعد الاستيراد؛ سنحافظ على الموجود دون تكراره.`,
                          );
                          router.refresh();
                        }
                      })
                    }
                  >
                    {pending ? "جارٍ الحفظ…" : "تأكيد وحفظ الجهات الصالحة"}
                  </button>
                </div>
              )}
            </fieldset>
          )}
        </section>
      )}
      {message && (
        <p role="status" className={cardClass}>
          {message}
        </p>
      )}
      <section className={cardClass}>
        <h2 className="mb-4 text-lg font-bold">دفتر العملاء</h2>
        {!rows.length && (
          <p className="py-8 text-center text-sm text-ink-500">
            سيظهر جمهورك هنا بعد أول استيراد.
          </p>
        )}
        <div className="divide-y">
          {rows.map((c) => (
            <article
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4"
            >
              <div>
                <p className="font-semibold">{c.name || "بدون اسم"}</p>
                <bdi className="text-sm text-ink-500">+{c.phone}</bdi>
                <p className="mt-1 text-xs text-ink-500">
                  {c.segment || "بدون شريحة"}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  {c.consent_at && !c.suppressed && <CheckCircle2 size={14} />}{" "}
                  {c.suppressed
                    ? "مستبعد"
                    : c.consent_at
                      ? "موافقة مسجلة"
                      : "دون موافقة"}
                </span>
                {canManage && !c.suppressed && (
                  <button
                    disabled={pending}
                    className="underline"
                    onClick={() =>
                      start(async () => {
                        try {
                          setMessage((await suppressAudience(c.id)).message);
                          router.refresh();
                        } catch {
                          setMessage("تعذر الاستبعاد. أعد المحاولة.");
                        }
                      })
                    }
                  >
                    استبعاد من الحملات
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
