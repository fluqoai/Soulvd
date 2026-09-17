import Link from "next/link";
import SignupForm from "./SignupForm";
import { signupsReady } from "@/lib/billing/launch";
export const metadata = {
  title: "إنشاء حساب | Soulvd",
  robots: { index: false, follow: false },
};
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const plan = params.plan === "starter_v1" ? "starter_v1" : "pro_growth_v1";
  const months = [3, 6, 12].includes(Number(params.months))
    ? Number(params.months)
    : 3;
  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#f6f7f5] px-5 py-10"
    >
      <div className="w-full max-w-md rounded-3xl border border-sage-100 bg-white p-7 shadow-sm sm:p-9">
        <Link href="/" className="text-3xl font-bold tracking-tight" dir="ltr">
          Soulvd.
        </Link>
        <h1 className="mb-3 mt-7 text-2xl font-bold">ابدأ مساحة عملك</h1>
        <p className="mb-7 text-sm leading-7 text-ink-500">
          أنشئ حسابك، ثم اختر الباقة والمدة. يبدأ الاشتراك بعد تأكيد التحويل
          البنكي؛ إنشاء الحساب لا يخصم أي مبلغ.
        </p>
        {(await signupsReady()) ? (
          <SignupForm plan={plan} months={months} />
        ) : (
          <div className="space-y-4 rounded-xl bg-sage-50 p-5 text-sm leading-7">
            <p>
              نجهز استقبال المنشآت الجديدة.{" "}
              <Link href="/contact" className="underline">
                تواصل معنا
              </Link>{" "}
              لتجهيز انضمام مؤسستك.
            </p>
            <Link href="/login" className="block font-semibold underline">
              لديك حساب؟ سجّل الدخول
            </Link>
          </div>
        )}
        <Link
          href="/plans"
          className="mt-6 block text-center text-sm text-sage-700 underline"
        >
          استعرض الباقات والأسعار
        </Link>
      </div>
    </main>
  );
}
