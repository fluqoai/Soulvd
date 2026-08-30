'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { renderDocumentPdf, computeTotals } from '@/lib/pdf/render';
import { BRAND } from '@/lib/pdf/branding';
import type { DocumentKind, DocumentData, LineItem } from '@/lib/pdf/types';

const lineItemSchema = z.object({
  description: z.string().min(1, 'وصف البند مطلوب'),
  quantity: z.number().positive('الكمية يجب أن تكون أكبر من صفر'),
  unit_price: z.number().nonnegative('السعر لا يمكن أن يكون سالباً'),
});

const inputSchema = z.object({
  kind: z.enum(['invoice', 'quote']),
  save: z.boolean(),
  number: z.string().min(1, 'رقم المستند مطلوب').max(50),
  issue_date: z.string().min(1, 'تاريخ الإصدار مطلوب'),
  valid_until: z.string().optional(),
  client: z.object({
    name: z.string().min(1, 'اسم العميل مطلوب'),
    company: z.string().nullable().optional(),
    vat_number: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
  }),
  line_items: z.array(lineItemSchema).min(1, 'بند واحد على الأقل مطلوب'),
  vat_rate: z.number().min(0).max(100),
  notes: z.string().nullable().optional(),
  default_client_id: z.string().uuid().optional(),
});

export type GenerateInput = z.infer<typeof inputSchema>;

/**
 * Build the DocumentData object from input.
 * Server-side only — uses BRAND constants and computes totals.
 */
function buildDocumentData(input: GenerateInput): DocumentData {
  const items: LineItem[] = input.line_items.map((it) => ({
    description: it.description,
    quantity: it.quantity,
    unit_price: it.unit_price,
  }));
  const { subtotal, vatAmount, total } = computeTotals(items, input.vat_rate, 'SAR');
  return {
    kind: input.kind,
    brand: {
      nameAr: BRAND.nameAr,
      nameEn: BRAND.nameEn,
      taglineAr: BRAND.taglineAr,
      taglineEn: BRAND.taglineEn,
      cr: BRAND.cr,
      vat: BRAND.vat,
      address: BRAND.addressAr,
      email: BRAND.email,
      phone: BRAND.phone,
      website: BRAND.website,
    },
    number: input.number,
    issue_date: input.issue_date,
    valid_until: input.valid_until,
    client: {
      name: input.client.name,
      company: input.client.company ?? null,
      vat_number: input.client.vat_number ?? null,
      address: input.client.address ?? null,
      email: input.client.email ?? null,
      phone: input.client.phone ?? null,
    },
    line_items: items,
    subtotal,
    vat_rate: input.vat_rate,
    vat_amount: vatAmount,
    total,
    notes: input.notes ?? null,
    currency: 'SAR',
  };
}

/** Generate the next number if the user left it empty (very rare — we already require it). */
async function nextDocumentNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kind: DocumentKind
): Promise<string> {
  const y = new Date().getFullYear();
  const prefix = kind === 'invoice' ? 'INV' : 'QT';
  const { count } = await supabase!
    .from(kind === 'invoice' ? 'invoices' : 'quotes')
    .select('*', { count: 'exact', head: true })
    .like('number', `${prefix}-${y}-%`);
  const next = (count ?? 0) + 1;
  return `${prefix}-${y}-${String(next).padStart(3, '0')}`;
}

/**
 * Generate a PDF from form data, upload to storage, and optionally save
 * the document to the invoices / quotes table.
 */
export async function generateAndSaveDocument(input: GenerateInput) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'invalid' };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };

  // Resolve the client_id (if a saved client was selected) or look it up
  let clientId: string | null = input.default_client_id ?? null;
  if (!clientId && parsed.data.client.name) {
    // Try to find a matching client by name
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('name', parsed.data.client.name)
      .maybeSingle();
    if (existing) clientId = (existing as { id: string }).id;
  }

  const data = buildDocumentData(parsed.data);

  // 1. Render PDF
  let pdfBuf: Buffer;
  try {
    pdfBuf = await renderDocumentPdf(data);
  } catch (err) {
    return { ok: false as const, error: `PDF render failed: ${(err as Error).message}` };
  }

  // 2. Upload to documents bucket
  const safeNumber = data.number.replace(/[^A-Z0-9-]/gi, '_');
  const path = `${data.kind === 'invoice' ? 'invoices' : 'quotes'}/${safeNumber}.pdf`;
  const { error: upErr } = await supabase.storage
    .from('documents')
    .upload(path, pdfBuf, { contentType: 'application/pdf', upsert: true });
  if (upErr) return { ok: false as const, error: upErr.message };

  const { data: pub } = supabase.storage.from('documents').getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  // 3. Optionally save to DB.
  // Invoices go to `invoices`, quotes go to `quotes`. They have nearly identical
  // schemas but `quotes.valid_until` replaces `invoices.due_date`, so we build
  // the row per kind. (Bug fix: previously everything was written to `invoices`,
  // which made the `number` unique index collide between the two and silently
  // swallowed the failure as `ok: true` with a warning.)
  let savedId: string | undefined;
  if (input.save) {
    const { data: { user } } = await supabase.auth.getUser();
    const snapshot = {
      name: data.client.name,
      company: data.client.company ?? undefined,
      vat_number: data.client.vat_number ?? undefined,
      address: data.client.address ?? undefined,
      email: data.client.email ?? undefined,
      phone: data.client.phone ?? undefined,
    };
    const dataBlob = {
      line_items: data.line_items,
      valid_until: data.valid_until ?? null,
    };
    // Common columns for both tables.
    const baseRow = {
      number: data.number,
      client_id: clientId,
      client_snapshot: snapshot,
      data: dataBlob,
      subtotal: data.subtotal,
      vat_rate: data.vat_rate,
      vat_amount: data.vat_amount,
      total: data.total,
      currency: data.currency,
      status: 'draft' as const,
      issue_date: data.issue_date,
      notes: data.notes,
      created_by: user?.id ?? null,
      generated_pdf_path: publicUrl,
    };
    // invoices has `due_date`; quotes has `valid_until`. `data.valid_until`
    // is what the PDF generator and the .docx template engine read, so we
    // write it to the right column per kind. The two branches are kept
    // separate (instead of a `from(table).insert(row)` union) so the
    // generated Supabase types narrow correctly and we don't get
    // "Property 'valid_until' is missing in type '{ due_date: ... }'".
    let inserted: { id: string } | null = null;
    let insErr: { message: string } | null = null;
    const tableLabel =
      data.kind === 'quote' ? 'جدول عروض الأسعار' : 'جدول الفواتير';
    const failureMessage = (rawMessage: string) =>
      `تم توليد ملف الـ PDF وحفظه في التخزين، لكن تعذّر حفظ السجل في ${tableLabel}: ${rawMessage}`;

    if (data.kind === 'quote') {
      const quoteRow = { ...baseRow, valid_until: data.valid_until ?? null };
      const r = await supabase
        .from('quotes')
        .insert(quoteRow)
        .select('id')
        .single();
      inserted = r.data as { id: string } | null;
      insErr = r.error;
    } else {
      const invoiceRow = { ...baseRow, due_date: data.valid_until ?? null };
      const r = await supabase
        .from('invoices')
        .insert(invoiceRow)
        .select('id')
        .single();
      inserted = r.data as { id: string } | null;
      insErr = r.error;
    }

    if (insErr || !inserted) {
      // The PDF is already uploaded, so we surface the URL to the caller so
      // the user can still download it — but we explicitly fail the action.
      // The form must show this as an error, not a success.
      const message = insErr?.message ?? 'unknown_db_error';
      const tableName = data.kind === 'quote' ? 'quotes' : 'invoices';
      console.error(`[generateAndSaveDocument] ${tableName} insert failed:`, message);
      return {
        ok: false as const,
        error: failureMessage(message),
        publicUrl,
      };
    }
    savedId = inserted.id;

    // Best-effort audit log. The activity_log table currently only has a
    // SELECT policy, so this insert may be dropped by RLS — that's fine, we
    // don't want a logging gap to break the whole save flow. Once the
    // INSERT policy is added (see migration 0006), these events will persist.
    try {
      await supabase.from('activity_log').insert({
        user_id: user?.id ?? null,
        action: data.kind === 'invoice' ? 'invoice_generated' : 'quote_generated',
        entity_type: data.kind,
        entity_id: savedId,
        details: { number: data.number, total: data.total, source: 'document_form' },
      });
    } catch (logErr) {
      console.warn('[generateAndSaveDocument] activity_log insert failed:', logErr);
    }
  }

  revalidatePath('/admin', 'layout');
  return { ok: true as const, publicUrl, savedId };
}

export { nextDocumentNumber };
