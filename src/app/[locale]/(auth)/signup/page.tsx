import Link from "next/link";
import Image from "next/image";
import OnboardingSteps from "@/components/billing/OnboardingSteps";
import { PLANS } from "@/lib/billing/plans";
import { termTotal, termLabel, sar } from "@/lib/billing/terms";
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
  const chosen = PLANS[plan === "starter_v1" ? "starter" : "pro_growth"];
  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#f6f7f5] px-5 py-10"
    >
      <div className="w-full max-w-md rounded-3xl border border-sage-100 bg-white p-7 shadow-sm sm:p-9">
        <Link href="/" className="text-3xl font-bold tracking-tight" dir="ltr">
          <Image
            src="/brand/soulvd-logo.png"
            alt="Soulvd"
            width={135}
            height={40}
            className="h-auto w-40"
            priority
          />
        </Link>
        <h1 className="mb-3 mt-7 text-2xl font-bold">ابدأ مساحة عملك</h1>
        <p className="mb-7 text-sm leading-7 text-ink-500">
          اختيارك محفوظ أدناه. أكّد بريدك وجهّز مساحة منشأتك. يبدأ الاشتراك بعد
          تأكيد التحويل البنكي؛ إنشاء الحساب لا يخصم أي مبلغ.
        </p>
        <div className="mb-7">
          <OnboardingSteps current={0} />
        </div>
        <div className="mb-6 rounded-2xl border border-sage-200 bg-sage-50 p-4 text-sm">
          <div className="flex justify-between gap-2">
            <h2 className="font-bold">{chosen.name}</h2>
            <Link href="/plans" className="text-xs underline">
              تغيير الاختيار
            </Link>
          </div>
          <p className="mt-2 text-xs text-ink-500">
            {termLabel(months)} · رصيد واتساب منفصل
          </p>
          <p className="mt-3 font-bold">
            {sar(termTotal(chosen.priceSar, months))} ريال تُدفع مقدمًا
          </p>
          <p className="mt-1 text-xs text-ink-500">
            لا يُطلب تحويل عند إنشاء الحساب.
          </p>
        </div>
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
