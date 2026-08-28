'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const STATUSES = ['planning', 'in_progress', 'on_hold', 'delivered', 'cancelled'] as const;
const statusSchema = z.enum(STATUSES);

const projectSchema = z.object({
  client_id: z.string().uuid('معرّف العميل غير صالح'),
  name: z.string().min(1, 'الاسم مطلوب').max(200),
  description: z.string().max(4000).optional().default(''),
  status: statusSchema.default('planning'),
  start_date: z.string().optional().default(''),
  due_date: z.string().optional().default(''),
  budget_hours: z.string().optional().default(''),     // numeric as string, validated below
  budget_amount: z.string().optional().default(''),    // numeric as string
  currency: z.string().max(8).default('SAR'),
  owner_id: z.string().uuid().optional().or(z.literal('')),
  is_recurring: z.string().optional().default(''),       // 'on' if checked
  recurrence_pattern: z.string().optional().default(''), // 'monthly' | 'quarterly' | ''
  next_occurrence_at: z.string().optional().default(''), // ISO datetime
  auto_invoice: z.string().optional().default('on'),      // 'on' if checked
});

export type ProjectStatus = (typeof STATUSES)[number];
export type RecurrencePattern = 'monthly' | 'quarterly';

export type Project = {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  budget_hours: number | null;
  budget_amount: number | null;
  currency: string;
  owner_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  next_occurrence_at: string | null;
  parent_project_id: string | null;
  auto_invoice: boolean;
  // joined
  client_name?: string | null;
  client_company?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  total_hours?: number | null;
};

function normalize(input: z.infer<typeof projectSchema>) {
  return {
    client_id: input.client_id,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    status: input.status,
    start_date: input.start_date || null,
    due_date: input.due_date || null,
    budget_hours: input.budget_hours === '' ? null : Number(input.budget_hours),
    budget_amount: input.budget_amount === '' ? null : Number(input.budget_amount),
    currency: input.currency || 'SAR',
    owner_id: input.owner_id || null,
    is_recurring: input.is_recurring === 'on',
    recurrence_pattern: input.recurrence_pattern || null,
    next_occurrence_at: input.next_occurrence_at || null,
    auto_invoice: input.auto_invoice === 'on',
  };
}

export async function createProject(input: z.infer<typeof projectSchema>) {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'invalid' };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'unauthorized' };

  const payload = { ...normalize(parsed.data), created_by: user.id };

  const { data, error } = await supabase.from('projects').insert(payload).select('id').single();
  if (error) return { ok: false as const, error: error.message };

  await supabase.from('activity_log').insert({
    user_id: user.id,
    action: 'project_created',
    entity_type: 'project',
    entity_id: data.id,
    details: { name: payload.name, client_id: payload.client_id },
  });

  revalidatePath('/admin', 'layout');
  return { ok: true as const, id: data.id };
}

export async function updateProject(id: string, input: z.infer<typeof projectSchema>) {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'invalid' };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };

  const payload = normalize(parsed.data);
  const { error } = await supabase.from('projects').update(payload).eq('id', id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}

export async function setProjectStatus(id: string, status: string) {
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false as const, error: 'invalid_status' };
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };
  const { error } = await supabase.from('projects').update({ status: parsed.data }).eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}

export async function deleteProject(id: string) {
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}

// ============================================================
//  Recurring projects: process a renewal
// ============================================================

/** Add `pattern` to a date — handles month rollover. */
function advanceDate(from: Date, pattern: 'monthly' | 'quarterly'): Date {
  const d = new Date(from);
  if (pattern === 'monthly') d.setMonth(d.getMonth() + 1);
  if (pattern === 'quarterly') d.setMonth(d.getMonth() + 3);
  return d;
}

/**
 * Create the next instance of a recurring project.
 *  - Copies client, owner, budget, currency
 *  - New name: "<old name> — <month/year>" (Arabic)
 *  - Links back via parent_project_id
 *  - Marks the OLD project as delivered (so the next one is fresh)
 *  - If auto_invoice: also create a draft invoice for the new project
 *  - Schedules the old project's next_occurrence_at for the next cycle
 *
 * Returns: { projectId, invoiceId? }
 */
export async function processRecurring(projectId: string, options: { force?: boolean } = {}) {
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };

  // Fetch the project
  const { data: proj, error: pErr } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();
  if (pErr) return { ok: false as const, error: pErr.message };
  if (!proj) return { ok: false as const, error: 'project_not_found' };
  const p = proj as unknown as Project;
  if (!p.is_recurring || !p.recurrence_pattern) {
    return { ok: false as const, error: 'not_recurring' };
  }

  // If not forced, require next_occurrence_at to be <= now (or null = due immediately)
  if (!options.force) {
    if (p.next_occurrence_at && new Date(p.next_occurrence_at) > new Date()) {
      return { ok: false as const, error: 'not_due_yet' };
    }
  }

  const now = new Date();
  const monthLabel = now.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });

  // Create the next instance
  const { data: { user } } = await supabase.auth.getUser();
  const nextDue = advanceDate(now, p.recurrence_pattern);
  const nextOccurrence = advanceDate(nextDue, p.recurrence_pattern);

  const { data: newProj, error: npErr } = await supabase.from('projects').insert({
    client_id: p.client_id,
    name: `${p.name} — ${monthLabel}`,
    description: p.description,
    status: 'planning',
    start_date: now.toISOString().slice(0, 10),
    due_date: nextDue.toISOString().slice(0, 10),
    budget_hours: p.budget_hours,
    budget_amount: p.budget_amount,
    currency: p.currency,
    owner_id: p.owner_id,
    created_by: user?.id ?? null,
    is_recurring: true,
    recurrence_pattern: p.recurrence_pattern,
    next_occurrence_at: nextOccurrence.toISOString(),
    parent_project_id: p.id,
    auto_invoice: p.auto_invoice,
  }).select('id').single();
  if (npErr) return { ok: false as const, error: npErr.message };

  // Mark the OLD project as delivered and advance its next_occurrence_at
  // (so the dashboard doesn't keep saying it's due)
  await supabase.from('projects').update({
    status: 'delivered',
    next_occurrence_at: nextOccurrence.toISOString(),
  }).eq('id', p.id);

  // Log it
  await supabase.from('activity_log').insert({
    user_id: user?.id ?? null,
    action: 'recurring_renewed',
    entity_type: 'project',
    entity_id: newProj.id,
    details: { parent_id: p.id, pattern: p.recurrence_pattern },
  });

  // Auto-invoice?
  let invoiceId: string | null = null;
  if (p.auto_invoice) {
    // Use the existing generateInvoiceFromProject — but the new project has no time entries yet
    // So we fall back to createInvoice with a single line item for the budget amount
    if (p.budget_amount && p.budget_amount > 0) {
      const monthShort = now.toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' });
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 30);
      const r = await import('@/lib/invoices/actions').then((m) =>
        m.createInvoice({
          client_id: p.client_id,
          template_id: '',
          project_id: newProj.id,
          issue_date: now.toISOString().slice(0, 10),
          due_date: dueDate.toISOString().slice(0, 10),
          currency: p.currency,
          vat_rate: '15',
          status: 'draft',
          notes: `فاتورة دورية شهرية — ${monthShort}`,
          data: JSON.stringify({ source: 'recurring_renewal', parent_project_id: p.id }),
          client_snapshot: '{}',
          line_items_json: JSON.stringify([{
            description: `رسوم الصيانة الشهرية — ${monthShort}`,
            quantity: 1,
            unit_price: Number(p.budget_amount),
            taxable: true,
          }]),
        })
      );
      if (r.ok) invoiceId = r.id;
    }
  }

  revalidatePath('/admin', 'layout');
  return { ok: true as const, projectId: newProj.id, invoiceId };
}

/**
 * Process all recurring projects that are due (next_occurrence_at <= now or null).
 * Used by the dashboard "Process all due" button and the cron API route.
 */
export async function processAllDueRecurring() {
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };

  const { data: due, error } = await supabase
    .from('projects')
    .select('id')
    .eq('is_recurring', true)
    .or('next_occurrence_at.is.null,next_occurrence_at.lte.' + new Date().toISOString());

  if (error) return { ok: false as const, error: error.message };
  const ids = (due ?? []).map((r) => (r as { id: string }).id);

  const results: Array<{ projectId: string; ok: boolean; newProjectId?: string; error?: string }> = [];
  for (const id of ids) {
    const r = await processRecurring(id, { force: false });
    if (r.ok) results.push({ projectId: id, ok: true, newProjectId: r.projectId });
    else results.push({ projectId: id, ok: false, error: r.error });
  }

  revalidatePath('/admin', 'layout');
  return { ok: true as const, processed: results.length, results };
}

/** Count of recurring projects currently due. Used by the dashboard widget. */
export async function countDueRecurring(): Promise<number> {
  const supabase = await createClient();
  if (!supabase) return 0;
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('is_recurring', true)
    .or('next_occurrence_at.is.null,next_occurrence_at.lte.' + new Date().toISOString());
  return count ?? 0;
}
