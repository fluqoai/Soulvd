import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@supabase/supabase-js';
import { Section } from '@/components/ui/Section';
import { ScrollReveal } from '@/components/motion/Motion';
import { Marquee } from '@/components/ui/Marquee';
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
    <Section tone="paper" size="sm" className="border-y border-ink-900/5">
      <ScrollReveal>
        <p className="text-xs md:text-sm font-medium uppercase tracking-[0.25em] text-ink-500 text-center mb-8 md:mb-12">
          {t('eyebrow')}
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.05}>
        <Marquee speed={40}>
          {partners.map((partner) => (
            <PartnerLogo key={partner.id} partner={partner} />
          ))}
        </Marquee>
      </ScrollReveal>
    </Section>
  );
}

function PartnerLogo({ partner }: { partner: Partner }) {
  const inner = partner.logo_url ? (
    <span className="relative block h-7 md:h-9 w-32 md:w-40 mx-6 md:mx-10 opacity-70 grayscale">
      <Image
        src={partner.logo_url}
        alt={partner.name}
        fill
        sizes="160px"
        className="object-contain"
      />
    </span>
  ) : (
    <span className="mx-6 md:mx-10 text-base md:text-lg font-semibold tracking-tight text-ink-700/70 whitespace-nowrap">
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
        className="block shrink-0"
      >
        {inner}
      </Link>
    );
  }
  return <span className="shrink-0">{inner}</span>;
}
