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
import type { CSSProperties } from "react";
const tones = [
  ["#37634e", "#edf4ee"], ["#8b6230", "#faf2e4"],
  ["#50668e", "#eff2f9"], ["#735d83", "#f5eff8"],
  ["#386e79", "#eaf4f6"],
];
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
        {goals.map((g, index) => {
          const Icon = icons[g.icon];
          const [accent, tint] = tones[index % tones.length];
          return (
            <Link
              key={g.id}
              href={g.href}
              className="sv-surface sv-goal group p-5"
              style={{ "--sv-accent": accent, "--sv-tint": tint } as CSSProperties}
            >
              <span className="sv-goal-icon mb-4 inline-flex p-3">
                <Icon size={22} aria-hidden="true" />
              </span>
              <h3 className="flex items-center justify-between gap-2 font-bold">
                {g.title}
                <ArrowUpLeft size={17} aria-hidden="true" />
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
