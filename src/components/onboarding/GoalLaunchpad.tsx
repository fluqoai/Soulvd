import Link from "next/link";
import {
  ArrowUpLeft,
  Bot,
  Cable,
  MessageCircle,
  Megaphone,
  Workflow,
} from "lucide-react";
import { goals } from "@/lib/growth/guide";
const icons = {
  message: MessageCircle,
  campaign: Megaphone,
  flow: Workflow,
  bot: Bot,
  link: Cable,
};
export default function GoalLaunchpad() {
  return (
    <section aria-label="اختر هدفك" className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-sage-700">
          مساحتك، على طريقتك
        </p>
        <h2 className="text-2xl font-bold">ماذا تريد أن تنجز أولًا؟</h2>
        <p className="mt-2 text-sm leading-7 text-ink-500">
          ابدأ بما تحتاجه اليوم. يمكنك تجهيز أكثر من مسار، وربط رقمك عندما تكون
          مستعدًا.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {goals.map((g) => {
          const Icon = icons[g.icon];
          return (
            <Link
              key={g.id}
              href={g.href}
              className="group rounded-2xl border border-sage-100 bg-white p-5 transition hover:border-sage-400 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-sage-700"
            >
              <span className="mb-4 inline-flex rounded-xl bg-sage-50 p-3 text-sage-700">
                <Icon size={22} />
              </span>
              <h3 className="flex items-center justify-between gap-2 font-bold">
                {g.title}
                <ArrowUpLeft size={17} />
              </h3>
              <p className="mt-2 text-sm leading-7 text-ink-500">
                {g.description}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
