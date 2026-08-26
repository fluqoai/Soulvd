import { setRequestLocale } from 'next-intl/server';
import { About } from '@/components/public/About';
import { CTAWithForm } from '@/components/home/CTAWithForm';

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
      <CTAWithForm />
    </>
  );
}
