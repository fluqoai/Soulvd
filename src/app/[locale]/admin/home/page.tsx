import { PageHeader } from '@/components/admin/PageHeader';
import { Link } from '@/i18n/routing';
import {
  Settings,
  Inbox,
  Briefcase,
  MessageSquareQuote,
  Sparkles,
} from 'lucide-react';

/**
 * Home admin index — jump-board to every content table that
 * feeds the public home page.
 *
 * Home page composition (top → bottom, 4 sections):
 *   1. Hero + chat preview — hardcoded copy in messages/ + HeroChat
 *   2. Case studies        — /admin/case-studies
 *   3. FAQ                 — translated strings in messages/
 *   4. CTA + form          — CTA copy in messages/ + built-in form
 *
 * Service and integration details live on /services and /integrations.
 */
export default function HomeAdminPage() {
  const sections = [
    {
      href: '/admin/settings',
      icon: Settings,
      title: 'Site settings',
      desc: 'Site name, tagline, contact info, social links',
    },
    {
      href: '/admin/case-studies',
      icon: Briefcase,
      title: 'Case studies',
      desc: 'Featured client stories with metrics (3 shown)',
    },
    {
      href: '/admin/leads',
      icon: Inbox,
      title: 'Leads',
      desc: 'Inbound leads from the home contact form and /contact',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Home content"
        description="The public home page is composed of 4 sections. Use the links below to manage each data-driven piece."
      />

      <div className="grid gap-3 sm:grid-cols-2 max-w-3xl">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="flex items-start gap-3 rounded-xl border border-linen-400/10 bg-ink-800/40 p-4 hover:bg-ink-800/70 transition-colors"
            >
              <div className="size-9 rounded-lg bg-sage-500/15 text-sage-300 grid place-items-center shrink-0">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-paper">{s.title}</p>
                <p className="text-xs text-linen-400 mt-0.5">{s.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100 max-w-2xl">
        <div className="flex items-start gap-2">
          <Sparkles className="size-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium mb-1">Hardcoded in code or translations</p>
            <p className="text-amber-200/80 text-xs leading-relaxed">
              The Hero (with chat preview and headline) and the FAQ
              questions are in code or in&nbsp;
              <code className="text-xs">messages/{'{ar,en}.json'}</code>
              &nbsp;under <code className="text-xs">home.hero</code> and <code className="text-xs">home.faq</code>. Service and integration details live on the&nbsp;
              <code className="text-xs">/services</code> page (managed there).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
