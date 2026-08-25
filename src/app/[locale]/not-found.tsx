import { useTranslations } from 'next-intl';
import { FileQuestion } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  const t = useTranslations('notFound');
  return (
    <section className="min-h-[60vh] flex items-center">
      <div className="container-page py-20 text-center">
        <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-sage-50 text-sage-700 mb-6">
          <FileQuestion className="size-8" aria-hidden />
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold text-ink-900 mb-3">
          {t('title')}
        </h1>
        <p className="text-base md:text-lg text-ink-600 max-w-md mx-auto mb-8">
          {t('description')}
        </p>
        <ButtonLink href="/" size="lg" variant="primary">
          {t('cta')}
        </ButtonLink>
      </div>
    </section>
  );
}
