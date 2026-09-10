import { Container } from '@/components/ui/Container';

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <section className="py-16 sm:py-24">
      <Container className="max-w-4xl">
        <header className="border-b border-ink-900/10 pb-10">
          <p className="text-sm font-semibold tracking-wide text-sage-700">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink-900 sm:text-5xl">{title}</h1>
          <p className="mt-4 text-sm text-ink-500">{updated}</p>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-ink-700">{intro}</p>
        </header>

        <div className="space-y-10 pt-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-2xl font-semibold text-ink-900">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-4 leading-8 text-ink-700">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-4 list-disc space-y-2 ps-6 leading-8 text-ink-700">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </Container>
    </section>
  );
}
