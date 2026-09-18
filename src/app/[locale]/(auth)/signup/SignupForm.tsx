"use client";
import { useActionState, useEffect, useState } from "react";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import Link from "next/link";
import { signup, resendSignup, type SignupState } from "./actions";

export default function SignupForm({
  plan,
  months,
}: {
  plan: string;
  months: number;
}) {
  const [state, action, busy] = useActionState(signup, {} as SignupState);
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div>
      <form action={action} className="space-y-4">
        {!state.sent && (
          <>
            <input type="hidden" name="plan" value={plan} />
            <input type="hidden" name="months" value={months} />
            <label className="block text-sm font-medium">
              اسمك
              <input
                name="full_name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
                className="mt-2 w-full rounded-xl border border-sage-200 p-3"
              />
            </label>
            <label className="block text-sm font-medium">
              اسم المنشأة
              <input
                name="business_name"
                autoComplete="organization"
                required
                minLength={2}
                maxLength={120}
                placeholder="مثلًا: متجر نورة"
                className="mt-2 w-full rounded-xl border border-sage-200 p-3"
              />
            </label>
            <label className="block text-sm font-medium">
              البريد الإلكتروني
              <input
                name="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                required
                maxLength={254}
                className="mt-2 w-full rounded-xl border border-sage-200 p-3"
              />
            </label>
            <label className="block text-sm font-medium">
              كلمة المرور
              <span className="relative block">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  className="mt-2 w-full rounded-xl border border-sage-200 p-3 pe-12"
                />
                <button
                  type="button"
                  aria-label={
                    showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                  }
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 end-0 px-3 text-ink-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
              <span className="mt-1 block text-xs text-ink-500">
                12 حرفًا على الأقل
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm leading-6">
              <input name="terms" type="checkbox" required className="mt-1" />
              <span>
                أوافق على{" "}
                <Link href="/terms" target="_blank" className="underline">
                  الشروط
                </Link>{" "}
                و
                <Link href="/privacy" target="_blank" className="underline">
                  سياسة الخصوصية
                </Link>
                .
              </span>
            </label>
            <button
              disabled={busy}
              className="w-full rounded-xl bg-sage-900 p-3 font-semibold text-white disabled:opacity-50"
            >
              {busy ? "جارٍ تجهيز حسابك…" : "إنشاء مساحتي"}
            </button>
          </>
        )}
        {state.message && (
          <p
            role="status"
            className="rounded-xl bg-sage-50 p-4 text-sm leading-7"
          >
            {state.sent && (
              <MailCheck className="mb-3 text-sage-700" size={30} />
            )}
            {state.sent && (
              <strong className="mb-2 block text-base">
                خطوة واحدة قبل الدخول: أكّد بريدك
              </strong>
            )}
            {state.message}
            {state.sent && (
              <span className="mt-3 block text-xs text-ink-500">
                لم تجد الرسالة؟ راجع الرسائل غير المرغوب فيها أو اطلب رسالة
                جديدة أدناه.
              </span>
            )}
          </p>
        )}
        <p className="text-center text-sm text-ink-500">
          لديك حساب؟{" "}
          <Link href="/login" className="font-semibold text-sage-800 underline">
            تسجيل الدخول
          </Link>
        </p>
      </form>
      {state.sent && state.email && <ResendConfirmation email={state.email} />}
    </div>
  );
}

function ResendConfirmation({ email }: { email: string }) {
  const [state, action, busy] = useActionState(resendSignup, {} as SignupState);
  const [seconds, setSeconds] = useState(60);
  useEffect(() => {
    const timer = setInterval(
      () => setSeconds((n) => Math.max(0, n - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  return (
    <form
      action={action}
      onSubmit={() => setSeconds(60)}
      className="mt-4 space-y-3"
    >
      <input type="hidden" name="email" value={email} />
      <button
        disabled={busy || seconds > 0}
        className="w-full rounded-xl border border-sage-200 p-3 text-sm disabled:opacity-50"
      >
        {busy
          ? "جارٍ الطلب…"
          : seconds > 0
            ? `إعادة إرسال التأكيد بعد ${seconds} ثانية`
            : "أرسل رابط تأكيد جديدًا"}
      </button>
      {state.message && (
        <p role="status" className="text-sm leading-7">
          {state.message}
        </p>
      )}
    </form>
  );
}
