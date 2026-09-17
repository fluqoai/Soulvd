// Deterministic retrieval keeps prompts bounded and avoids silently ignoring later sources.
// This is lexical retrieval over tenant-owned text, not a claim of semantic/vector search.
export function knowledgeContext(
  entries: { title: string; content: string }[],
  question: string,
) {
  const normalize = (s: string) =>
    s
      .normalize('NFKC')
      .toLocaleLowerCase('ar')
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[أإآ]/g, 'ا');
  const terms = [
    ...new Set(normalize(question).match(/[\p{L}\p{N}]{3,}/gu) ?? []),
  ];
  const chunks = entries.flatMap((entry, index) => {
    const pieces = [];
    for (let start = 0; start < entry.content.length; start += 1250) {
      const body = entry.content.slice(start, start + 1500),
        normalized = normalize(body),
        title = normalize(entry.title);
      const score = terms.reduce(
        (sum, term) =>
          sum +
          (title.includes(term) ? 4 : 0) +
          (normalized.includes(term) ? 1 : 0),
        0,
      );
      pieces.push({ score, index, start, text: `${entry.title}\n${body}` });
    }
    return pieces;
  });
  return chunks
    .sort((a, b) => b.score - a.score || a.index - b.index || a.start - b.start)
    .slice(0, 8)
    .map((c) => c.text)
    .join('\n\n')
    .slice(0, 16000);
}
