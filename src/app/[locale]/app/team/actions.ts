'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { inviteSeat, type GateResult } from '@/lib/billing/gate';

export async function inviteTeamMember(_previous: GateResult, form: FormData): Promise<GateResult> {
  const parsed = z.object({ email: z.string().trim().email().max(254), role: z.enum(['admin', 'agent']) }).safeParse({ email: form.get('email'), role: form.get('role') });
  if (!parsed.success) return { allowed: false, code: 'INVALID_INPUT' };
  const result = await inviteSeat(parsed.data.email, parsed.data.role);
  if (result.allowed) revalidatePath('/[locale]/app', 'layout');
  return result;
}
