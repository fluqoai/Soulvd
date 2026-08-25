import { PageHeader } from '@/components/admin/PageHeader';
import { Link } from '@/i18n/routing';
import {
  Settings,
  Inbox,
  Handshake,
  Briefcase,
  Layers,
  BarChart3,
  ListOrdered,
  Sparkles,
} from 'lucide-react';

/**
 * Home admin index — a jump-board to every content table that
 * feeds the public home page.
 *
 * Home page composition (top → bottom):
 *   1. Hero              — static (3D mark + text in code)
 *   2. Stats             — /admin/stats
 *   3. Services          — /admin/services
 *   4. Sectors           — /admin/sectors
 *   5. Process           — hardcoded in code (4 steps)
 *   6. Partners          — /admin/partners
 *   7. CTA               — static in code
 *   8. Home contact form — built-in (writes to leads)
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
      href: '/admin/stats',
      icon: BarChart3,
      title: 'Stats',
      desc: 'The 4 big numbers in the "By the numbers" section',
    },
    {
      href: '/admin/services',
      icon: Briefcase,
      title: 'Services',
      desc: 'The 6 cards in the services bento grid',
    },
    {
      href: '/admin/sectors',
      icon: Layers,
      title: 'Sectors',
      desc: 'The 6 sector cards with hex pattern backgrounds',
    },
    {
      href: '/admin/partners',
      icon: Handshake,
      title: 'Partners',
      desc: 'Client logos in the scrolling marquee',
    },
    {
      href: '/admin/leads',
      icon: Inbox,
      title: 'Leads',
      desc: 'Inbound leads from the home and /contact forms',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Home content"
        description="The public home page is composed of these pieces. Use the links below to manage each section."
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
            <p className="font-medium mb-1">Hardcoded in code</p>
            <p className="text-amber-200/80 text-xs leading-relaxed">
              The Hero (with 3D mark and headline), the Process timeline
              (4 steps: Discovery → Build → Launch → Optimize), and the
              closing CTA are written in code for now. The 4 process steps
              and the CTA copy are translated in&nbsp;
              <code className="text-xs">messages/{'{ar,en}.json'}</code>
              &nbsp;under <code className="text-xs">home.process</code> and
              <code className="text-xs"> home.cta</code>. Edit those to
              change the content.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
