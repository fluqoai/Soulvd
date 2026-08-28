import { setRequestLocale } from 'next-intl/server';
import { SectorDetail } from '@/components/public/SectorDetail';

export default async function SectorDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  return <SectorDetail slug={slug} />;
}

// Pre-generate the 6 sector slugs at build time
export async function generateStaticParams() {
  const slugs = ['nonprofit', 'public', 'restaurants', 'real-estate', 'education', 'healthcare', 'other'];
  return slugs.map((slug) => ({ slug }));
}
