/**
 * Lightweight JSON-LD component. Renders a single <script> tag
 * with type="application/ld+json". Safe to drop anywhere in the tree.
 *
 * Usage:
 *   <JsonLd data={{ '@context': 'https://schema.org', ... }} />
 */
type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // The data is fully owned by the caller; we trust it.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
