'use client';

import { useState, useTransition, useMemo, useEffect, useRef } from 'react';
import { useRouter } from '@/i18n/routing';
import { Save, FileDown, Loader2, AlertCircle, CheckCircle2, Plus, Trash2, Download, Mail, MessageCircle, History, X } from 'lucide-react';
import { Field, TextInput, Textarea } from '@/components/admin/Field';
import { Button } from '@/components/ui/Button';
import { generateAndSaveDocument } from '@/lib/pdf/actions';
import { sendDocumentEmail } from '@/lib/pdf/email';
import { buildWhatsAppLink, normalizePhoneForWaMe } from '@/lib/pdf/whatsapp';
import { searchRecentClients, type ClientSuggestion } from '@/lib/clients/actions';
import type { DocumentKind } from '@/lib/pdf/types';

type LineItem = { description: string; quantity: number; unit_price: number };

const today = () => new Date().toISOString().slice(0, 10);
const inAMonth = () => {
  const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10);
};
const year = new Date().getFullYear();

const newItem = (): LineItem => ({ description: '', quantity: 1, unit_price: 0 });

export function DocumentForm({
  defaultKind = 'invoice',
  defaultNumber,
  defaultClientId,
  prefill,
}: {
  defaultKind?: DocumentKind;
  defaultNumber?: string;
  defaultClientId?: string;
  prefill?: {
    name?: string;
    company?: string;
    vat_number?: string;
    address?: string;
    email?: string;
    phone?: string;
  };
}) {
  const router = useRouter();
  const [kind, setKind] = useState<DocumentKind>(defaultKind);
  const [number, setNumber] = useState<string>(defaultNumber ?? (defaultKind === 'invoice' ? `INV-${year}-` : `QT-${year}-`));
  const [issueDate, setIssueDate] = useState(today());
  const [validUntil, setValidUntil] = useState(inAMonth());

  // Client
  const [clientName, setClientName] = useState(prefill?.name ?? '');
  const [clientCompany, setClientCompany] = useState(prefill?.company ?? '');
  const [clientVat, setClientVat] = useState(prefill?.vat_number ?? '');
  const [clientAddress, setClientAddress] = useState(prefill?.address ?? '');
  const [clientEmail, setClientEmail] = useState(prefill?.email ?? '');
  const [clientPhone, setClientPhone] = useState(prefill?.phone ?? '');

  // Items + totals
  const [items, setItems] = useState<LineItem[]>([newItem()]);
  const [vatRate, setVatRate] = useState('15');
  const [notes, setNotes] = useState('');

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<{ message: string; pdfUrl?: string } | null>(null);
  const [result, setResult] = useState<{ publicUrl: string; savedId?: string; total: number } | null>(null);

  // Email send state
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [emailError, setEmailError] = useState<string | null>(null);

  // Draft autosave state
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recent clients state
  const [recentClients, setRecentClients] = useState<ClientSuggestion[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [searchingClients, setSearchingClients] = useState(false);
  const clientSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-build the wa.me link when result + phone are both present
  const whatsAppLink = useMemo(() => {
    if (!result) return null;
    return buildWhatsAppLink({
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      documentKind: kind,
      documentNumber: number.trim(),
      total: result.total,
      currency: 'SAR',
      publicUrl: result.publicUrl,
      notes,
    });
  }, [result, clientName, clientPhone, kind, number, notes]);

  // ===== Draft autosave =====
  const DRAFT_KEY = `soulvd:draft:document:new:${kind}`;

  // Restore from localStorage on mount (and when kind changes)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as {
        number?: string;
        issue_date?: string;
        valid_until?: string;
        clientName?: string;
        clientCompany?: string;
        clientVat?: string;
        clientAddress?: string;
        clientEmail?: string;
        clientPhone?: string;
        vatRate?: string;
        notes?: string;
        items?: LineItem[];
        savedAt?: number;
      };
      if (d.number) setNumber(d.number);
      if (d.issue_date) setIssueDate(d.issue_date);
      if (d.valid_until) setValidUntil(d.valid_until);
      if (d.clientName != null) setClientName(d.clientName);
      if (d.clientCompany != null) setClientCompany(d.clientCompany);
      if (d.clientVat != null) setClientVat(d.clientVat);
      if (d.clientAddress != null) setClientAddress(d.clientAddress);
      if (d.clientEmail != null) setClientEmail(d.clientEmail);
      if (d.clientPhone != null) setClientPhone(d.clientPhone);
      if (d.vatRate) setVatRate(d.vatRate);
      if (d.notes != null) setNotes(d.notes);
      if (Array.isArray(d.items) && d.items.length > 0) setItems(d.items);
      if (d.savedAt) setDraftSavedAt(d.savedAt);
    } catch {
      // ignore corrupt draft
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  // Debounced save on any field change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      const payload = {
        number, issue_date: issueDate, valid_until: validUntil,
        clientName, clientCompany, clientVat, clientAddress, clientEmail, clientPhone,
        vatRate, notes, items,
        savedAt: Date.now(),
      };
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        setDraftSavedAt(payload.savedAt);
      } catch {
        // ignore quota errors
      }
    }, 500);
    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [number, issueDate, validUntil, clientName, clientCompany, clientVat, clientAddress, clientEmail, clientPhone, vatRate, notes, items, kind]);

  // ===== Recent clients =====
  // Debounced search when name field changes or dropdown opens
  useEffect(() => {
    if (!showClientDropdown) return;
    if (clientSearchTimerRef.current) clearTimeout(clientSearchTimerRef.current);
    setSearchingClients(true);
    clientSearchTimerRef.current = setTimeout(async () => {
      const r = await searchRecentClients(clientName, 5);
      setRecentClients(r);
      setSearchingClients(false);
    }, 200);
    return () => {
      if (clientSearchTimerRef.current) clearTimeout(clientSearchTimerRef.current);
    };
  }, [clientName, showClientDropdown]);

  const pickClient = (c: ClientSuggestion) => {
    setClientName(c.name);
    setClientCompany(c.company ?? '');
    setClientVat(c.vat_number ?? '');
    setClientAddress(c.address ?? '');
    setClientEmail(c.email ?? '');
    setClientPhone(c.phone ?? '');
    setShowClientDropdown(false);
  };

  const clearDraft = () => {
    if (typeof window === 'undefined') return;
    if (typeof window !== 'undefined' && !window.confirm('حذف المسودة المحفوظة؟')) return;
    try {
      window.localStorage.removeItem(DRAFT_KEY);
      setDraftSavedAt(null);
    } catch {}
  };

  // Format "saved X seconds ago" text
  const savedAgoText = useMemo(() => {
    if (!draftSavedAt) return null;
    const sec = Math.floor((Date.now() - draftSavedAt) / 1000);
    if (sec < 5) return 'تم الحفظ للتو';
    if (sec < 60) return `منذ ${sec} ثانية`;
    if (sec < 3600) return `منذ ${Math.floor(sec / 60)} دقيقة`;
    return `منذ ${Math.floor(sec / 3600)} ساعة`;
  }, [draftSavedAt]);

  // Refresh "saved ago" every 10s
  const [, force] = useState(0);
  useEffect(() => {
    if (!draftSavedAt) return;
    const t = setInterval(() => force((n) => n + 1), 10_000);
    return () => clearInterval(t);
  }, [draftSavedAt]);

  // Auto-computed totals (display only — server recomputes)
  const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
  const taxableBase = subtotal;  // all items taxable
  const vatAmount = Math.round(taxableBase * (Number(vatRate) / 100) * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  const fmtSAR = (n: number) =>
    new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  const updateItem = (i: number, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  };
  const removeItem = (i: number) => {
    setItems((prev) => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i));
  };
  const addItem = () => setItems((prev) => [...prev, newItem()]);

  const canSubmit = clientName.trim() && items.some((it) => it.description.trim() && it.quantity > 0);

  const handleSubmit = (save: boolean) => {
    setError(null);
    setResult(null);
    setEmailStatus('idle');
    setEmailError(null);
    startTransition(async () => {
      const r = await generateAndSaveDocument({
        kind,
        save,
        number: number.trim(),
        issue_date: issueDate,
        valid_until: kind === 'quote' ? validUntil : undefined,
        client: {
          name: clientName.trim(),
          company: clientCompany.trim() || null,
          vat_number: clientVat.trim() || null,
          address: clientAddress.trim() || null,
          email: clientEmail.trim() || null,
          phone: clientPhone.trim() || null,
        },
        line_items: items.filter((it) => it.description.trim() && it.quantity > 0).map((it) => ({
          description: it.description.trim(),
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
        })),
        vat_rate: Number(vatRate) || 0,
        notes: notes.trim() || null,
        default_client_id: defaultClientId,
      });

      if (!r.ok) {
        // Action explicitly failed. The PDF may still be in storage (the
        // server uploads before the DB insert) — surface the URL so the
        // user can download it instead of losing the generated document.
        setError({
          message: r.error,
          pdfUrl: 'publicUrl' in r ? r.publicUrl : undefined,
        });
        return;
      }

      // r.ok is true. savedId is only present when save === true AND the DB
      // row was created. If save === true but savedId is missing here, that
      // means the server contract changed without us updating this branch —
      // surface it loudly so the user doesn't think the row was saved.
      if (save && !r.savedId) {
        setError({
          message: 'تم توليد الـ PDF لكن لم يصلنا رقم سجل من الخادم. أعد المحاولة أو اتصل بالدعم.',
          pdfUrl: r.publicUrl,
        });
        return;
      }

      setResult({ publicUrl: r.publicUrl, savedId: r.savedId, total });
      // If saved, navigate to the detail page; otherwise just stay on this page
      // so the user can download the PDF. Quote saves now go to /admin/quotes/[id]
      // (the list page used to be the fallback before that route existed).
      if (save && r.savedId) {
        const target =
          kind === 'invoice' ? `/admin/invoices/${r.savedId}` : `/admin/quotes/${r.savedId}`;
        // small delay so the user sees the success state before redirect
        setTimeout(() => router.push(target), 1500);
      }
    });
  };

  const handleEmail = () => {
    if (!result || !clientEmail.trim()) return;
    setEmailStatus('sending');
    setEmailError(null);
    setEmailSending(true);
    startTransition(async () => {
      const r = await sendDocumentEmail({
        to: clientEmail.trim(),
        documentKind: kind,
        documentNumber: number.trim(),
        clientName: clientName.trim(),
        publicUrl: result.publicUrl,
        total: result.total,
        currency: 'SAR',
      });
      setEmailSending(false);
      if (!r.ok) {
        setEmailStatus('error');
        setEmailError(r.error);
        return;
      }
      setEmailStatus('sent');
    });
  };

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="space-y-8 max-w-4xl"
    >
      {/* Document type toggle */}
      <section className="rounded-2xl border border-ink-900/10 bg-paper p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-sm font-semibold text-ink-700">نوع المستند</p>
          {draftSavedAt && savedAgoText && (
            <div className="flex items-center gap-2 text-xs text-ink-500">
              <History className="size-3" />
              <span>مسودة محفوظة · {savedAgoText}</span>
              <button
                type="button"
                onClick={clearDraft}
                className="text-ink-400 hover:text-red-600 p-0.5 rounded transition-colors"
                title="حذف المسودة المحفوظة"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setKind('invoice')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
              kind === 'invoice'
                ? 'bg-sage-700 text-paper border-sage-700 shadow-sm'
                : 'bg-paper text-ink-700 border-ink-900/15 hover:border-sage-300'
            }`}
          >
            فاتورة ضريبية
          </button>
          <button
            type="button"
            onClick={() => setKind('quote')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
              kind === 'quote'
                ? 'bg-sage-700 text-paper border-sage-700 shadow-sm'
                : 'bg-paper text-ink-700 border-ink-900/15 hover:border-sage-300'
            }`}
          >
            عرض سعر
          </button>
        </div>
      </section>

      {/* Client block */}
      <section className="rounded-2xl border border-ink-900/10 bg-paper p-5 space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wider text-ink-700">بيانات العميل</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="relative">
            <Field label="اسم العميل" required>
              <TextInput
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  setShowClientDropdown(true);
                }}
                onFocus={() => setShowClientDropdown(true)}
                onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                placeholder="أحمد القحطاني"
                required
                autoComplete="off"
              />
            </Field>
            {showClientDropdown && (recentClients.length > 0 || searchingClients) && (
              <div className="absolute z-20 top-full inset-x-0 mt-1 max-h-64 overflow-y-auto rounded-lg border border-ink-900/10 bg-paper shadow-lg">
                <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-ink-500 border-b border-ink-900/5 flex items-center gap-1">
                  <History className="size-3" /> {clientName ? 'عملاء يطابقون' : 'آخر العملاء'}
                </p>
                {searchingClients && recentClients.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-ink-500">جاري البحث…</p>
                ) : recentClients.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-ink-500">لا توجد نتائج</p>
                ) : (
                  <ul>
                    {recentClients.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); pickClient(c); }}
                          className="w-full text-start px-3 py-2 hover:bg-sage-50 flex items-center gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink-900 truncate">{c.name}</p>
                            {c.company && (
                              <p className="text-xs text-ink-500 truncate">{c.company}</p>
                            )}
                          </div>
                          {c.vat_number && (
                            <span className="text-[10px] text-ink-500 font-mono" dir="ltr">{c.vat_number}</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <Field label="الشركة">
            <TextInput
              value={clientCompany}
              onChange={(e) => setClientCompany(e.target.value)}
              placeholder="شركة مثال"
            />
          </Field>
          <Field label="الرقم الضريبي" hint="15 رقماً للعملاء السعوديين">
            <TextInput
              value={clientVat}
              onChange={(e) => setClientVat(e.target.value)}
              placeholder="300000000000003"
              dir="ltr"
            />
          </Field>
          <Field label="رقم الجوال" hint="يُفعّل زر 'إرسال عبر واتساب' بعد التوليد">
            <TextInput
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="05xxxxxxxx أو +9665xxxxxxxx"
              dir="ltr"
            />
          </Field>
          <Field label="البريد الإلكتروني" hint="يُفعّل زر 'إرسال بالبريد' بعد التوليد (مرفق مع PDF)">
            <TextInput
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@example.com"
              dir="ltr"
            />
          </Field>
          <Field label="العنوان">
            <TextInput
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              placeholder="الرياض، المملكة العربية السعودية"
            />
          </Field>
        </div>
      </section>

      {/* Document header */}
      <section className="rounded-2xl border border-ink-900/10 bg-paper p-5 space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wider text-ink-700">تفاصيل المستند</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="رقم المستند" required>
            <TextInput
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              required
              dir="ltr"
            />
          </Field>
          <Field label="تاريخ الإصدار" required>
            <TextInput
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
            />
          </Field>
          {kind === 'quote' ? (
            <Field label="صالح حتى">
              <TextInput
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </Field>
          ) : (
            <Field label="نسبة الضريبة (%)">
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
          )}
        </div>
        {kind === 'invoice' && (
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Spacer to push VAT% below the first row visually */}
            <div className="sm:col-span-3" />
          </div>
        )}
      </section>

      {/* Line items */}
      <section className="rounded-2xl border border-ink-900/10 bg-paper p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wider text-ink-700">البنود</p>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 text-sm text-sage-700 hover:text-sage-800"
          >
            <Plus className="size-4" /> بند جديد
          </button>
        </div>

        <div className="rounded-xl border border-ink-900/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-linen-50 text-xs text-ink-600 uppercase tracking-wider">
              <tr>
                <th className="text-start font-medium px-3 py-2">الوصف</th>
                <th className="text-end font-medium px-2 py-2 w-20">الكمية</th>
                <th className="text-end font-medium px-2 py-2 w-28">السعر</th>
                <th className="text-end font-medium px-2 py-2 w-28">الإجمالي</th>
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
                        placeholder="بوت واتساب + لوحة تحكم"
                        className="w-full rounded-md border border-ink-900/15 bg-paper px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-600/30 focus:border-sage-600"
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
                    <td className="px-2 py-2 text-end font-semibold text-ink-900 tabular-nums" dir="ltr">
                      {fmtSAR(lineTotal)}
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

        {/* Totals preview */}
        <div className="rounded-xl bg-linen-50/40 border border-ink-900/5 p-4 grid gap-2 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-xs text-ink-600">الإجمالي قبل الضريبة</p>
            <p className="text-base font-semibold text-ink-900 tabular-nums" dir="ltr">{fmtSAR(subtotal)}</p>
          </div>
          {kind === 'invoice' && (
            <div>
              <p className="text-xs text-ink-600">ضريبة القيمة المضافة ({vatRate || 0}%)</p>
              <p className="text-base font-semibold text-ink-900 tabular-nums" dir="ltr">{fmtSAR(vatAmount)}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-sage-700 font-semibold">الإجمالي شامل الضريبة</p>
            <p className="text-lg font-bold text-sage-700 tabular-nums" dir="ltr">{fmtSAR(total)}</p>
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="rounded-2xl border border-ink-900/10 bg-paper p-5 space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wider text-ink-700">ملاحظات</p>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="شكراً لتعاملكم معنا. يسعدنا الإجابة على استفساراتكم…"
        />
      </section>

      {/* Error / success */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3 text-sm text-red-900">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {error.pdfUrl
                  ? `تم توليد الـ PDF لكن تعذّر حفظ ${kind === 'invoice' ? 'الفاتورة' : 'عرض السعر'} في الجدول`
                  : 'تعذّر توليد المستند'}
              </p>
              <p className="text-red-800 mt-0.5">{error.message}</p>
            </div>
          </div>
          {error.pdfUrl && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200/70">
              <a
                href={error.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 text-paper text-xs font-semibold px-3 py-1.5 hover:bg-red-800"
              >
                <Download className="size-3.5" /> تنزيل الـ PDF المُولّد
              </a>
              <span className="text-xs text-red-800">
                الملف في التخزين لكنه لم يُسجَّل — غيّر رقم المستند (إن كان متكرراً) أو عدّل البيانات وأعد المحاولة.
              </span>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-sage-200 bg-sage-50 p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm text-sage-900">
            <CheckCircle2 className="size-5" />
            <p className="font-semibold">تم توليد {kind === 'invoice' ? 'الفاتورة' : 'عرض السعر'} بنجاح</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={result.publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-sage-700 text-paper text-sm font-semibold px-4 py-2 hover:bg-sage-800"
            >
              <Download className="size-4" /> فتح / تنزيل PDF
            </a>
            {clientEmail.trim() && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleEmail}
                disabled={emailSending}
              >
                {emailSending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                {emailStatus === 'sent' ? 'تم الإرسال' : emailSending ? 'جاري الإرسال…' : `إرسال إلى ${clientEmail.trim()}`}
              </Button>
            )}
            {whatsAppLink && (
              <a
                href={whatsAppLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] text-paper text-sm font-semibold px-4 py-2 hover:bg-[#1FAD52]"
              >
                <MessageCircle className="size-4" /> إرسال عبر واتساب
              </a>
            )}
            {result.savedId && (
              <span className="text-xs text-sage-800">تم الحفظ في جدول {kind === 'invoice' ? 'الفواتير' : 'الفواتير'} (سيتم تحويلك تلقائياً)…</span>
            )}
          </div>

          {/* Email status feedback */}
          {emailStatus === 'sent' && (
            <p className="text-xs text-sage-800 flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" /> تم إرسال البريد إلى {clientEmail.trim()} مع نسخة PDF مرفقة.
            </p>
          )}
          {emailStatus === 'error' && emailError && (
            <p className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-md px-2 py-1.5 flex items-start gap-1.5">
              <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
              <span>فشل إرسال البريد: {emailError}</span>
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 sticky bottom-0 bg-paper border-t border-ink-900/10 -mx-4 px-4 py-4 sm:mx-0 sm:px-0 sm:border-0 sm:bg-transparent sm:static">
        <Button
          type="button"
          variant="primary"
          onClick={() => handleSubmit(true)}
          disabled={isPending || !canSubmit}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isPending
            ? 'جاري الحفظ…'
            : kind === 'invoice'
              ? 'حفظ كفاتورة + توليد PDF'
              : 'حفظ كفاتورة (مسودة) + PDF'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleSubmit(false)}
          disabled={isPending || !canSubmit}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
          توليد PDF فقط (بدون حفظ)
        </Button>
      </div>
    </form>
  );
}
