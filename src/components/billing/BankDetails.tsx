"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
export default function BankDetails() {
  const [copied, setCopied] = useState(false),
    [copyError, setCopyError] = useState(false);
  return (
    <section className="space-y-3 rounded-xl border border-sage-200 bg-sage-50 p-5">
      <h2 className="font-bold">بيانات التحويل البنكي</h2>
      <p>
        المستفيد: <strong>مؤسسة سولفد</strong>
      </p>
      <div>
        <span className="text-sm text-wood-600">الآيبان</span>
        <p
          dir="ltr"
          className="mt-1 select-all break-all text-right font-mono text-lg"
        >
          SA7320000001000883029940
        </p>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText("SA7320000001000883029940");
            setCopied(true);
            setCopyError(false);
          } catch {
            setCopyError(true);
          }
        }}
        className="flex items-center gap-2 rounded-lg border border-sage-200 bg-white px-3 py-2 text-xs font-semibold"
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
        {copied ? "تم نسخ الآيبان" : "نسخ الآيبان"}
      </button>
      <span role="status" className="text-xs">
        {copyError
          ? "تعذر النسخ؛ يمكنك تحديد الآيبان ونسخه يدويًا."
          : copied
            ? "الآيبان جاهز للصق في تطبيق البنك."
            : ""}
      </span>
      <p className="text-sm leading-6">
        تحقق من اسم المستفيد في تطبيق البنك قبل التحويل. أرسل مرجع العملية من
        نموذج الطلب أدناه. يتم التفعيل بعد التحقق من وصول المبلغ إلى الحساب.
      </p>
    </section>
  );
}
