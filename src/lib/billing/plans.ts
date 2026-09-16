export const PLAN_CODES = ['starter', 'pro_growth'] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

// null means unlimited. These are display defaults; the server enforces the
// immutable plan version attached to the subscription in PostgreSQL.
export const PLANS = {
  starter: {
    name: 'باقة الانطلاق', priceSar: 299, recommended: false,
    conversations: 2_000, numbers: 1, seats: 2, templates: 10, flows: 1,
    apiEnabled: false,
  },
  pro_growth: {
    name: 'باقة النمو الاحترافية', priceSar: 399, recommended: true,
    conversations: 10_000, numbers: 1, seats: null, templates: null, flows: null,
    apiEnabled: true,
  },
} as const;

export type Resource = 'conversations' | 'numbers' | 'seats' | 'templates' | 'flows';

export function usageState(used: number, limit: number | null) {
  if (limit === null) return { percentage: null, level: 'normal' as const, remaining: null };
  if (limit <= 0 || used < 0) throw new RangeError('Invalid usage');
  const percentage = Math.min(100, used / limit * 100);
  return {
    percentage, remaining: Math.max(0, limit - used),
    level: used >= limit ? 'blocked' as const : used >= limit * 0.8 ? 'warning' as const : 'normal' as const,
  };
}
