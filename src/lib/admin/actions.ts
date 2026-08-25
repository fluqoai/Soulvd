'use server';

import { revalidatePath } from 'next/cache';
import { createClient as getServerSupabase } from '@/lib/supabase/server';

/**
 * Server-action helpers that back every admin CRUD page.
 * Bilingual text fields arrive as two separate inputs
 * (`<name>.ar` and `<name>.en`); we join them back into
 * `{ar, en}` here before insert/update.
 */

function joinBilingual(fd: FormData, fields: string[]) {
  const out: Record<string, { ar: string; en: string }> = {};
  for (const f of fields) {
    out[f] = {
      ar: String(fd.get(`${f}.ar`) ?? '').trim(),
      en: String(fd.get(`${f}.en`) ?? '').trim(),
    };
  }
  return out;
}

export type CrudResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function createRowWith(
  table: string,
  bilingualFields: string[],
  builder: (
    joined: Record<string, { ar: string; en: string }>,
    formData: FormData
  ) => Record<string, unknown>,
  formData: FormData
): Promise<CrudResult> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'unauthorized' };

  const joined = joinBilingual(formData, bilingualFields);
  const payload = builder(joined, formData);

  const { error } = await supabase.from(table).insert(payload);
  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

export async function updateRowWith(
  table: string,
  id: string,
  bilingualFields: string[],
  builder: (
    joined: Record<string, { ar: string; en: string }>,
    formData: FormData
  ) => Record<string, unknown>,
  formData: FormData
): Promise<CrudResult> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'unauthorized' };

  const joined = joinBilingual(formData, bilingualFields);
  const payload = builder(joined, formData);

  const { error } = await supabase.from(table).update(payload).eq('id', id);
  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

export async function deleteRowWith(
  table: string,
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'unauthorized' };
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

/**
 * Generic reorder by swapping the order_index of two adjacent rows.
 * Returns ok=false if the row is already at the boundary.
 */
export async function reorderRow(
  table: string,
  id: string,
  direction: 'up' | 'down'
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'unauthorized' };

  const { data: rows, error: listErr } = await supabase
    .from(table)
    .select('id, order_index')
    .order('order_index', { ascending: true });

  if (listErr || !rows) return { ok: false, error: listErr?.message ?? 'fetch_failed' };

  type Row = { id: string; order_index: number };
  const typed = rows as unknown as Row[];
  const idx = typed.findIndex((r) => r.id === id);
  if (idx === -1) return { ok: false, error: 'not_found' };

  const swapWith = direction === 'up' ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= typed.length) return { ok: false, error: 'boundary' };

  const a = typed[idx];
  const b = typed[swapWith];
  // Use a temp value beyond the existing range to avoid collisions
  const temp = Math.max(...typed.map((r) => r.order_index)) + 1;
  await supabase.from(table).update({ order_index: temp }).eq('id', a.id);
  await supabase.from(table).update({ order_index: a.order_index }).eq('id', b.id);
  await supabase.from(table).update({ order_index: b.order_index }).eq('id', a.id);

  revalidatePath('/admin', 'layout');
  return { ok: true };
}
