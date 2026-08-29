'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const querySchema = z.string().min(1).max(200);

export type ClientSuggestion = {
  id: string;
  name: string;
  company: string | null;
  vat_number: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
};

/**
 * Search clients by name (or company). Returns up to `limit` matches.
 * Case-insensitive substring match. Ordered by most-recently-created.
 */
export async function searchRecentClients(rawQuery: string, limit = 5): Promise<ClientSuggestion[]> {
  const query = querySchema.safeParse(rawQuery);
  if (!query.success) return [];
  const supabase = await createClient();
  if (!supabase) return [];

  const q = query.data.trim();
  if (!q) {
    // No query: return most recently created clients
    const { data } = await supabase
      .from('clients')
      .select('id, name, company, vat_number, address, email, phone')
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []) as unknown as ClientSuggestion[];
  }

  // Escape % and _ for ilike
  const safe = q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  const pattern = `%${safe}%`;

  // Two parallel queries: name match OR company match
  const [nameRes, companyRes] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, company, vat_number, address, email, phone')
      .ilike('name', pattern)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('clients')
      .select('id, name, company, vat_number, address, email, phone')
      .ilike('company', pattern)
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  // Merge + dedupe by id
  const byId = new Map<string, ClientSuggestion>();
  for (const r of (nameRes.data ?? []) as unknown as ClientSuggestion[]) byId.set(r.id, r);
  for (const r of (companyRes.data ?? []) as unknown as ClientSuggestion[]) byId.set(r.id, r);

  return Array.from(byId.values()).slice(0, limit);
}
