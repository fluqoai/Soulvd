import type { Metadata } from 'next';
import { CheckCircle2, CircleAlert, ShieldCheck } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'WhatsApp connection | Soulvd',
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
};

export default async function WhatsAppConnectedPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const { status } = await searchParams;
  const isArabic = locale === 'ar';
  const hasError = status === 'error';

  setRequestLocale(locale);

  const copy = hasError
    ? {
        title: isArabic ? 'لم يكتمل ربط واتساب' : 'WhatsApp was not connected',
        description: isArabic
          ? 'لم يتم إجراء أي تغيير على حسابك. يمكنك إعادة المحاولة من رابط الربط الذي أرسلته لك سولڤد.'
          : 'No changes were made to your account. You can try again using the connection link Soulvd sent you.',
        action: isArabic ? 'العودة إلى سولڤد' : 'Return to Soulvd',
      }
    : {
        title: isArabic ? 'التحقق من ربط واتساب' : 'Verify your WhatsApp connection',
        description: isArabic
          ? 'العودة من Meta لا تؤكد اكتمال الربط. افتح مساحة العمل للتحقق من حفظ التفويض واختبار إرسال الرسائل واستقبالها.'
          : 'Returning from Meta does not confirm a connection. Open your workspace to verify authorization and test sending and receiving messages.',
        action: isArabic ? 'العودة إلى سولڤد' : 'Return to Soulvd',
      };

  const StatusIcon = hasError ? CircleAlert : CheckCircle2;

  return (
    <section className="relative isolate flex min-h-[68vh] items-center overflow-hidden py-20 sm:py-28">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(168,185,172,0.3),transparent_55%)]"
      />
      <Container className="max-w-3xl">
        <div className="rounded-3xl border border-ink-900/10 bg-white/70 p-8 text-center shadow-[0_24px_80px_rgba(44,42,38,0.08)] backdrop-blur sm:p-12">
          <StatusIcon
            aria-hidden="true"
            className={`mx-auto size-14 ${hasError ? 'text-wood-700' : 'text-sage-600'}`}
            strokeWidth={1.6}
          />
          <h1 className="mt-6 text-3xl font-semibold text-ink-900 sm:text-4xl">
            {copy.title}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-ink-600 sm:text-lg">
            {copy.description}
          </p>
          <div className="mt-8">
            <ButtonLink href="/" variant="accent" size="lg">
              {copy.action}
            </ButtonLink>
          </div>
          <p className="mt-8 inline-flex items-center gap-2 text-sm text-ink-500">
            <ShieldCheck aria-hidden="true" className="size-4 text-sage-600" />
            {isArabic
              ? 'تتم عملية التفويض بأمان من خلال Meta.'
              : 'Authorization is handled securely by Meta.'}
          </p>
        </div>
      </Container>
    </section>
  );
}
