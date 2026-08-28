'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from '@/i18n/routing';
import { Plus, Trash2, Save } from 'lucide-react';
import { Field, TextInput, Textarea, Select } from '@/components/admin/Field';
import { Button } from '@/components/ui/Button';
import { createInvoice, updateInvoice, type InvoiceStatus, type LineItem } from '@/lib/invoices/actions';

type Client = { id: string; name: string; company: string | null; status: string };
type Project = { id: string; name: string; client_id: string; status: string };
type Template = { id: string; name: string; type: string };

const STATUSES: Array<{ value: InvoiceStatus; label: string }> = [
  { value: 'draft',     label: 'مسودة' },
  { value: 'sent',      label: 'مُرسلة' },
  { value: 'paid',      label: 'مدفوعة' },
  { value: 'overdue',   label: 'متأخرة' },
  { value: 'cancelled', label: 'ملغاة' },
];

const newItem = (): LineItem => ({ description: '', quantity: 1, unit_price: 0, taxable: true });

export function InvoiceForm({
  mode,
  invoice,
  clients,
  projects,
  templates,
  defaultClientId,
  defaultProjectId,
}: {
  mode: 'create' | 'edit';
  invoice?: {
    id: string;
    number: string;
    client_id: string | null;
    project_id: string | null;
    template_id: string | null;
    currency: string;
    vat_rate: number | null;
    status: InvoiceStatus;
    issue_date: string;
    due_date: string | null;
    notes: string | null;
    data: { line_items?: LineItem[] };
    client_snapshot: { name?: string };
  };
  clients: Client[];
  projects: Project[];
  templates: Template[];
  defaultClientId?: string;
  defaultProjectId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const inv = invoice;
  const initialItems: LineItem[] = inv?.data?.line_items?.length ? inv.data.line_items : [newItem()];

  const [clientId, setClientId] = useState<string>(inv?.client_id ?? defaultClientId ?? '');
  const [projectId, setProjectId] = useState<string>(inv?.project_id ?? defaultProjectId ?? '');
  const [templateId, setTemplateId] = useState<string>(inv?.template_id ?? '');
  const [issueDate, setIssueDate] = useState<string>(inv?.issue_date ?? new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string>(inv?.due_date ?? '');
  const [currency, setCurrency] = useState<string>(inv?.currency ?? 'SAR');
  const [vatRate, setVatRate] = useState<string>(String(inv?.vat_rate ?? 15));
  const [status, setStatus] = useState<InvoiceStatus>(inv?.status ?? 'draft');
  const [notes, setNotes] = useState<string>(inv?.notes ?? '');
  const [items, setItems] = useState<LineItem[]>(initialItems);

  const filteredProjects = useMemo(
    () => projects.filter((p) => !clientId || p.client_id === clientId),
    [projects, clientId]
  );
  const invoiceTemplates = useMemo(
    () => templates.filter((t) => t.type === 'invoice'),
    [templates]
  );

  const computed = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
    const taxableBase = items.filter((it) => it.taxable).reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
    const vatAmount = Math.round(taxableBase * (Number(vatRate) / 100) * 100) / 100;
    const total = Math.round((subtotal + vatAmount) * 100) / 100;
    return { subtotal: Math.round(subtotal * 100) / 100, vatAmount, total };
  }, [items, vatRate]);

  const formatSAR = (n: number) =>
    new Intl.NumberFormat('ar-SA', { style: 'currency', currency: currency || 'SAR', maximumFractionDigits: 2 }).format(n);

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const removeItem = (idx: number) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  };
  const addItem = () => setItems((prev) => [...prev, newItem()]);

  const submit = (fd: FormData) => {
    const payload = {
      client_id: clientId,
      template_id: templateId,
      project_id: projectId,
      issue_date: issueDate,
      due_date: dueDate,
      currency,
      vat_rate: vatRate,
      status,
      notes,
      data: JSON.stringify({}),
      client_snapshot: JSON.stringify({}),
      line_items_json: JSON.stringify(items),
    };
    startTransition(async () => {
      const r = mode === 'create' ? await createInvoice(payload) : await updateInvoice(inv!.id, payload);
      if (!r.ok) {
        alert(r.error);
        return;
      }
      const id = mode === 'create' && 'id' in r ? (r as { id: string }).id : inv!.id;
      router.push(`/admin/invoices/${id}`);
    });
  };

  return (
    <form action={submit} className="space-y-6 max-w-4xl">
      {/* Header info */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="العميل" required>
          <Select value={clientId} onChange={(e) => { setClientId(e.target.value); setProjectId(''); }} required>
            <option value="">— اختر عميلاً —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
            ))}
          </Select>
        </Field>
        <Field label="المشروع" hint="اختياري — لربط الفاتورة بمشروع">
          <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={!clientId}>
            <option value="">— لا يوجد —</option>
            {filteredProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="القالب" hint="يستخدم لتوليد .docx">
          <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">— لا قالب —</option>
            {invoiceTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="تاريخ الإصدار" required>
          <TextInput type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
        </Field>
        <Field label="تاريخ الاستحقاق" hint="اختياري">
          <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <Field label="العملة">
          <TextInput value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={8} />
        </Field>
        <Field label="نسبة ضريبة القيمة المضافة (%)" hint="15% في السعودية">
          <TextInput
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            max="100"
            value={vatRate}
            onChange={(e) => setVatRate(e.target.value)}
          />
        </Field>
      </div>

      {/* Line items */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-ink-800">البنود</h3>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 text-xs text-sage-700 hover:text-sage-800"
          >
            <Plus className="size-3.5" /> بند جديد
          </button>
        </div>
        <div className="rounded-xl border border-ink-900/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-linen-50/60 text-xs text-ink-600 uppercase tracking-wider">
              <tr>
                <th className="text-start font-medium px-3 py-2">الوصف</th>
                <th className="text-end font-medium px-2 py-2 w-24">الكمية</th>
                <th className="text-end font-medium px-2 py-2 w-32">السعر</th>
                <th className="text-end font-medium px-2 py-2 w-28">الإجمالي</th>
                <th className="text-center font-medium px-2 py-2 w-20">خاضع</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-900/5">
              {items.map((it, idx) => {
                const lineTotal = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
                return (
                  <tr key={idx}>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={it.description}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                        placeholder="وصف البند"
                        className="w-full rounded-md border border-ink-900/15 bg-paper px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-600/30 focus:border-sage-600"
                        required
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.25"
                        min="0"
                        value={it.quantity}
                        onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                        className="w-full rounded-md border border-ink-900/15 bg-paper px-2 py-1.5 text-sm text-end tabular-nums focus:outline-none focus:ring-2 focus:ring-sage-600/30 focus:border-sage-600"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={it.unit_price}
                        onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })}
                        className="w-full rounded-md border border-ink-900/15 bg-paper px-2 py-1.5 text-sm text-end tabular-nums focus:outline-none focus:ring-2 focus:ring-sage-600/30 focus:border-sage-600"
                      />
                    </td>
                    <td className="px-2 py-2 text-end text-ink-900 font-semibold tabular-nums" dir="ltr">
                      {lineTotal.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={it.taxable}
                        onChange={(e) => updateItem(idx, { taxable: e.target.checked })}
                        className="size-4 rounded border-ink-900/20 text-sage-600 focus:ring-sage-600/30"
                      />
                    </td>
                    <td className="px-2 py-2">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-ink-400 hover:text-red-600 p-1"
                          title="حذف البند"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Totals */}
      <div className="rounded-xl bg-linen-50/40 border border-ink-900/5 p-4 grid gap-2 sm:grid-cols-3 text-sm">
        <div>
          <p className="text-xs text-ink-600">الإجمالي قبل الضريبة</p>
          <p className="text-base font-semibold text-ink-900 tabular-nums" dir="ltr">{formatSAR(computed.subtotal)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-600">ضريبة القيمة المضافة ({vatRate || 0}%)</p>
          <p className="text-base font-semibold text-ink-900 tabular-nums" dir="ltr">{formatSAR(computed.vatAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-sage-700 font-semibold">الإجمالي شامل الضريبة</p>
          <p className="text-lg font-bold text-sage-700 tabular-nums" dir="ltr">{formatSAR(computed.total)}</p>
        </div>
      </div>

      <Field label="ملاحظات" hint="تظهر في أسفل الفاتورة">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </Field>

      {mode === 'edit' && (
        <Field label="الحالة">
          <Select value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </Field>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || !clientId || !issueDate || items.length === 0}>
          <Save className="size-4" /> {isPending ? 'جاري الحفظ…' : mode === 'create' ? 'إنشاء الفاتورة' : 'حفظ التغييرات'}
        </Button>
        <button
          type="button"
          onClick={() => router.push('/admin/invoices')}
          className="text-sm text-ink-600 hover:text-ink-800"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
