import type { ChatMessage } from "./types";
export function mergeRecentMessages(
  current: ChatMessage[],
  page: ChatMessage[],
  pageSize = 50,
) {
  const ids = new Set(current.map((m) => m.id));
  // A burst while the tab slept can exceed one page. Restart the visible window
  // so the older-page cursor still reaches every skipped message in the archive.
  const reset =
    current.length === 0 ||
    (page.length === pageSize &&
      !page.some((m) => ids.has(m.id)) &&
      new Date(page[0].created_at).getTime() >=
        new Date(current.at(-1)!.created_at).getTime());
  const all = new Map<string, ChatMessage>(
    (reset ? [] : current).map((m) => [m.id, m]),
  );
  for (const m of page) all.set(m.id, m);
  return {
    reset,
    messages: [...all.values()].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime() ||
        a.id.localeCompare(b.id),
    ),
  };
}
