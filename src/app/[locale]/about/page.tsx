import { setRequestLocale } from 'next-intl/server';
import { About } from '@/components/public/About';
import { CTA } from '@/components/home/CTA';

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <About />
      <CTA />
    </>
  );
}
