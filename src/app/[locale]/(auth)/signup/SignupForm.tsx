"use client";
import { useActionState } from "react";
import Link from "next/link";
import { signup, type SignupState } from "./actions";

export default function SignupForm({
  plan,
  months,
}: {
  plan: string;
  months: number;
}) {
  const [state, action, busy] = useActionState(signup, {} as SignupState);
  return (
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
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              className="mt-2 w-full rounded-xl border border-sage-200 p-3"
            />
            <span className="mt-1 block text-xs text-ink-500">
              12 حرفًا على الأقل
            </span>
          </label>
          <label className="block text-sm font-medium">
            تأكيد كلمة المرور
            <input
              name="confirmation"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              className="mt-2 w-full rounded-xl border border-sage-200 p-3"
            />
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
            {busy ? "جارٍ إنشاء الحساب…" : "إنشاء الحساب وتأكيد البريد"}
          </button>
        </>
      )}
      {state.message && (
        <p
          role="status"
          className="rounded-xl bg-sage-50 p-4 text-sm leading-7"
        >
          {state.message}
        </p>
      )}
      <p className="text-center text-sm text-ink-500">
        لديك حساب؟{" "}
        <Link href="/login" className="font-semibold text-sage-800 underline">
          تسجيل الدخول
        </Link>
      </p>
    </form>
  );
}
