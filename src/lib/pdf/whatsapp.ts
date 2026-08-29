// src/lib/pdf/whatsapp.ts
// Helpers to build a pre-filled wa.me link so the admin can send the
// generated PDF to the client via WhatsApp Web with one click.
//
// wa.me accepts: ?phone=PHONE&text=MESSAGE
// PHONE: digits only, international format, no '+' or '00'.
// MESSAGE: URL-encoded text.

import { BRAND } from './branding';

const fmtSAR = (n: number) =>
  new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/**
 * Normalize a phone number to wa.me international format (digits only, no +/00).
 * Handles common Saudi formats:
 *   05XXXXXXXX       → 966XXXXXXXXX
 *   5XXXXXXXX        → 9665XXXXXXXX
 *   +966XXXXXXXXX    → 966XXXXXXXXX
 *   00966XXXXXXXXX   → 966XXXXXXXXX
 *   966XXXXXXXXX     → 966XXXXXXXXX  (already correct)
 *   other            → digits only, as-is
 */
export function normalizePhoneForWaMe(phone: string): string {
  if (!phone) return '';
  let p = phone.replace(/[^\d]/g, '');
  if (!p) return '';
  if (p.startsWith('00966')) p = p.slice(2);
  if (p.startsWith('0')) p = '966' + p.slice(1);
  if (!p.startsWith('966') && p.length <= 10) {
    // assume Saudi mobile — prefix with 966
    p = '966' + p;
  }
  return p;
}

export type WhatsAppLinkInput = {
  clientName: string;
  clientPhone: string;
  documentKind: 'invoice' | 'quote';
  documentNumber: string;
  total: number;
  currency?: string;
  publicUrl: string;     // public URL to the PDF on storage
  notes?: string | null;
};

/**
 * Build a wa.me URL with a pre-filled message and the PDF link.
 * The admin clicks the link, WhatsApp Web opens with the message, they
 * hit Send and manually attach the PDF (WhatsApp Web doesn't support
 * pre-filling attachments).
 */
export function buildWhatsAppLink(input: WhatsAppLinkInput): string | null {
  const phone = normalizePhoneForWaMe(input.clientPhone);
  if (!phone) return null;

  const isInvoice = input.documentKind === 'invoice';
  const titleAr = isInvoice ? 'فاتورة ضريبية' : 'عرض سعر';
  const titleEn = isInvoice ? 'Tax Invoice' : 'Quotation';
  const safeName = (input.clientName || '').trim() || 'عميلنا الكريم';
  const safeNumber = input.documentNumber.trim();

  const lines: string[] = [];
  lines.push(`مرحباً ${safeName}،`);
  lines.push('');
  lines.push(`تجد مرفقاً ${titleAr} رقم *${safeNumber}* بقيمة إجمالية *${fmtSAR(input.total)}* من ${BRAND.nameAr}.`);
  lines.push('');
  lines.push(`رابط المستند: ${input.publicUrl}`);
  if (input.notes && input.notes.trim()) {
    lines.push('');
    lines.push('ملاحظات:');
    lines.push(input.notes.trim());
  }
  lines.push('');
  lines.push(`Hello ${safeName},`);
  lines.push(`Please find attached ${titleEn} ${safeNumber} for a total of ${fmtSAR(input.total)} from ${BRAND.nameEn}.`);
  lines.push(`Document link: ${input.publicUrl}`);
  lines.push('');
  lines.push(`${BRAND.nameAr} · ${BRAND.nameEn}`);
  lines.push(`${BRAND.phone} · ${BRAND.website}`);

  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${phone}?text=${text}`;
}
