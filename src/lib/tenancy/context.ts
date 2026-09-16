import 'server-only';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { PlanCode } from '@/lib/billing/plans';

export type TenantContext = { userId: string; tenantId: string; name: string; isTest?: boolean; role: 'owner' | 'admin' | 'agent' };
export type Subscription = {
  plan_id: string; status: 'pending' | 'active' | 'past_due' | 'cancelled';
  period_start: string; period_end: string;
};
export type PlanVersion = {
  id: string; code: PlanCode; price_halalas: number; conversations_limit: number;
  numbers_limit: number; seats_limit: number | null; templates_limit: number | null;
  flows_limit: number | null; api_enabled: boolean;
};

export async function currentMerchant() {
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect('/login');
  return { db, user };
}

export async function tenantContext(): Promise<TenantContext | null> {
  const { db, user } = await currentMerchant();
  // RLS only returns the caller's tenants. Mutations never trust a submitted tenant ID.
  const selected = (await cookies()).get('soulvd_tenant')?.value;
  let membership = db.from('tenant_members').select('tenant_id, role').eq('user_id', user.id);
  if (selected && /^[a-f0-9-]{36}$/i.test(selected)) membership = membership.eq('tenant_id', selected);
  let { data, error } = await membership.order('tenant_id').limit(1).maybeSingle();
  if (!data && !error && selected) {
    const fallback = await db.from('tenant_members').select('tenant_id, role').eq('user_id', user.id).order('tenant_id').limit(1).maybeSingle();
    data = fallback.data; error = fallback.error;
  }
  if (error) throw new Error('تعذر تحميل مساحة العمل.');
  if (!data) return null;
  const { data: tenant, error: tenantError } = await db.from('tenants').select('*').eq('id', data.tenant_id).single();
  if (tenantError) throw new Error('تعذر تحميل مساحة العمل.');
  return { userId: user.id, tenantId: data.tenant_id, name: tenant.name, isTest: tenant.is_test === true, role: data.role };
}

export async function requireTenant() {
  const context = await tenantContext();
  if (!context) redirect('/app/onboarding');
  return context;
}

export async function tenantUsage() {
  const context = await requireTenant();
  const { db } = await currentMerchant();
  const { data: subscription, error } = await db.from('subscriptions').select('*').eq('tenant_id', context.tenantId).single();
  if (error) throw new Error('تعذر تحميل الاشتراك.');
  const s = subscription as Subscription;
  const [plan, usage, seats, invitations, templates, flows, numbers, dismissals] = await Promise.all([
    db.from('subscription_plans').select('*').eq('id', s.plan_id).single(),
    db.from('usage_counters').select('conversations_used').eq('tenant_id', context.tenantId).eq('period_start', s.period_start).maybeSingle(),
    db.from('tenant_members').select('*', { count: 'exact', head: true }).eq('tenant_id', context.tenantId),
    db.from('tenant_invitations').select('*', { count: 'exact', head: true }).eq('tenant_id', context.tenantId).eq('status', 'pending').gt('expires_at', new Date().toISOString()),
    db.from('whatsapp_templates').select('*', { count: 'exact', head: true }).eq('tenant_id', context.tenantId).in('status', ['pending', 'approved']),
    db.from('automation_flows').select('*', { count: 'exact', head: true }).eq('tenant_id', context.tenantId).neq('status', 'archived'),
    db.from('whatsapp_numbers').select('*', { count: 'exact', head: true }).eq('tenant_id', context.tenantId),
    db.from('usage_warning_dismissals').select('resource').eq('tenant_id', context.tenantId).eq('user_id', context.userId).eq('period_start', s.period_start),
  ]);
  if ([plan, usage, seats, invitations, templates, flows, numbers, dismissals].some(result => result.error)) throw new Error('تعذر تحميل الاستهلاك.');
  return {
    context, subscription: s, plan: plan.data as PlanVersion,
    isActive: s.status === 'active' && Date.now() >= Date.parse(s.period_start) && Date.now() < Date.parse(s.period_end),
    dismissedResources: dismissals.data?.map(row => row.resource as string) ?? [],
    usage: { conversations: usage.data?.conversations_used ?? 0, seats: (seats.count ?? 0) + (invitations.count ?? 0), templates: templates.count ?? 0, flows: flows.count ?? 0, numbers: numbers.count ?? 0 },
  };
}
