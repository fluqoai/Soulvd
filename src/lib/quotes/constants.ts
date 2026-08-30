// src/lib/quotes/constants.ts
// Constants for the quotes table. Kept separate from actions.ts because
// 'use server' files can only export async functions, and the labels/styles
// are consumed by both server and client components.

export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft:    'مسودة',
  sent:     'مُرسلة',
  accepted: 'مقبولة',
  rejected: 'مرفوضة',
  expired:  'منتهية',
};

export const QUOTE_STATUS_STYLES: Record<QuoteStatus, string> = {
  draft:    'bg-ink-100 text-ink-700 ring-1 ring-ink-900/10',
  sent:     'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  accepted: 'bg-sage-100 text-sage-800 ring-1 ring-sage-200',
  rejected: 'bg-red-100 text-red-800 ring-1 ring-red-200',
  expired:  'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
};
