import { Check } from "lucide-react";
export default function OnboardingSteps({ current }: { current: number }) {
  return (
    <ol aria-label="خطوات تجهيز الحساب" className="grid grid-cols-4 gap-2">
      {["الحساب والبريد", "مساحة العمل", "تأكيد الدفع", "ربط الرقم"].map(
        (label, i) => (
          <li
            key={label}
            aria-current={current === i ? "step" : undefined}
            className={`flex flex-col items-center gap-2 text-center text-[11px] ${i <= current ? "text-sage-800" : "text-ink-500"}`}
          >
            <span
              className={`grid h-8 w-8 place-items-center rounded-full text-xs ${i <= current ? "bg-sage-800 text-white" : "bg-sage-50"}`}
            >
              {i < current ? <Check size={15} /> : i + 1}
            </span>
            {label}
          </li>
        ),
      )}
    </ol>
  );
}
