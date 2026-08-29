// src/lib/pdf/render.tsx
// Render a DocumentData shape to a PDF buffer using @react-pdf/renderer.

import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { renderToBuffer } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import { BRAND } from './branding';
import type { DocumentData, LineItem } from './types';

const fmt = (n: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
};

const t = {
  invoiceTitleAr: 'فاتورة ضريبية',
  quoteTitleAr:  'عرض سعر',
  invoiceTitleEn: 'TAX INVOICE',
  quoteTitleEn:  'QUOTATION',
  clientBlock:   'بيانات العميل',
  itemsBlock:    'البنود',
  totalsBlock:   'الإجماليات',
  notesBlock:    'ملاحظات',
  desc:          'الوصف',
  qty:           'الكمية',
  price:         'السعر',
  total:         'الإجمالي',
  subtotal:      'الإجمالي قبل الضريبة',
  vat:           (rate: number) => `ضريبة القيمة المضافة (${rate}%)`,
  grandTotal:    'الإجمالي شامل الضريبة',
  validUntil:    'صالح حتى',
  thanks:        'شكراً لتعاملكم معنا.',
  cr:            'السجل التجاري',
  vatNo:         'الرقم الضريبي',
  address:       'العنوان',
  contact:       'للتواصل',
  page:          (n: number, total: number) => `صفحة ${n} من ${total}`,
  // These were missing — added now
  issue_date_label: 'تاريخ الإصدار',
  client_name_label: 'اسم العميل',
  company_label:     'الشركة',
  vat_number_label:  'الرقم الضريبي',
  address_label:     'العنوان',
};

const colHeader = StyleSheet.create({
  desc:  { width: '52%', textAlign: 'right' },
  qty:   { width: '12%', textAlign: 'left'  },
  price: { width: '18%', textAlign: 'left'  },
  total: { width: '18%', textAlign: 'left'  },
});

/** Compute subtotal/VAT/total from a list of line items. */
export function computeTotals(items: LineItem[], vatRate: number, currency: string) {
  const subtotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const taxableBase = items.filter((it) => it.taxable !== false).reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const vatAmount = Math.round(taxableBase * (vatRate / 100) * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount,
    total,
    currency,
  };
}

// ============================================================
//  Document component
// ============================================================

// @react-pdf/renderer's <Text> doesn't accept arbitrary HTML attrs like `dir`.
// We use plain <Text> everywhere and rely on the natural LTR for numbers
// (because the surrounding font is Latin-script friendly for digits).

function PdfDocument({ data, stampDataUri }: { data: DocumentData; stampDataUri: string | null }) {
  const { kind, client, line_items, brand, subtotal, vat_rate, vat_amount, total, currency } = data;
  const isInvoice = kind === 'invoice';

  // Split items into pages if very long (basic: keep all on one page for now)
  // We just render the items as one table; @react-pdf handles overflow with the page break.

  return (
    <Document
      title={isInvoice ? `Tax Invoice ${data.number}` : `Quotation ${data.number}`}
      author={brand.nameEn}
    >
      <Page size="A4" style={pdfStyles.page}>
        {/* Header band */}
        <View style={pdfStyles.headerRow} fixed>
          <View style={pdfStyles.brandBlock}>
            <Image src="/brand/soulvd-mark.png" style={pdfStyles.brandMark} />
            <View>
              <Text style={pdfStyles.brandNameAr}>{BRAND.nameAr}</Text>
              <Text style={pdfStyles.brandNameEn}>{BRAND.nameEn}</Text>
            </View>
          </View>
          <View>
            <Text style={pdfStyles.docTypeAr}>
              {isInvoice ? t.invoiceTitleAr : t.quoteTitleAr}
            </Text>
            <Text style={pdfStyles.docMeta}>
              <Text style={pdfStyles.docMetaStrong}>{data.number}</Text>
            </Text>
            <Text style={pdfStyles.docMeta}>
              {t.issue_date_label}: {fmtDate(data.issue_date)}
            </Text>
            {!isInvoice && data.valid_until && (
              <Text style={pdfStyles.docMeta}>
                {t.validUntil}: {fmtDate(data.valid_until)}
              </Text>
            )}
          </View>
        </View>

        {/* Client block */}
        <Text style={pdfStyles.sectionHeading}>{t.clientBlock}</Text>
        <View style={pdfStyles.clientGrid}>
          <View style={pdfStyles.clientCell}>
            <Text style={pdfStyles.clientLabel}>{t.client_name_label}</Text>
            <Text style={pdfStyles.clientValue}>{client.name || '—'}</Text>
          </View>
          {client.company && (
            <View style={pdfStyles.clientCell}>
              <Text style={pdfStyles.clientLabel}>{t.company_label}</Text>
              <Text style={pdfStyles.clientValue}>{client.company}</Text>
            </View>
          )}
          {client.vat_number && (
            <View style={pdfStyles.clientCell}>
              <Text style={pdfStyles.clientLabel}>{t.vat_number_label}</Text>
              <Text style={pdfStyles.clientValue}>{client.vat_number}</Text>
            </View>
          )}
          {client.address && (
            <View style={pdfStyles.clientCell}>
              <Text style={pdfStyles.clientLabel}>{t.address_label}</Text>
              <Text style={pdfStyles.clientValue}>{client.address}</Text>
            </View>
          )}
        </View>

        {/* Line items */}
        <Text style={pdfStyles.sectionHeading}>{t.itemsBlock}</Text>
        <View style={pdfStyles.itemsTable}>
          {/* Header row */}
          <View style={pdfStyles.itemsHeader}>
            <Text style={[pdfStyles.itemsHeaderCell, colHeader.desc]}>{t.desc}</Text>
            <Text style={[pdfStyles.itemsHeaderCell, colHeader.qty]}>{t.qty}</Text>
            <Text style={[pdfStyles.itemsHeaderCell, colHeader.price]}>{t.price}</Text>
            <Text style={[pdfStyles.itemsHeaderCell, colHeader.total]}>{t.total}</Text>
          </View>

          {/* Body rows */}
          {line_items.length === 0 ? (
            <View style={pdfStyles.itemRow}>
              <Text style={[pdfStyles.itemDesc, { color: '#888' }]}>— لا توجد بنود —</Text>
            </View>
          ) : (
            line_items.map((it, i) => (
              <View key={i} style={i % 2 === 0 ? pdfStyles.itemRow : pdfStyles.itemRowAlt}>
                <Text style={pdfStyles.itemDescAr}>{it.description || '—'}</Text>
                <Text style={pdfStyles.itemQtyAr}>{fmt(it.quantity, currency)}</Text>
                <Text style={pdfStyles.itemPriceAr}>{fmt(it.unit_price, currency)}</Text>
                <Text style={pdfStyles.itemTotalAr}>{fmt(it.quantity * it.unit_price, currency)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Totals */}
        <View style={pdfStyles.totalsWrap}>
          <View style={pdfStyles.totalsBox}>
            <View style={pdfStyles.totalsRow}>
              <Text style={pdfStyles.totalsLabel}>{t.subtotal}</Text>
              <Text style={pdfStyles.totalsValue}>{fmt(subtotal, currency)}</Text>
            </View>
            {isInvoice && (
              <View style={pdfStyles.totalsRow}>
                <Text style={pdfStyles.totalsLabel}>{t.vat(vat_rate)}</Text>
                <Text style={pdfStyles.totalsValue}>{fmt(vat_amount, currency)}</Text>
              </View>
            )}
            <View style={pdfStyles.totalsRowGrand}>
              <Text style={pdfStyles.totalsLabelGrand}>{t.grandTotal}</Text>
              <Text style={pdfStyles.totalsValueGrand}>{fmt(total, currency)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={pdfStyles.notesBox}>
            <Text style={pdfStyles.notesLabel}>{t.notesBlock}</Text>
            <Text style={pdfStyles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <View style={pdfStyles.footerLeft}>
            <Text>{brand.nameAr} · {brand.nameEn}</Text>
            <Text>{t.cr}: {brand.cr}  ·  {t.vatNo}: {brand.vat}</Text>
            <Text>{t.address}: {brand.address}</Text>
            <Text>{t.contact}: {brand.email}  ·  {brand.phone}  ·  {brand.website}</Text>
            <Text style={{ marginTop: 4 }}>{t.thanks}</Text>
          </View>
          {stampDataUri && (
            <Image src={stampDataUri} style={pdfStyles.stamp} />
          )}
        </View>

        {/* Page number */}
        <Text
          style={pdfStyles.pageNumber}
          render={({ pageNumber, totalPages }) => t.page(pageNumber, totalPages)}
          fixed
        />
      </Page>
    </Document>
  );
}

// ============================================================
//  Public API
// ============================================================

/** Render the document to a PDF buffer. */
export async function renderDocumentPdf(data: DocumentData): Promise<Buffer> {
  // Load the stamp as a data URI (so @react-pdf doesn't need a public URL)
  // We only need to do this for documents that should display the stamp.
  const stampDataUri = await loadBrandStamp();
  return await renderToBuffer(<PdfDocument data={data} stampDataUri={stampDataUri} />);
}

/** Render and upload to the documents bucket, return the public URL. */
export async function renderAndUploadDocumentPdf(
  data: DocumentData,
  upload: (path: string, bytes: Buffer, contentType: string) => Promise<{ publicUrl: string } | { error: string }>
): Promise<{ publicUrl: string } | { error: string }> {
  try {
    const buf = await renderDocumentPdf(data);
    const safe = data.number.replace(/[^A-Z0-9-]/gi, '_');
    const path = `${data.kind === 'invoice' ? 'invoices' : 'quotes'}/${safe}.pdf`;
    const result = await upload(path, buf, 'application/pdf');
    if ('error' in result) return result;
    return result;
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ============================================================
//  Helpers
// ============================================================

let _stampCache: string | null = null;
async function loadBrandStamp(): Promise<string | null> {
  if (_stampCache) return _stampCache;
  // Read the public asset. In a Node runtime this works because
  // `public/` is part of the Next.js static asset tree, but at runtime
  // we need to read the file from disk via `fs` since /public is not
  // served to server-side code.
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    // __dirname won't work in the Next.js compiled bundle; resolve from
    // process.cwd() which is the project root.
    const filePath = path.join(process.cwd(), 'public', 'brand', 'soulvd-stamp.png');
    const buf = await fs.readFile(filePath);
    _stampCache = `data:image/png;base64,${buf.toString('base64')}`;
    return _stampCache;
  } catch {
    return null;
  }
}
