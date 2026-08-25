import { setRequestLocale } from 'next-intl/server';
import { Hero } from '@/components/home/Hero';
import { Partners } from '@/components/home/Partners';
import { HomeContact } from '@/components/home/HomeContact';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Hero />
      <Partners />
      <HomeContact />
    </>
  );
}
