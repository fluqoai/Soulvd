import { getTranslations } from 'next-intl/server';
import { Bot, Megaphone, Inbox, Check, ArrowUpRight } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { ScrollReveal } from '@/components/motion/Motion';
import { SectionLabel } from './SectionLabel';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

type Service = {
  key: string;
  icon: string;
  title: string;
  description: string;
  bullets: string[];
};

/* Three focused offerings — the 3 things every Saudi business
   needs from WhatsApp: respond, broadcast, manage. */
const ICON_MAP: Record<string, typeof Bot> = { Bot, Megaphone, Inbox };

export async function ServicesShowcase() {
  const t = await getTranslations('home.services');
  const list = (t.raw('list') as Service[]) ?? [];

  return (
    <Section id="services" tone="linen" size="lg" className="relative overflow-hidden">
      <div className="grid gap-10 md:gap-14 md:grid-cols-12 md:items-end">
        <div className="md:col-span-7">
          <SectionLabel text={{ ar: t('label'), en: t('label') }}>
            {t('label')}
          </SectionLabel>
          <ScrollReveal>
            <h2 className="mt-6 md:mt-8 text-3xl md:text-4xl lg:text-5xl font-semibold leading-[1.1] tracking-tight text-ink-900 text-balance">
              {t('title')}
            </h2>
          </ScrollReveal>
        </div>
        <ScrollReveal delay={0.1} className="md:col-span-5">
          <p className="text-base md:text-lg text-ink-700 leading-relaxed text-pretty">
            {t('subtitle')}
          </p>
        </ScrollReveal>
      </div>

      <div className="mt-12 md:mt-16 grid gap-4 md:gap-5 md:grid-cols-3">
        {list.map((s, i) => {
          const Icon = ICON_MAP[s.icon] ?? Bot;
          return (
            <ScrollReveal
              key={s.key}
              delay={i * 0.08}
              className="group h-full"
            >
              <article
                className={cn(
                  'h-full rounded-2xl overflow-hidden flex flex-col',
                  'bg-paper border border-ink-900/10',
                  'transition-colors duration-200 hover:border-sage-300'
                )}
              >
                {/* Mini UI preview — varies per service */}
                <ServicePreview kind={s.key as 'bot' | 'campaigns' | 'inbox'} />

                <div className="p-6 md:p-7 flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center justify-center size-10 md:size-12 rounded-xl bg-sage-50 text-sage-700">
                      <Icon className="size-5 md:size-6" strokeWidth={1.6} aria-hidden />
                    </span>
                    <ArrowUpRight
                      className="size-4 text-ink-500 opacity-50"
                      aria-hidden
                    />
                  </div>

                  <h3 className="text-lg md:text-xl font-semibold leading-snug text-ink-900">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm md:text-[15px] text-ink-700 leading-relaxed text-pretty">
                    {s.description}
                  </p>

                  {s.bullets && s.bullets.length > 0 && (
                    <ul className="mt-5 space-y-2">
                      {s.bullets.map((b, j) => (
                        <li
                          key={j}
                          className="flex items-start gap-2.5 text-sm text-ink-700"
                        >
                          <span className="mt-0.5 size-4 rounded-full bg-sage-100 text-sage-700 grid place-items-center shrink-0">
                            <Check className="size-2.5" strokeWidth={3} aria-hidden />
                          </span>
                          <span className="leading-snug">{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex-1" />

                  <Link
                    href="/services"
                    className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-sage-700 hover:text-sage-800 transition-colors"
                  >
                    {t('learn_more')}
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </Link>
                </div>
              </article>
            </ScrollReveal>
          );
        })}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------
   Mini UI previews — built with HTML/CSS only, no external images.
   Each one is a real-looking, branded, miniature product surface.
   ------------------------------------------------------------------ */
function ServicePreview({ kind }: { kind: 'bot' | 'campaigns' | 'inbox' }) {
  if (kind === 'bot') {
    return (
      <div className="relative h-44 md:h-52 bg-[#075E54] overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 0%, transparent 50%), radial-gradient(circle at 80% 70%, white 0%, transparent 50%)' }} />
        <div className="absolute top-3 start-3 end-3 flex items-center gap-2">
          <span className="size-8 rounded-full bg-paper grid place-items-center">
            <Bot className="size-4 text-sage-700" strokeWidth={1.6} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white leading-tight">Soulvd</p>
            <p className="text-[10px] text-white/70 leading-tight">online</p>
          </div>
          <span className="size-1.5 rounded-full bg-emerald-300" />
        </div>

        <div className="absolute top-14 start-3 end-3 space-y-1.5">
          <div className="bg-paper/95 rounded-2xl rounded-bl-md px-3 py-2 max-w-[80%] shadow-sm">
            <p className="text-[11px] text-ink-900 leading-tight">السلام عليكم، أبغى أحجز</p>
          </div>
          <div className="bg-[#DCF8C6]/95 rounded-2xl rounded-br-md px-3 py-2 max-w-[85%] ms-auto shadow-sm">
            <p className="text-[11px] text-ink-900 leading-tight">أهلاً! تمام، أي يوم يناسبك؟</p>
          </div>
          <div className="bg-paper/95 rounded-2xl rounded-bl-md px-3 py-2 max-w-[70%] shadow-sm">
            <p className="text-[11px] text-ink-900 leading-tight">بكرة الخميس، الساعة ٧</p>
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'campaigns') {
    return (
      <div className="relative h-44 md:h-52 bg-gradient-to-br from-sage-50 to-linen-100 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[0.15em] text-ink-500 font-medium">
            Campaign performance
          </span>
          <span className="text-[10px] text-sage-700 font-semibold">+38%</span>
        </div>

        {/* Mini bar chart */}
        <div className="flex-1 flex items-end gap-1.5">
          {[40, 65, 50, 78, 55, 92, 70].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${h}%`,
                background:
                  i === 5
                    ? 'linear-gradient(180deg, var(--color-sage-500), var(--color-sage-700))'
                    : 'rgba(72, 90, 77, 0.18)',
              }}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-ink-600">
          <span>2,847 sent</span>
          <span className="font-semibold text-ink-900">64% open</span>
          <span>1,832 click</span>
        </div>
      </div>
    );
  }

  // inbox
  return (
    <div className="relative h-44 md:h-52 bg-linen-100 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-[0.15em] text-ink-500 font-medium">
          Inbox · 12 open
        </span>
        <span className="size-1.5 rounded-full bg-sage-500" />
      </div>

      {[
        { name: 'محمد العتيبي', msg: 'بشوف العرض وأرد عليك', time: '2د', unread: true },
        { name: 'سارة الشمري', msg: 'ممكن تأكيد الحجز؟', time: '5د', unread: true },
        { name: 'فهد القحطاني', msg: 'شكراً، تم الاستلام', time: '12د', unread: false },
      ].map((row, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 bg-paper rounded-lg p-2 border border-ink-900/8"
        >
          <span className="size-7 rounded-full bg-ink-900 text-paper grid place-items-center text-[10px] font-semibold shrink-0">
            {row.name.charAt(0)}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-ink-900 truncate">{row.name}</p>
              <span className="text-[9px] text-ink-500 shrink-0">{row.time}</span>
            </div>
            <p className="text-[10px] text-ink-600 truncate">{row.msg}</p>
          </div>
          {row.unread && <span className="size-1.5 rounded-full bg-sage-600 shrink-0" />}
        </div>
      ))}
    </div>
  );
}
