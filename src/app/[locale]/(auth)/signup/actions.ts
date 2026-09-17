"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { signupsReady } from "@/lib/billing/launch";

export type SignupState = { sent?: boolean; message?: string };
export async function signup(
  _previous: SignupState,
  form: FormData,
): Promise<SignupState> {
  if (!(await signupsReady()))
    return {
      message: "التسجيل متاح قريبًا. يمكنك التواصل معنا لتجهيز انضمام مؤسستك.",
    };
  const parsed = z
    .object({
      email: z.email().max(254),
      full_name: z.string().trim().min(2).max(80),
      password: z.string().min(12).max(128),
      confirmation: z.string(),
      terms: z.literal("on"),
    })
    .refine((v) => v.password === v.confirmation)
    .safeParse({
      email: String(form.get("email") ?? "")
        .trim()
        .toLowerCase(),
      full_name: form.get("full_name"),
      password: form.get("password"),
      confirmation: form.get("confirmation"),
      terms: form.get("terms"),
    });
  if (!parsed.success)
    return {
      message:
        "راجع الاسم والبريد، واستخدم كلمة مرور من 12 حرفًا على الأقل مع تأكيد مطابق والموافقة على الشروط.",
    };
  const db = await createClient();
  const current = await db.auth.getUser();
  if (current.data.user)
    return {
      message:
        "لديك جلسة مفتوحة. انتقل إلى مساحة عملك أو سجّل الخروج لإنشاء حساب آخر.",
    };
  const { data, error } = await db.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: "https://www.soulvd.sa/api/auth/confirm",
      data: {
        full_name: parsed.data.full_name,
        preferred_plan:
          form.get("plan") === "starter_v1" ? "starter_v1" : "pro_growth_v1",
        preferred_months: [3, 6, 12].includes(Number(form.get("months")))
          ? Number(form.get("months"))
          : 3,
        terms_version: "2026-09-18",
      },
    },
  });
  if (error) {
    return {
      message:
        error.status === 429
          ? "وصلت إلى الحد المؤقت للمحاولات. انتظر قليلًا ثم حاول مجددًا."
          : "تعذر إرسال رسالة التأكيد. تحقق من البريد وكلمة المرور، أو تواصل مع الدعم إذا استمرت المشكلة.",
    };
  }
  // An unexpected auto-confirm configuration must not leave a new session open.
  if (data.session) await db.auth.signOut();
  return {
    sent: true,
    message:
      "إذا كان البريد مؤهلًا للتسجيل، ستصلك رسالة تأكيد. افتحها ثم سجّل الدخول لاختيار باقتك. إذا كان لديك حساب بالفعل، استخدم صفحة الدخول.",
  };
}
