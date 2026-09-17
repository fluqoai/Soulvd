import PlanPicker from "@/components/billing/PlanPicker";
export const metadata = { title: "باقات Soulvd | ابدأ من 299 ريال شهريًا" };
export default function PlansPage() {
  return (
    <main dir="rtl" className="mx-auto max-w-5xl space-y-8 px-5 py-16">
      <header className="space-y-3 text-center">
        <p className="text-sm text-sage-700">باقات Soulvd</p>
        <h1 className="text-4xl font-bold">
          مساحة واحدة لخدمة عملائك وتنمية أعمالك
        </h1>
        <p className="text-wood-600">
          اختر الباقة التي تناسب فريقك، وابدأ بالتحويل البنكي.
        </p>
      </header>
      <PlanPicker />
    </main>
  );
}
