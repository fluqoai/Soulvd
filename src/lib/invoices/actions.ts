'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const;
const statusSchema = z.enum(STATUSES);

// line_items: array of {description, quantity, unit_price, taxable}
const lineItemSchema = z.object({
  description: z.string().min(1, 'الوصف مطلوب').max(500),
  quantity: z.number().positive('الكمية يجب أن تكون أكبر من صفر'),
  unit_price: z.number().nonnegative('السعر لا يمكن أن يكون سالباً'),
  taxable: z.boolean().default(true),
});

const invoiceSchema = z.object({
  client_id: z.string().uuid('معرّف العميل غير صالح'),
  template_id: z.string().uuid().optional().or(z.literal('')),
  project_id: z.string().uuid().optional().or(z.literal('')),
  issue_date: z.string().min(1, 'تاريخ الإصدار مطلوب'),
  due_date: z.string().optional().default(''),
  currency: z.string().max(8).default('SAR'),
  vat_rate: z.string().default('15'),   // percent as string
  status: statusSchema.default('draft'),
  notes: z.string().max(2000).optional().default(''),
  data: z.string().default('{}'),         // JSON-stringified data blob
  client_snapshot: z.string().default('{}'),
  // Line items come as JSON array
  line_items_json: z.string().default('[]'),
});

export type InvoiceStatus = (typeof STATUSES)[number];
export type LineItem = z.infer<typeof lineItemSchema>;

export type Invoice = {
  id: string;
  number: string;
  template_id: string | null;
  client_id: string | null;
  project_id: string | null;
  client_snapshot: { name?: string; email?: string; phone?: string; vat_number?: string; address?: string };
  data: Record<string, unknown>;
  subtotal: number | null;
  vat_rate: number | null;
  vat_amount: number | null;
  total: number | null;
  currency: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  generated_docx_path: string | null;
  generated_pdf_path: string | null;
  created_at: string;
  updated_at: string;
  // joined
  client_name?: string | null;
  project_name?: string | null;
};

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft:     'مسودة',
  sent:      'مُرسلة',
  paid:      'مدفوعة',
  overdue:   'متأخرة',
  cancelled: 'ملغاة',
};

/** Recompute subtotal/VAT/total from a list of line items. */
function computeTotals(items: LineItem[], vatRate: number) {
  const subtotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const taxableBase = items.filter((it) => it.taxable).reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const vatAmount = Math.round(taxableBase * (vatRate / 100) * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;
  return { subtotal: Math.round(subtotal * 100) / 100, vatAmount, total };
}

/** Generate the next invoice number: INV-YYYY-NNN */
async function nextInvoiceNumber(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase!
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .like('number', `INV-${year}-%`);
  const next = (count ?? 0) + 1;
  return `INV-${year}-${String(next).padStart(3, '0')}`;
}

function safeParseItems(json: string): LineItem[] {
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is LineItem =>
      typeof x === 'object' && x !== null && typeof x.description === 'string'
    ).map((x) => ({
      description: String(x.description),
      quantity: Number(x.quantity) || 0,
      unit_price: Number(x.unit_price) || 0,
      taxable: x.taxable !== false,
    }));
  } catch {
    return [];
  }
}

export async function createInvoice(input: z.infer<typeof invoiceSchema>) {
  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'invalid' };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };

  const items = safeParseItems(parsed.data.line_items_json);
  const vatRate = Number(parsed.data.vat_rate) || 0;
  const { subtotal, vatAmount, total } = computeTotals(items, vatRate);

  // Build the data blob (what the template engine will read)
  const dataBlob = {
    ...(JSON.parse(parsed.data.data || '{}') as Record<string, unknown>),
    line_items: items,
    subtotal,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    total,
  };

  // Fetch client for snapshot
  const { data: client } = await supabase
    .from('clients')
    .select('id, name, email, phone, company, vat_number, address')
    .eq('id', parsed.data.client_id)
    .maybeSingle();
  const clientRow = client as { name: string; email: string | null; phone: string | null; company: string | null; vat_number: string | null; address: string | null } | null;
  const snapshot = clientRow
    ? {
        name: clientRow.name,
        email: clientRow.email ?? undefined,
        phone: clientRow.phone ?? undefined,
        company: clientRow.company ?? undefined,
        vat_number: clientRow.vat_number ?? undefined,
        address: clientRow.address ?? undefined,
      }
    : JSON.parse(parsed.data.client_snapshot || '{}');

  const number = await nextInvoiceNumber(supabase);
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase.from('invoices').insert({
    number,
    template_id: parsed.data.template_id || null,
    client_id: parsed.data.client_id,
    project_id: parsed.data.project_id || null,
    client_snapshot: snapshot,
    data: dataBlob,
    subtotal,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    total,
    currency: parsed.data.currency,
    status: parsed.data.status,
    issue_date: parsed.data.issue_date,
    due_date: parsed.data.due_date || null,
    notes: parsed.data.notes || null,
    created_by: user?.id ?? null,
  }).select('id').single();
  if (error) return { ok: false as const, error: error.message };

  await supabase.from('activity_log').insert({
    user_id: user?.id ?? null,
    action: 'invoice_created',
    entity_type: 'invoice',
    entity_id: data.id,
    details: { number, total, project_id: parsed.data.project_id || null },
  });

  revalidatePath('/admin', 'layout');
  return { ok: true as const, id: data.id, number };
}

export async function updateInvoice(id: string, input: z.infer<typeof invoiceSchema>) {
  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'invalid' };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };

  const items = safeParseItems(parsed.data.line_items_json);
  const vatRate = Number(parsed.data.vat_rate) || 0;
  const { subtotal, vatAmount, total } = computeTotals(items, vatRate);

  const dataBlob = {
    ...(JSON.parse(parsed.data.data || '{}') as Record<string, unknown>),
    line_items: items,
    subtotal,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    total,
  };

  const { error } = await supabase.from('invoices').update({
    template_id: parsed.data.template_id || null,
    client_id: parsed.data.client_id,
    project_id: parsed.data.project_id || null,
    client_snapshot: JSON.parse(parsed.data.client_snapshot || '{}'),
    data: dataBlob,
    subtotal,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    total,
    currency: parsed.data.currency,
    status: parsed.data.status,
    issue_date: parsed.data.issue_date,
    due_date: parsed.data.due_date || null,
    notes: parsed.data.notes || null,
  }).eq('id', id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}

export async function setInvoiceStatus(id: string, status: string) {
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false as const, error: 'invalid_status' };
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };
  const { error } = await supabase.from('invoices').update({ status: parsed.data }).eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}

export async function deleteInvoice(id: string) {
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}

// ============================================================
//  .docx generation
// ============================================================

import { fillDocxTemplate, numberToArabicWords } from '@/lib/docx/generate';

const STATUS_TO_DROPDOWN: Record<InvoiceStatus, string> = {
  draft:     'unpaid',
  sent:      'unpaid',
  overdue:   'unpaid',
  cancelled: 'unpaid',
  paid:      'paid',
};

const STATUS_DISPLAY_AR: Record<InvoiceStatus, string> = {
  draft:     'مسودة',
  sent:      'مُرسلة',
  paid:      'مدفوعة',
  overdue:   'متأخرة',
  cancelled: 'ملغاة',
};

/**
 * Generate a filled .docx for an invoice using the assigned template.
 *  - Reads the template from the `templates` storage bucket
 *  - Fills each SDT placeholder with the corresponding invoice field value
 *  - Uploads the result to the `documents` bucket
 *  - Updates invoices.generated_docx_path
 *
 * Supports up to 3 line items (the tax-invoice template has 3 slots).
 * If the invoice has more, a warning is returned but the file is still
 * generated with the first 3.
 */
export async function generateInvoiceDocx(invoiceId: string) {
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };

  // Fetch the invoice
  const { data: inv, error: invErr } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle();
  if (invErr) return { ok: false as const, error: invErr.message };
  if (!inv) return { ok: false as const, error: 'invoice_not_found' };

  const invRow = inv as unknown as {
    id: string;
    number: string;
    template_id: string | null;
    client_id: string | null;
    client_snapshot: { name?: string; email?: string; phone?: string; vat_number?: string; address?: string; company?: string };
    data: { line_items?: LineItem[] };
    subtotal: number | null;
    vat_rate: number | null;
    vat_amount: number | null;
    total: number | null;
    currency: string;
    status: InvoiceStatus;
    issue_date: string;
    due_date: string | null;
  };

  if (!invRow.template_id) {
    return { ok: false as const, error: 'no_template_assigned' };
  }

  // Fetch the template row to get file_path
  const { data: tpl, error: tplErr } = await supabase
    .from('templates')
    .select('id, name, type, file_path')
    .eq('id', invRow.template_id)
    .maybeSingle();
  if (tplErr) return { ok: false as const, error: tplErr.message };
  if (!tpl) return { ok: false as const, error: 'template_not_found' };
  const tplRow = tpl as { name: string; type: string; file_path: string };

  // Download the .docx template from storage
  const { data: tplBlob, error: dlErr } = await supabase.storage
    .from('templates')
    .download(tplRow.file_path);
  if (dlErr || !tplBlob) return { ok: false as const, error: dlErr?.message ?? 'template_download_failed' };

  const tplBytes = new Uint8Array(await tplBlob.arrayBuffer());

  // Build the data map
  const lineItems = invRow.data?.line_items ?? [];
  const fmt = (n: number | null) =>
    n == null ? '' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  const fmtDate = (d: string | null) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return d; }
  };

  const warning =
    lineItems.length > 3
      ? `الفاتورة بها ${lineItems.length} بنود، لكن قالب "${tplRow.name}" يدعم 3 فقط. البنود الزائدة لم تُدرج.`
      : null;

  // Drop-down display values must be in the listItem set, or Word will
  // fall back to the first item. The tax-invoice template has:
  //   PAYMENT_STATUS: unpaid / part_paid / paid
  //   BANK_ACCOUNT:   we use a static value from a const (the .docx lists
  //                   "SNB" / "NCB" / "Rajhi" as the 3 options)
  const data: Record<string, string> = {
    CLIENT_NAME: invRow.client_snapshot?.name ?? '',
    CLIENT_VAT_NO: invRow.client_snapshot?.vat_number ?? '',
    INVOICE_NUMBER: invRow.number,
    ISSUE_DATE: fmtDate(invRow.issue_date),
    DUE_DATE: fmtDate(invRow.due_date),

    ITEM_1_DESC: lineItems[0]?.description ?? '',
    ITEM_1_PRICE: fmt(Number(lineItems[0]?.unit_price ?? 0)),
    ITEM_1_VAT: fmt(Number(lineItems[0]?.unit_price ?? 0) * (Number(invRow.vat_rate ?? 0) / 100)),
    ITEM_1_TOTAL: fmt(Number(lineItems[0]?.quantity ?? 0) * Number(lineItems[0]?.unit_price ?? 0)),

    ITEM_2_DESC: lineItems[1]?.description ?? '',
    ITEM_2_PRICE: fmt(Number(lineItems[1]?.unit_price ?? 0)),
    ITEM_2_VAT: fmt(Number(lineItems[1]?.unit_price ?? 0) * (Number(invRow.vat_rate ?? 0) / 100)),
    ITEM_2_TOTAL: fmt(Number(lineItems[1]?.quantity ?? 0) * Number(lineItems[1]?.unit_price ?? 0)),

    ITEM_3_DESC: lineItems[2]?.description ?? '',
    ITEM_3_PRICE: fmt(Number(lineItems[2]?.unit_price ?? 0)),
    ITEM_3_VAT: fmt(Number(lineItems[2]?.unit_price ?? 0) * (Number(invRow.vat_rate ?? 0) / 100)),
    ITEM_3_TOTAL: fmt(Number(lineItems[2]?.quantity ?? 0) * Number(lineItems[2]?.unit_price ?? 0)),

    TOTAL_TAXABLE: fmt(invRow.subtotal),
    TOTAL_VAT: fmt(invRow.vat_amount),
    GRAND_TOTAL: fmt(invRow.total),
    AMOUNT_IN_WORDS: numberToArabicWords(Number(invRow.total ?? 0), invRow.currency === 'SAR' ? 'ريال سعودي' : invRow.currency),

    // Drop-downs — we pass the Arabic display text, but the .docx listItem
    // values are English codes. We pass the CODE so Word picks the right
    // entry from the drop-down list.
    PAYMENT_STATUS: STATUS_TO_DROPDOWN[invRow.status],
    BANK_ACCOUNT: 'SNB', // Default — user can change in Word
  };

  // Fill the template
  const outBytes = fillDocxTemplate(tplBytes, data);

  // Upload to the documents bucket
  const path = `invoices/${invRow.number.replace(/[^A-Z0-9-]/gi, '_')}.docx`;
  const { error: upErr } = await supabase.storage
    .from('documents')
    .upload(path, outBytes, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    });
  if (upErr) return { ok: false as const, error: upErr.message };

  // Get a public URL (documents bucket is public)
  const { data: pub } = supabase.storage.from('documents').getPublicUrl(path);

  // Update the invoice row
  await supabase.from('invoices').update({
    generated_docx_path: pub.publicUrl,
  }).eq('id', invoiceId);

  revalidatePath('/admin', 'layout');
  return { ok: true as const, path: pub.publicUrl, warning };
}

/**
 * Build a draft invoice from a project's billable time entries.
 * The user lands on /admin/invoices/[new id] with line items pre-filled.
 */
export async function generateInvoiceFromProject(
  projectId: string,
  options: { template_id?: string; issue_date?: string; due_date?: string; vat_rate?: number } = {}
) {
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };

  const { data: project, error: pErr } = await supabase
    .from('projects')
    .select('id, name, client_id, currency')
    .eq('id', projectId)
    .maybeSingle();
  if (pErr) return { ok: false as const, error: pErr.message };
  if (!project) return { ok: false as const, error: 'project_not_found' };
  const proj = project as { id: string; name: string; client_id: string; currency: string };

  // Only billable time entries with a rate
  const { data: entries, error: tErr } = await supabase
    .from('time_entries')
    .select('id, entry_date, hours, description, hourly_rate')
    .eq('project_id', projectId)
    .eq('billable', true)
    .not('hourly_rate', 'is', null)
    .order('entry_date', { ascending: true });
  if (tErr) return { ok: false as const, error: tErr.message };

  const billable = (entries ?? []) as Array<{ id: string; entry_date: string; hours: number; description: string | null; hourly_rate: number | null }>;
  if (billable.length === 0) {
    return { ok: false as const, error: 'no_billable_time' };
  }

  // Each entry → one line item
  const items: LineItem[] = billable.map((e) => {
    const dateStr = new Date(e.entry_date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
    return {
      description: e.description?.trim() || `عمل ${dateStr}`,
      quantity: Number(e.hours),
      unit_price: Number(e.hourly_rate || 0),
      taxable: true,
    };
  });

  // Use createInvoice for the actual write (it does the snapshot + totals + numbering)
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(); due.setDate(due.getDate() + 30);
  const r = await createInvoice({
    client_id: proj.client_id,
    template_id: options.template_id ?? '',
    project_id: proj.id,
    issue_date: options.issue_date ?? today,
    due_date: options.due_date ?? due.toISOString().slice(0, 10),
    currency: proj.currency || 'SAR',
    vat_rate: String(options.vat_rate ?? 15),
    status: 'draft',
    notes: `تم توليدها تلقائياً من مشروع: ${proj.name}`,
    data: JSON.stringify({ source: 'project_time', project_id: proj.id, project_name: proj.name }),
    client_snapshot: '{}',
    line_items_json: JSON.stringify(items),
  });

  if (!r.ok) return r;
  revalidatePath('/admin', 'layout');
  return r;
}
