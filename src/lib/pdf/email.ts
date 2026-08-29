// src/lib/pdf/email.ts
// Send a generated PDF (invoice or quote) to a recipient via Resend.
// The PDF is downloaded from the public storage URL and attached.

'use server';

import { z } from 'zod';
import { Resend } from 'resend';
import { BRAND } from './branding';

const schema = z.object({
  to: z.string().email('بريد إلكتروني غير صالح'),
  documentKind: z.enum(['invoice', 'quote']),
  documentNumber: z.string().min(1),
  clientName: z.string().min(1),
  publicUrl: z.string().url(),
  total: z.number().nonnegative(),
  currency: z.string().default('SAR'),
});

export type EmailInput = z.infer<typeof schema>;

const fmtSAR = (n: number) =>
  new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/** Download the PDF from the public storage URL and return as Buffer. */
async function downloadPdf(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download PDF: ${res.status} ${res.statusText}`);
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Build the bilingual HTML email body. */
function buildEmailBody(input: EmailInput, downloadUrl: string): string {
  const isInvoice = input.documentKind === 'invoice';
  const titleAr = isInvoice ? 'فاتورة ضريبية' : 'عرض سعر';
  const titleEn = isInvoice ? 'Tax Invoice' : 'Quotation';
  const safeName = escapeHtml(input.clientName);
  const safeNumber = escapeHtml(input.documentNumber);

  // Light, brand-aligned email template
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${titleAr} ${safeNumber}</title>
</head>
<body style="margin:0;padding:0;background:#FAF7F0;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#2C2A26;direction:rtl;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#FAF7F0;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E8E2D1;">
        <!-- Brand header -->
        <tr>
          <td style="background:#485A4D;padding:20px 28px;color:#FAF7F0;">
            <div style="font-size:20px;font-weight:bold;">${BRAND.nameAr}</div>
            <div style="font-size:12px;opacity:0.85;margin-top:2px;">${BRAND.nameEn} · ${BRAND.taglineEn}</div>
          </td>
        </tr>
        <!-- Title -->
        <tr>
          <td style="padding:28px 28px 8px 28px;">
            <div style="font-size:11px;color:#6B655C;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">${titleEn} · ${titleAr}</div>
            <div style="font-size:24px;font-weight:bold;color:#3A4A3E;line-height:1.2;">${titleAr} <span style="color:#6B655C;font-weight:normal;">${safeNumber}</span></div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:8px 28px 16px 28px;font-size:14px;line-height:1.7;color:#2C2A26;">
            <p style="margin:0 0 12px 0;">مرحباً <strong>${safeName}</strong>،</p>
            <p style="margin:0 0 12px 0;">تجد مرفقاً <strong>${titleAr}</strong> رقم <strong>${safeNumber}</strong> بقيمة إجمالية <strong style="color:#3A4A3E;">${fmtSAR(input.total)}</strong>.</p>
            <p style="margin:0 0 16px 0;color:#6B655C;font-size:13px;">Hello <strong>${safeName}</strong>, please find attached <strong>${titleEn} ${safeNumber}</strong> for a total of <strong style="color:#3A4A3E;">${fmtSAR(input.total)}</strong>.</p>
            <p style="margin:0 0 4px 0;">
              <a href="${downloadUrl}" style="display:inline-block;background:#485A4D;color:#FAF7F0;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px;font-weight:bold;">تنزيل المستند · Download PDF</a>
            </p>
            <p style="margin:16px 0 0 0;font-size:12px;color:#6B655C;">إذا كان لديك أي استفسار، يسعدنا التواصل. · If you have any questions, we're happy to help.</p>
          </td>
        </tr>
        <!-- Brand footer -->
        <tr>
          <td style="padding:18px 28px;background:#FAF7F0;border-top:1px solid #E8E2D1;font-size:11px;color:#6B655C;line-height:1.6;">
            <div><strong>${BRAND.nameAr} · ${BRAND.nameEn}</strong></div>
            <div>السجل التجاري: ${BRAND.cr} · الرقم الضريبي: ${BRAND.vat}</div>
            <div>${BRAND.addressAr}</div>
            <div>${BRAND.email} · ${BRAND.phone} · ${BRAND.website}</div>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0 0;font-size:11px;color:#6B655C;">تم توليد هذه الرسالة آلياً من نظام إدارة سولڤد.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Plain-text fallback (for clients that don't render HTML). */
function buildEmailText(input: EmailInput, downloadUrl: string): string {
  const isInvoice = input.documentKind === 'invoice';
  const title = isInvoice ? 'فاتورة ضريبية' : 'عرض سعر';
  return `مرحباً ${input.clientName}،

تجد مرفقاً ${title} رقم ${input.documentNumber} بقيمة إجمالية ${fmtSAR(input.total)}.

Hello ${input.clientName}, please find attached ${isInvoice ? 'Tax Invoice' : 'Quotation'} ${input.documentNumber} for a total of ${fmtSAR(input.total)}.

Download: ${downloadUrl}

${BRAND.nameAr} · ${BRAND.nameEn}
السجل التجاري: ${BRAND.cr} · الرقم الضريبي: ${BRAND.vat}
${BRAND.addressAr}
${BRAND.email} · ${BRAND.phone} · ${BRAND.website}`;
}

/**
 * Send the generated PDF to the recipient via Resend.
 * Returns ok=true on success, ok=false with error on failure.
 */
export async function sendDocumentEmail(input: EmailInput) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'invalid' };
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false as const, error: 'RESEND_API_KEY not set' };
  }
  const from = process.env.LEAD_FROM || `Soulvd <noreply@soulvd.sa>`;

  let buf: Buffer;
  try {
    buf = await downloadPdf(parsed.data.publicUrl);
  } catch (err) {
    return { ok: false as const, error: `failed to download PDF: ${(err as Error).message}` };
  }

  const isInvoice = parsed.data.documentKind === 'invoice';
  const titleAr = isInvoice ? 'فاتورة ضريبية' : 'عرض سعر';
  const subject = `${titleAr} من سولڤد — ${parsed.data.documentNumber} | ${isInvoice ? 'Tax Invoice' : 'Quotation'} from Soulvd`;

  const resend = new Resend(apiKey);
  const attachmentFilename = `${parsed.data.documentNumber}.pdf`;

  try {
    const result = await resend.emails.send({
      from,
      to: parsed.data.to,
      subject,
      html: buildEmailBody(parsed.data, parsed.data.publicUrl),
      text: buildEmailText(parsed.data, parsed.data.publicUrl),
      attachments: [
        {
          filename: attachmentFilename,
          content: buf,
        },
      ],
    });
    if (result.error) {
      return { ok: false as const, error: result.error.message };
    }
    return { ok: true as const, id: result.data?.id };
  } catch (err) {
    return { ok: false as const, error: (err as Error).message };
  }
}
