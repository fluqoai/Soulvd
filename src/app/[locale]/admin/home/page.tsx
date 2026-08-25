import { PageHeader } from '@/components/admin/PageHeader';
import { Link } from '@/i18n/routing';
import { Home, Settings, Users, Inbox, Image as ImageIcon, BarChart3, Wand2, Handshake, MessageCircle, FileText } from 'lucide-react';

/**
 * The home page is now built from these content tables directly:
 *   - hero: static (see /admin/settings for tagline/site name)
 *   - partners: /admin/partners
 *   - contact form: built-in (writes to leads)
 *   - the 3D mark is in code (Hero.tsx)
 *
 * This page is the home admin "index" — a quick jump-board to the
 * pieces that drive the home page.
 */
export default function HomeAdminPage() {
  const sections = [
    { href: '/admin/settings', icon: Settings, title: 'Site settings', desc: 'Site name, tagline, contact info, social links' },
    { href: '/admin/partners', icon: Handshake, title: 'Partners', desc: 'Client logos on the home page scrolling strip' },
    { href: '/admin/leads', icon: Inbox, title: 'Leads', desc: 'Inbound leads from the home page and /contact forms' },
    { href: '/admin/value-props', icon: Wand2, title: 'Value props (legacy)', desc: 'The 7 "why Soulvd" feature items on the original home' },
    { href: '/admin/stats', icon: BarChart3, title: 'Stats (legacy)', desc: 'Big numbers on the original home page' },
  ];

  return (
    <div>
      <PageHeader
        title="Home content"
        description="The current home page is built from the components in code (Hero, Partners, HomeContact) plus the site-wide Settings. Use the links below to manage each part."
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
        <p className="font-medium mb-1">Note</p>
        <p className="text-amber-200/80 text-xs">
          The home page hero text, eyebrow, and the 3D mark currently live in code (<code className="text-xs">src/components/home/Hero.tsx</code>).
          Edit the source to change them. The Partners strip, contact form, and site-wide tagline are managed here.
        </p>
      </div>
    </div>
  );
}
