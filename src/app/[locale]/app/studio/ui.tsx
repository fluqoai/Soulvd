import Link from 'next/link';
export const inputClass =
  'mt-2 w-full rounded-xl border border-sage-200 bg-white p-3 text-ink-900 focus:outline-2 focus:outline-sage-600';
export const buttonClass =
  'rounded-xl bg-sage-900 px-5 py-3 font-medium text-white hover:bg-sage-800 disabled:cursor-not-allowed disabled:opacity-50';
export const cardClass =
  'rounded-2xl border border-sage-200 bg-white p-6 shadow-sm';
export function StudioHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="space-y-4">
      <nav aria-label="أدوات المساحة" className="flex flex-wrap gap-4 text-sm">
        <Link className="underline" href="/app/automations">
          الأتمتة والبوت
        </Link>
        <Link className="underline" href="/app/templates">
          مكتبة القوالب
        </Link>
        <Link className="underline" href="/app/integrations">
          التكاملات وAPI
        </Link>
        <Link className="underline" href="/app/whatsapp">
          صندوق الرسائل
        </Link>
      </nav>
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="max-w-3xl leading-8 text-wood-700">{description}</p>
    </header>
  );
}
