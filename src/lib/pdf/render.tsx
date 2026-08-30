// src/lib/pdf/render.tsx
// Render a DocumentData shape to a PDF buffer using @react-pdf/renderer.
//
// Layout: ZATCA-style bilingual tax-invoice. Each client/seller field
// is a 3-column row [English label | value | Arabic label] so the
// value (which is the same Latin/numeric text in both languages)
// appears only once. Header and footer are full-width with both
// languages stacked.
//
// Fonts: Noto Sans Arabic is registered in ./fonts.ts. `ensureFontsRegistered`
// is called at the top of `renderDocumentPdf` so a cold start works
// without callers having to import it.

import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import { renderToBuffer } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import { BRAND } from './branding';
import { ensureFontsRegistered } from './fonts';
import type { DocumentData, LineItem } from './types';

const fmt = (n: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtDate = (iso: string, locale: 'ar-SA' | 'en-GB' = 'en-GB'): string => {
  try {
    return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
};

// All strings the PDF renders. Bilingual pairs: every Arabic label has
// an English counterpart.
const t = {
  invoiceTitleAr: 'فاتورة ضريبية',
  invoiceTitleEn: 'TAX INVOICE',
  quoteTitleAr:  'عرض سعر',
  quoteTitleEn:  'QUOTATION',

  issueDateAr: 'تاريخ الإصدار',
  issueDateEn: 'Issue date',
  validUntilAr: 'صالح حتى',
  validUntilEn: 'Valid until',

  clientBlockAr: 'بيانات العميل',
  clientBlockEn: 'Client Details',
  sellerBlockAr: 'بيانات البائع',
  sellerBlockEn: 'Seller Details',
  itemsBlockAr:  'البنود',
  itemsBlockEn:  'Items',
  totalsBlockAr: 'الإجماليات',
  totalsBlockEn: 'Totals',
  notesBlockAr:  'ملاحظات',
  notesBlockEn:  'Notes',

  // Client field labels (En | Ar pairs)
  clientNameAr:  'الاسم',
  clientNameEn:  'Name',
  companyAr:     'الشركة',
  companyEn:     'Company',
  vatNumberAr:   'الرقم الضريبي',
  vatNumberEn:   'VAT Number',
  phoneAr:       'الجوال',
  phoneEn:       'Phone',
  emailAr:       'البريد الإلكتروني',
  emailEn:       'Email',
  addressAr:     'العنوان',
  addressEn:     'Address',

  // Line items headers
  descAr:  'الوصف',
  descEn:  'Description',
  qtyAr:   'الكمية',
  qtyEn:   'Qty',
  priceAr: 'السعر',
  priceEn: 'Unit Price',
  totalAr: 'الإجمالي',
  totalEn: 'Total',

  // Totals
  subtotalAr:    'الإجمالي قبل الضريبة',
  subtotalEn:    'Subtotal',
  vatAr:         (rate: number) => `ضريبة القيمة المضافة (${rate}%)`,
  vatEn:         (rate: number) => `VAT (${rate}%)`,
  grandTotalAr:  'الإجمالي شامل الضريبة',
  grandTotalEn:  'Grand Total',

  crAr:         'السجل التجاري',
  crEn:         'CR',
  vatNoAr:      'الرقم الضريبي',
  vatNoEn:      'VAT No.',
  addressLabelAr:'العنوان',
  addressLabelEn:'Address',
  contactAr:    'للتواصل',
  contactEn:    'Contact',
  thanksAr:     'شكراً لتعاملكم معنا.',
  thanksEn:     'Thank you for your business.',
  pageAr:       (n: number, total: number) => `صفحة ${n} من ${total}`,
  pageEn:       (n: number, total: number) => `Page ${n} of ${total}`,

  dash: '—',
  noItemsAr: 'لا توجد بنود',
  noItemsEn: 'No items',
};

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

function PdfDocument({ data, stampDataUri }: { data: DocumentData; stampDataUri: string | null }) {
  const { kind, client, line_items, brand, subtotal, vat_rate, vat_amount, total, currency } = data;
  const isInvoice = kind === 'invoice';

  // Build field rows for the client block. Each row has the English
  // label, the value (centered), and the Arabic label. For the address
  // (long text) we use a wide row instead.
  const clientFields: Array<{ en: string; ar: string; value: string; wide?: boolean }> = [
    { en: t.clientNameEn, ar: t.clientNameAr, value: client.name ?? '' },
    ...(client.company ? [{ en: t.companyEn, ar: t.companyAr, value: client.company, wide: true }] : []),
    ...(client.vat_number ? [{ en: t.vatNumberEn, ar: t.vatNumberAr, value: client.vat_number }] : []),
    ...(client.phone ? [{ en: t.phoneEn, ar: t.phoneAr, value: client.phone }] : []),
    ...(client.email ? [{ en: t.emailEn, ar: t.emailAr, value: client.email }] : []),
    ...(client.address ? [{ en: t.addressEn, ar: t.addressAr, value: client.address, wide: true }] : []),
  ];

  // Seller block: brand info
  const sellerFields: Array<{ en: string; ar: string; value: string; wide?: boolean }> = [
    { en: t.clientNameEn, ar: t.clientNameAr, value: brand.nameEn, wide: true },
    { en: t.crEn, ar: t.crAr, value: brand.cr },
    { en: t.vatNoEn, ar: t.vatNoAr, value: brand.vat },
    { en: t.addressEn, ar: t.addressAr, value: brand.address, wide: true },
  ];

  return (
    <Document
      title={isInvoice ? `Tax Invoice ${data.number}` : `Quotation ${data.number}`}
      author={brand.nameEn}
    >
      <Page size="A4" style={pdfStyles.page}>
        {/* ============== Header band — 3-column editorial layout ============== */}
        <View style={pdfStyles.headerBand} fixed>
          {/* Left column: SOULVD wordmark + Arabic name + tagline */}
          <View style={pdfStyles.brandBlock}>
            <Text style={pdfStyles.brandNameEnBig}>SOULVD</Text>
            <Text style={pdfStyles.brandNameArBig}>{brand.nameAr}</Text>
            <Text style={pdfStyles.brandTaglineBig}>{brand.taglineEn}</Text>
          </View>

          {/* Center column: the brand mark (logo) */}
          <View style={pdfStyles.logoBlock}>
            <Image src="/brand/soulvd-mark.png" style={pdfStyles.brandMarkBig} />
          </View>

          {/* Right column: minimized doc info */}
          <View style={pdfStyles.headerRight}>
            <Text style={pdfStyles.docTypeLabel}>
              {isInvoice ? t.invoiceTitleEn : t.quoteTitleEn}
            </Text>
            <Text style={pdfStyles.docTypeAr}>
              {isInvoice ? t.invoiceTitleAr : t.quoteTitleAr}
            </Text>
            <View style={pdfStyles.docNumberPill}>
              <Text style={pdfStyles.docNumberLabel}>NO.</Text>
              <Text style={pdfStyles.docNumberValue}>{data.number}</Text>
            </View>
            {/* Fix #6: stacked bilingual date — En on top, Ar below */}
            <View style={pdfStyles.docDateRow}>
              <Text style={pdfStyles.docDateLabel}>{t.issueDateEn}</Text>
              <View style={pdfStyles.docDateStack}>
                <Text style={pdfStyles.docDateValueEn}>{fmtDate(data.issue_date, 'en-GB')}</Text>
                <Text style={pdfStyles.docDateValueAr}>{fmtDate(data.issue_date, 'ar-SA')}</Text>
              </View>
            </View>
            {!isInvoice && data.valid_until && (
              <View style={pdfStyles.docDateRow}>
                <Text style={pdfStyles.docDateLabel}>{t.validUntilEn}</Text>
                <View style={pdfStyles.docDateStack}>
                  <Text style={pdfStyles.docDateValueEn}>{fmtDate(data.valid_until, 'en-GB')}</Text>
                  <Text style={pdfStyles.docDateValueAr}>{fmtDate(data.valid_until, 'ar-SA')}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ============== Client section (bilingual) ============== */}
        <SectionHeading ar={t.clientBlockAr} en={t.clientBlockEn} />
        <FieldsBlock fields={clientFields} />

        {/* ============== Seller section (us) ============== */}
        <SectionHeading ar={t.sellerBlockAr} en={t.sellerBlockEn} />
        <FieldsBlock fields={sellerFields} />

        {/* ============== Line items ============== */}
        <SectionHeading ar={t.itemsBlockAr} en={t.itemsBlockEn} />
        <View style={pdfStyles.itemsTable}>
          {/* Header row */}
          <View style={pdfStyles.itemsHeader}>
            <View style={pdfStyles.colDesc}>
              <Text style={pdfStyles.itemsHeaderCellAr}>{t.descAr}</Text>
              <Text style={pdfStyles.itemsHeaderCellEn}>{t.descEn}</Text>
            </View>
            <View style={pdfStyles.colQty}>
              <Text style={pdfStyles.itemsHeaderCellNum}>{t.qtyEn}</Text>
            </View>
            <View style={pdfStyles.colPrice}>
              <Text style={pdfStyles.itemsHeaderCellNum}>{t.priceEn}</Text>
            </View>
            <View style={pdfStyles.colTotal}>
              <Text style={pdfStyles.itemsHeaderCellNum}>{t.totalEn}</Text>
            </View>
          </View>

          {/* Body rows */}
          {line_items.length === 0 ? (
            <View style={pdfStyles.itemRow}>
              <View style={pdfStyles.itemDescCell}>
                <Text style={[pdfStyles.itemDescAr, pdfStyles.muted]}>{t.noItemsAr}</Text>
                <Text style={[pdfStyles.itemDescEn, pdfStyles.muted]}>{t.noItemsEn}</Text>
              </View>
              <View style={pdfStyles.colQty}><Text style={pdfStyles.itemNum}>—</Text></View>
              <View style={pdfStyles.colPrice}><Text style={pdfStyles.itemNum}>—</Text></View>
              <View style={pdfStyles.colTotal}><Text style={pdfStyles.itemTotal}>—</Text></View>
            </View>
          ) : (
            line_items.map((it, i) => (
              <View key={i} style={i % 2 === 0 ? pdfStyles.itemRow : pdfStyles.itemRowAlt}>
                <View style={pdfStyles.itemDescCell}>
                  <Text style={pdfStyles.itemDescAr}>{it.description || t.dash}</Text>
                  <Text style={pdfStyles.itemDescEn}>{it.description || ''}</Text>
                </View>
                <View style={pdfStyles.colQty}>
                  <Text style={pdfStyles.itemNum}>{it.quantity}</Text>
                </View>
                <View style={pdfStyles.colPrice}>
                  <Text style={pdfStyles.itemNum}>{fmt(it.unit_price, currency)}</Text>
                </View>
                <View style={pdfStyles.colTotal}>
                  <Text style={pdfStyles.itemTotal}>{fmt(it.quantity * it.unit_price, currency)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ============== Totals (bilingual) ============== */}
        <View>
          <View style={pdfStyles.totalsWrap}>
            <View style={pdfStyles.totalsBox}>
              <View style={pdfStyles.totalsRow}>
                <View style={pdfStyles.totalsLabels}>
                  <Text style={pdfStyles.totalsLabelAr}>{t.subtotalAr}</Text>
                  <Text style={pdfStyles.totalsLabelEn}>{t.subtotalEn}</Text>
                </View>
                <Text style={pdfStyles.totalsValue}>{fmt(subtotal, currency)}</Text>
              </View>
              {isInvoice && (
                <View style={pdfStyles.totalsRow}>
                  <View style={pdfStyles.totalsLabels}>
                    <Text style={pdfStyles.totalsLabelAr}>{t.vatAr(vat_rate)}</Text>
                    <Text style={pdfStyles.totalsLabelEn}>{t.vatEn(vat_rate)}</Text>
                  </View>
                  <Text style={pdfStyles.totalsValue}>{fmt(vat_amount, currency)}</Text>
                </View>
              )}
              <View style={pdfStyles.totalsRowGrand}>
                <View style={pdfStyles.totalsLabelsGrand}>
                  <Text style={pdfStyles.totalsLabelArGrand}>{t.grandTotalAr}</Text>
                  <Text style={pdfStyles.totalsLabelEnGrand}>{t.grandTotalEn}</Text>
                </View>
                <Text style={pdfStyles.totalsValueGrand}>{fmt(total, currency)}</Text>
              </View>
            </View>
          </View>

          {/* ============== Notes (bilingual) ============== */}
          {data.notes && (
            <View style={pdfStyles.notesBox} wrap={false}>
              <View style={pdfStyles.notesLabelRow}>
                <Text style={pdfStyles.notesLabelEn}>{t.notesBlockEn}</Text>
                <Text style={pdfStyles.notesLabelAr}>{t.notesBlockAr}</Text>
              </View>
              <Text style={pdfStyles.notesText}>{data.notes}</Text>
            </View>
          )}
        </View>

        {/* ============== Footer (fixed; appears on every page) ============== */}
        <View style={pdfStyles.footer} fixed>
          <View style={pdfStyles.footerRow}>
            <View style={[pdfStyles.footerCol, pdfStyles.footerColEn]}>
              <Text style={[pdfStyles.footerLine, pdfStyles.footerLineEn]}>
                {t.crEn}: {brand.cr}  ·  {t.vatNoEn}: {brand.vat}
              </Text>
              <Text style={[pdfStyles.footerLine, pdfStyles.footerLineEn]}>
                {t.addressLabelEn}: {brand.address}
              </Text>
              <Text style={[pdfStyles.footerLine, pdfStyles.footerLineEn]}>
                {t.contactEn}: {brand.email}  ·  {brand.phone}  ·  {brand.website}
              </Text>
            </View>
            {stampDataUri && (
              <Image src={stampDataUri} style={pdfStyles.stamp} />
            )}
            <View style={[pdfStyles.footerCol, pdfStyles.footerColAr]}>
              <Text style={[pdfStyles.footerLine, pdfStyles.footerLineAr]}>
                {t.crAr}: {brand.cr}  ·  {t.vatNoAr}: {brand.vat}
              </Text>
              <Text style={[pdfStyles.footerLine, pdfStyles.footerLineAr]}>
                {t.addressLabelAr}: {brand.address}
              </Text>
              <Text style={[pdfStyles.footerLine, pdfStyles.footerLineAr]}>
                {t.contactAr}: {brand.email}  ·  {brand.phone}  ·  {brand.website}
              </Text>
            </View>
          </View>
          <Text style={pdfStyles.thanks}>
            {t.thanksAr}  ·  {t.thanksEn}
          </Text>
        </View>

        {/* Page number */}
        <Text
          style={pdfStyles.pageNumber}
          render={({ pageNumber, totalPages }) => `${t.pageAr(pageNumber, totalPages)}  ·  ${t.pageEn(pageNumber, totalPages)}`}
          fixed
        />
      </Page>
    </Document>
  );
}

// ============================================================
//  Subcomponents
// ============================================================

function SectionHeading({ ar, en }: { ar: string; en: string }) {
  return (
    <View style={pdfStyles.sectionHeading}>
      <Text style={pdfStyles.sectionHeadingEn}>{en}</Text>
      <Text style={pdfStyles.sectionHeadingAr}>{ar}</Text>
    </View>
  );
}

/** Render a stack of fields. Short fields use the 3-column [En | value | Ar]
 * layout; long fields (wide: true) use a stacked layout with both labels
 * on top and the value below. */
function FieldsBlock({
  fields,
}: {
  fields: Array<{ en: string; ar: string; value: string; wide?: boolean }>;
}) {
  return (
    <View>
      {fields.map((f, i) =>
        f.wide ? (
          <View key={i} style={pdfStyles.fieldRowWide}>
            <View style={pdfStyles.fieldLabelRow}>
              <Text style={pdfStyles.fieldLabelEn}>{f.en}</Text>
              <Text style={pdfStyles.fieldLabelAr}>{f.ar}</Text>
            </View>
            <Text style={pdfStyles.fieldValueWide}>{f.value || t.dash}</Text>
          </View>
        ) : (
          <View key={i} style={pdfStyles.fieldRow}>
            <Text style={pdfStyles.fieldLabelEn}>{f.en}</Text>
            <Text style={pdfStyles.fieldValue}>{f.value || t.dash}</Text>
            <Text style={pdfStyles.fieldLabelAr}>{f.ar}</Text>
          </View>
        )
      )}
    </View>
  );
}

// ============================================================
//  Public API
// ============================================================

export async function renderDocumentPdf(data: DocumentData): Promise<Buffer> {
  await ensureFontsRegistered();
  const stampDataUri = await loadBrandStamp();
  return await renderToBuffer(<PdfDocument data={data} stampDataUri={stampDataUri} />);
}

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
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const filePath = path.join(process.cwd(), 'public', 'brand', 'soulvd-stamp.png');
    const buf = await fs.readFile(filePath);
    _stampCache = `data:image/png;base64,${buf.toString('base64')}`;
    return _stampCache;
  } catch {
    return null;
  }
}
