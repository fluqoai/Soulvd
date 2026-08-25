import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@supabase/supabase-js';
import { Section } from '@/components/ui/Section';
import { ScrollReveal } from '@/components/motion/Motion';
import { Link } from '@/i18n/routing';

type Partner = {
  id: string;
  name: string;
  logo_url: string | null;
  url: string | null;
};

async function fetchPartners(): Promise<Partner[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return [];
  const supabase = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from('partners')
    .select('id, name, logo_url, url')
    .eq('published', true)
    .order('order_index', { ascending: true });
  if (error) {
    console.error('Partners fetch failed:', error.message);
    return [];
  }
  return (data ?? []) as Partner[];
}

export async function Partners() {
  const t = await getTranslations('home.partners');
  const partners = await fetchPartners();

  if (partners.length === 0) {
    return null;
  }

  return (
    <Section tone="paper" size="md" className="border-y border-ink-900/5">
      <ScrollReveal>
        <p className="text-xs md:text-sm font-medium uppercase tracking-[0.25em] text-ink-500 text-center mb-10 md:mb-14">
          {t('eyebrow')}
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.05}>
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-x-8 gap-y-10 items-center">
          {partners.map((partner) => (
            <li key={partner.id} className="flex items-center justify-center">
              <PartnerLogo partner={partner} />
            </li>
          ))}
        </ul>
      </ScrollReveal>
    </Section>
  );
}

function PartnerLogo({ partner }: { partner: Partner }) {
  const inner = partner.logo_url ? (
    <span className="relative block h-8 md:h-10 w-full max-w-[140px] opacity-70 hover:opacity-100 transition-opacity grayscale hover:grayscale-0">
      <Image
        src={partner.logo_url}
        alt={partner.name}
        fill
        sizes="140px"
        className="object-contain"
      />
    </span>
  ) : (
    <span className="block text-base md:text-lg font-semibold tracking-tight text-ink-700/70 hover:text-ink-900 transition-colors">
      {partner.name}
    </span>
  );

  if (partner.url) {
    return (
      <Link
        href={partner.url.startsWith('http') ? partner.url : `https://${partner.url}`}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={partner.name}
        className="block w-full"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}
