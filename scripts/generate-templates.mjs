// scripts/generate-templates.mjs
// Generates the two Soulvd .docx templates:
//   - public/templates/quotation-milestone.docx
//   - public/templates/tax-invoice.docx
//
// Pipeline:
//   1. Build the document with the `docx` library (structure, tables,
//      header, footer with embedded stamp).
//   2. Every dynamic field is written as plain text `{{KEY}}` so the
//      existing admin templates engine can replace it.
//   3. Post-process word/document.xml with PizZip — wrap each `{{KEY}}`
//      run in a Word Content Control (w:sdt) so the user can also fill
//      it in directly inside Word. Text fields become w:text content
//      controls; fields with a fixed set of options become
//      w:dropDownList content controls.

import docx from 'docx';
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  TableLayoutType,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  ShadingType,
  VerticalAlign,
  TabStopType,
  TabStopPosition,
} = docx;
import PizZip from 'pizzip';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const stampPath = path.join(projectRoot, 'public', 'brand', 'soulvd-stamp.png');
const outDir = path.join(projectRoot, 'public', 'templates');
fs.mkdirSync(outDir, { recursive: true });

const stampBuffer = fs.readFileSync(stampPath);

// ==== Brand constants ====
const BRAND_NAME = 'Soulvd';
const BRAND_NAME_AR = 'سولڤد';
const BRAND_VAT = '314295103800003';
const BRAND_CR = '7054075218';
const BRAND_ADDRESS = 'Al Khobar, Kingdom of Saudi Arabia';
const BRAND_EMAIL = 'info@soulvd.sa';
const BRAND_PHONE = '+966 56 966 8873';
const BRAND_WEBSITE = 'soulvd.sa';

// ==== Reusable style helpers ====
const COLOR_INK = '2C2A26';
const COLOR_SAGE = '485A4D';
const COLOR_PAPER = 'FAF7F0';
const COLOR_BORDER = 'C7B591';
const COLOR_MUTED = '6B655C';
const COLOR_ACCENT = '1F4E79';

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'auto' };
const thinBorder = { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER };

function shadedCell(text, opts = {}) {
  const {
    bold = false,
    italic = false,
    color = COLOR_INK,
    fill = COLOR_PAPER,
    align = AlignmentType.LEFT,
    width,
    size = 22,
  } = opts;
  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: { type: ShadingType.CLEAR, color: 'auto', fill },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 120, bottom: 120, left: 140, right: 140 },
    borders: {
      top: noBorder, bottom: thinBorder, left: noBorder, right: noBorder,
    },
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({ text: String(text), bold, color, italics: italic, size }),
        ],
      }),
    ],
  });
}

function dataCell(text, opts = {}) {
  return shadedCell(text, { ...opts, fill: undefined });
}

function sectionDivider(title) {
  return new Paragraph({
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER, space: 6 } },
    spacing: { before: 300, after: 80 },
    children: [
      new TextRun({ text: title, bold: true, color: COLOR_SAGE, size: 22 }),
    ],
  });
}

function labeledField(label, key) {
  // Plain text run with {{KEY}} — the post-processor wraps this in a
  // Word Content Control so the user can fill it in directly in Word.
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, color: COLOR_INK, size: 22 }),
      new TextRun({ text: `{{${key}}}`, color: COLOR_ACCENT, size: 22 }),
    ],
  });
}

// ==== Header / Footer ====
function brandHeader(title, subtitle) {
  return new Header({
    children: [
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLOR_SAGE, space: 4 } },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: BRAND_NAME, bold: true, color: COLOR_SAGE, size: 28 }),
          new TextRun({ text: '  ·  ', color: COLOR_BORDER, size: 24 }),
          new TextRun({ text: BRAND_NAME_AR, bold: true, color: COLOR_SAGE, size: 28 }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: title, bold: true, color: COLOR_ACCENT, size: 40 }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 200 },
        children: [
          new TextRun({ text: subtitle, italics: true, color: COLOR_MUTED, size: 20 }),
        ],
      }),
    ],
  });
}

function brandFooter() {
  return new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER, space: 6 } },
        tabStops: [
          { type: TabStopType.CENTER, position: TabStopPosition.MAX / 2 },
          { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
        ],
        spacing: { before: 120, after: 0 },
        children: [
          new TextRun({ text: `${BRAND_NAME} · ${BRAND_NAME_AR}`, bold: true, color: COLOR_SAGE, size: 18 }),
          new TextRun({ text: '\t', size: 18 }),
          new TextRun({ text: `C.R. ${BRAND_CR} · VAT ${BRAND_VAT}`, color: COLOR_MUTED, size: 18 }),
          new TextRun({ text: '\t', size: 18 }),
          new TextRun({ text: 'Page ', color: COLOR_MUTED, size: 18 }),
          new TextRun({ children: [PageNumber.CURRENT], color: COLOR_MUTED, size: 18 }),
          new TextRun({ text: ' of ', color: COLOR_MUTED, size: 18 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], color: COLOR_MUTED, size: 18 }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 100 },
        children: [
          new ImageRun({
            data: stampBuffer,
            transformation: { width: 110, height: 110 },
            altText: { title: 'Soulvd official stamp', description: 'C.R. 7054075218' },
          }),
        ],
      }),
    ],
  });
}

// ==== Quotation document ====
function quotationDocument() {
  const milestonesHeader = new TableRow({
    tableHeader: true,
    children: [
      shadedCell('Phase / Item', { bold: true, color: COLOR_PAPER, fill: COLOR_SAGE, align: AlignmentType.LEFT, width: 22 }),
      shadedCell('Key Deliverables', { bold: true, color: COLOR_PAPER, fill: COLOR_SAGE, align: AlignmentType.LEFT, width: 38 }),
      shadedCell('Timeline', { bold: true, color: COLOR_PAPER, fill: COLOR_SAGE, align: AlignmentType.CENTER, width: 16 }),
      shadedCell('Cost (Excl. VAT)', { bold: true, color: COLOR_PAPER, fill: COLOR_SAGE, align: AlignmentType.RIGHT, width: 24 }),
    ],
  });
  const milestoneRow = (n) =>
    new TableRow({
      children: [
        dataCell(`{{PHASE_${n}_NAME}}`, { width: 22 }),
        dataCell(`{{PHASE_${n}_DELIVERABLES}}`, { width: 38 }),
        dataCell(`{{PHASE_${n}_DURATION}}`, { align: AlignmentType.CENTER, width: 16 }),
        dataCell(`{{PHASE_${n}_PRICE}}`, { align: AlignmentType.RIGHT, width: 24 }),
      ],
    });
  const milestonesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [milestonesHeader, milestoneRow(1), milestoneRow(2), milestoneRow(3)],
  });
  const totalsTable = new Table({
    width: { size: 60, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    alignment: AlignmentType.RIGHT,
    rows: [
      new TableRow({
        children: [
          dataCell('Subtotal', { bold: true, align: AlignmentType.LEFT, width: 50 }),
          dataCell('{{SUBTOTAL}}', { align: AlignmentType.RIGHT, width: 50 }),
        ],
      }),
      new TableRow({
        children: [
          dataCell('VAT (15%)', { bold: true, align: AlignmentType.LEFT, width: 50 }),
          dataCell('{{VAT_AMOUNT}}', { align: AlignmentType.RIGHT, width: 50 }),
        ],
      }),
      new TableRow({
        children: [
          shadedCell('Total Amount', { bold: true, color: COLOR_PAPER, fill: COLOR_SAGE, align: AlignmentType.LEFT, width: 50 }),
          shadedCell('{{TOTAL_AMOUNT}}', { bold: true, color: COLOR_PAPER, fill: COLOR_SAGE, align: AlignmentType.RIGHT, width: 50 }),
        ],
      }),
    ],
  });

  return new Document({
    creator: BRAND_NAME,
    title: 'Quotation — Soulvd',
    description: 'Milestone-based quotation template',
    sections: [
      {
        properties: {
          page: { margin: { top: 1100, right: 1100, bottom: 1400, left: 1100 } },
        },
        headers: { default: brandHeader('QUOTATION', 'عرض سعر') },
        footers: { default: brandFooter() },
        children: [
          new Paragraph({
            spacing: { before: 200, after: 200 },
            children: [
              new TextRun({ text: 'TO / إلى: ', bold: true, color: COLOR_MUTED, size: 20 }),
            ],
          }),
          labeledField('Client Name', 'CLIENT_NAME'),
          labeledField('Project Title', 'PROJECT_TITLE'),

          sectionDivider('Quotation Reference'),
          labeledField('Quotation Number', 'QUOTATION_NUMBER'),
          labeledField('Date', 'DATE'),

          sectionDivider('Scope of Work — Milestones'),
          milestonesTable,

          sectionDivider('Financial Summary'),
          totalsTable,

          sectionDivider('Commercial Terms'),
          labeledField('Payment Terms', 'PAYMENT_TERMS'),
          labeledField('Validity Period', 'VALIDITY_PERIOD'),
          labeledField('Currency', 'CURRENCY'),

          sectionDivider('Notes'),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'This quotation is valid for the period selected above and is subject to the signed Master Services Agreement. Prices are exclusive of VAT at 15%.',
                color: COLOR_MUTED,
                size: 20,
                italics: true,
              }),
            ],
          }),

          new Paragraph({
            spacing: { before: 600, after: 80 },
            children: [
              new TextRun({ text: 'Authorized Signature: ', bold: true, color: COLOR_INK, size: 22 }),
              new TextRun({ text: '_____________________________', color: COLOR_BORDER, size: 22 }),
            ],
          }),
        ],
      },
    ],
  });
}

// ==== Tax Invoice document ====
function taxInvoiceDocument() {
  const lineHeader = new TableRow({
    tableHeader: true,
    children: [
      shadedCell('#', { bold: true, color: COLOR_PAPER, fill: COLOR_SAGE, align: AlignmentType.CENTER, width: 6 }),
      shadedCell('Description / Phase', { bold: true, color: COLOR_PAPER, fill: COLOR_SAGE, align: AlignmentType.LEFT, width: 44 }),
      shadedCell('Unit Price (Excl. VAT)', { bold: true, color: COLOR_PAPER, fill: COLOR_SAGE, align: AlignmentType.RIGHT, width: 18 }),
      shadedCell('VAT Rate', { bold: true, color: COLOR_PAPER, fill: COLOR_SAGE, align: AlignmentType.CENTER, width: 12 }),
      shadedCell('VAT Amount', { bold: true, color: COLOR_PAPER, fill: COLOR_SAGE, align: AlignmentType.RIGHT, width: 10 }),
      shadedCell('Line Total (Incl. VAT)', { bold: true, color: COLOR_PAPER, fill: COLOR_SAGE, align: AlignmentType.RIGHT, width: 10 }),
    ],
  });
  const lineRow = (n) =>
    new TableRow({
      children: [
        dataCell(String(n), { align: AlignmentType.CENTER, width: 6 }),
        dataCell(`{{ITEM_${n}_DESC}}`, { width: 44 }),
        dataCell(`{{ITEM_${n}_PRICE}}`, { align: AlignmentType.RIGHT, width: 18 }),
        dataCell('15%', { align: AlignmentType.CENTER, width: 12 }),
        dataCell(`{{ITEM_${n}_VAT}}`, { align: AlignmentType.RIGHT, width: 10 }),
        dataCell(`{{ITEM_${n}_TOTAL}}`, { align: AlignmentType.RIGHT, width: 10 }),
      ],
    });
  const lineItemsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [lineHeader, lineRow(1), lineRow(2), lineRow(3)],
  });
  const totalsTable = new Table({
    width: { size: 60, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    alignment: AlignmentType.RIGHT,
    rows: [
      new TableRow({
        children: [
          dataCell('Total Taxable Amount', { bold: true, align: AlignmentType.LEFT, width: 50 }),
          dataCell('{{TOTAL_TAXABLE}}', { align: AlignmentType.RIGHT, width: 50 }),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Total VAT (15%)', { bold: true, align: AlignmentType.LEFT, width: 50 }),
          dataCell('{{TOTAL_VAT}}', { align: AlignmentType.RIGHT, width: 50 }),
        ],
      }),
      new TableRow({
        children: [
          shadedCell('Grand Total', { bold: true, color: COLOR_PAPER, fill: COLOR_SAGE, align: AlignmentType.LEFT, width: 50 }),
          shadedCell('{{GRAND_TOTAL}}', { bold: true, color: COLOR_PAPER, fill: COLOR_SAGE, align: AlignmentType.RIGHT, width: 50 }),
        ],
      }),
    ],
  });
  const partiesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    columnWidths: [4500, 4500],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            verticalAlign: VerticalAlign.TOP,
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            borders: { top: noBorder, bottom: thinBorder, left: noBorder, right: noBorder },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [new TextRun({ text: 'Supplier', bold: true, color: COLOR_SAGE, size: 22 })],
              }),
              new Paragraph({
                spacing: { after: 40 },
                children: [new TextRun({ text: BRAND_NAME, bold: true, color: COLOR_INK, size: 22 })],
              }),
              new Paragraph({
                spacing: { after: 40 },
                children: [new TextRun({ text: `VAT: ${BRAND_VAT}`, color: COLOR_INK, size: 20 })],
              }),
              new Paragraph({
                spacing: { after: 40 },
                children: [new TextRun({ text: `C.R.: ${BRAND_CR}`, color: COLOR_INK, size: 20 })],
              }),
              new Paragraph({
                spacing: { after: 40 },
                children: [new TextRun({ text: BRAND_ADDRESS, color: COLOR_INK, size: 20 })],
              }),
              new Paragraph({
                spacing: { after: 40 },
                children: [new TextRun({ text: BRAND_EMAIL, color: COLOR_INK, size: 20 })],
              }),
              new Paragraph({
                children: [new TextRun({ text: BRAND_PHONE, color: COLOR_INK, size: 20 })],
              }),
            ],
          }),
          new TableCell({
            verticalAlign: VerticalAlign.TOP,
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            borders: { top: noBorder, bottom: thinBorder, left: noBorder, right: noBorder },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [new TextRun({ text: 'Bill To', bold: true, color: COLOR_SAGE, size: 22 })],
              }),
              labeledField('Client Business Name', 'CLIENT_NAME'),
              labeledField('Client VAT Number', 'CLIENT_VAT_NO'),
            ],
          }),
        ],
      }),
    ],
  });

  return new Document({
    creator: BRAND_NAME,
    title: 'Tax Invoice — Soulvd',
    description: 'Official Saudi tax invoice template',
    sections: [
      {
        properties: {
          page: { margin: { top: 1100, right: 1100, bottom: 1400, left: 1100 } },
        },
        headers: { default: brandHeader('TAX INVOICE', 'فاتورة ضريبية') },
        footers: { default: brandFooter() },
        children: [
          partiesTable,

          sectionDivider('Invoice Reference'),
          labeledField('Invoice Number', 'INVOICE_NUMBER'),
          labeledField('Issue Date', 'ISSUE_DATE'),
          labeledField('Due Date', 'DUE_DATE'),

          sectionDivider('Line Items'),
          lineItemsTable,

          sectionDivider('Totals'),
          totalsTable,
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({ text: 'Amount in words: ', bold: true, color: COLOR_MUTED, size: 20 }),
              new TextRun({ text: '{{AMOUNT_IN_WORDS}}', color: COLOR_ACCENT, size: 20 }),
            ],
          }),

          sectionDivider('Payment & Bank'),
          labeledField('Payment Status', 'PAYMENT_STATUS'),
          labeledField('Bank Account / IBAN', 'BANK_ACCOUNT'),

          sectionDivider('Notes'),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'This invoice is issued in accordance with ZATCA and the Saudi VAT Implementing Regulations. Late payment may incur charges per the signed agreement.',
                color: COLOR_MUTED,
                size: 20,
                italics: true,
              }),
            ],
          }),

          new Paragraph({
            spacing: { before: 600, after: 80 },
            children: [
              new TextRun({ text: 'Authorized Signature: ', bold: true, color: COLOR_INK, size: 22 }),
              new TextRun({ text: '_____________________________', color: COLOR_BORDER, size: 22 }),
            ],
          }),
        ],
      },
    ],
  });
}

// ==== Post-process: wrap each {{KEY}} run in a Word Content Control ====
function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Replace every <w:r>...<w:t>{{KEY}}</w:t>...</w:r> in word/document.xml
 * with a <w:sdt> content control bound to that key.
 *
 * field type "text"    -> <w:text/>          (free-form input)
 * field type "select"  -> <w:dropDownList>   (fixed options)
 * field type "label"   -> <w:sdt> with no input type (read-only / display)
 */
function wrapPlaceholdersInSDT(docxBuffer, fields) {
  const zip = new PizZip(docxBuffer);
  const xmlPath = 'word/document.xml';
  let xml = zip.file(xmlPath).asText();
  const fieldByKey = new Map(fields.map((f) => [f.key, f]));

  // 1) Collect every {{KEY}} referenced in the XML (preserves order).
  const placeholderRegex = /\{\{([A-Z0-9_]+)\}\}/g;
  const seen = [];
  const seenSet = new Set();
  for (const m of xml.matchAll(placeholderRegex)) {
    if (!seenSet.has(m[1])) {
      seenSet.add(m[1]);
      seen.push(m[1]);
    }
  }

  let idCounter = 100000;
  for (const key of seen) {
    const field = fieldByKey.get(key) ?? { key, label: key, type: 'text' };
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Match a <w:r ...>...</w:r> that contains <w:t...>{{KEY}}</w:t>.
    // (?s) lets . match newlines; (?:(?!</w:r>).)*? is a tempered greedy
    // token so we never overshoot into the next run.
    const runRegex = new RegExp(
      `<w:r\\b[^>]*>(?:(?!<w:r[\\s>])[\\s\\S])*?<w:t(?:\\s[^>]*)?>\\s*\\{\\{${escapedKey}\\}\\}\\s*</w:t>(?:(?!</w:r>)[\\s\\S])*?</w:r>`,
      'g'
    );

    xml = xml.replace(runRegex, () => {
      const id = idCounter++;
      let sdtPrInner = '';
      sdtPrInner += `<w:alias w:val="${escapeXml(field.label)}"/>`;
      sdtPrInner += `<w:tag w:val="${escapeXml(field.key)}"/>`;
      sdtPrInner += `<w:id w:val="${id}"/>`;
      sdtPrInner += `<w:lock w:val="sdtLocked"/>`; // cannot delete the control
      if (field.type === 'select' && field.options) {
        const items = field.options
          .map(
            (o) =>
              `<w:listItem w:displayText="${escapeXml(o.display)}" w:value="${escapeXml(o.value)}"/>`
          )
          .join('');
        sdtPrInner += `<w:dropDownList>${items}</w:dropDownList>`;
      } else if (field.type === 'label') {
        // read-only text (no input control) — but we still wrap it so the
        // user can see the bound key in the control properties.
      } else {
        sdtPrInner += `<w:text/>`;
      }

      return (
        `<w:sdt>` +
          `<w:sdtPr>${sdtPrInner}</w:sdtPr>` +
          `<w:sdtContent>` +
            `<w:r><w:rPr><w:color w:val="${COLOR_ACCENT}"/></w:rPr><w:t>{{${escapeXml(field.key)}}}</w:t></w:r>` +
          `</w:sdtContent>` +
        `</w:sdt>`
      );
    });
  }

  zip.file(xmlPath, xml);
  return zip.generate({ type: 'nodebuffer' });
}

// ==== Field catalogs ====
const QUOTE_FIELDS = [
  { key: 'CLIENT_NAME', label: 'Client Name', type: 'text' },
  { key: 'PROJECT_TITLE', label: 'Project Title', type: 'text' },
  { key: 'QUOTATION_NUMBER', label: 'Quotation Number', type: 'text' },
  { key: 'DATE', label: 'Date', type: 'text' },
  { key: 'PHASE_1_NAME', label: 'Phase 1 Name', type: 'text' },
  { key: 'PHASE_1_DELIVERABLES', label: 'Phase 1 Deliverables', type: 'text' },
  { key: 'PHASE_1_DURATION', label: 'Phase 1 Duration', type: 'text' },
  { key: 'PHASE_1_PRICE', label: 'Phase 1 Price', type: 'text' },
  { key: 'PHASE_2_NAME', label: 'Phase 2 Name', type: 'text' },
  { key: 'PHASE_2_DELIVERABLES', label: 'Phase 2 Deliverables', type: 'text' },
  { key: 'PHASE_2_DURATION', label: 'Phase 2 Duration', type: 'text' },
  { key: 'PHASE_2_PRICE', label: 'Phase 2 Price', type: 'text' },
  { key: 'PHASE_3_NAME', label: 'Phase 3 Name', type: 'text' },
  { key: 'PHASE_3_DELIVERABLES', label: 'Phase 3 Deliverables', type: 'text' },
  { key: 'PHASE_3_DURATION', label: 'Phase 3 Duration', type: 'text' },
  { key: 'PHASE_3_PRICE', label: 'Phase 3 Price', type: 'text' },
  { key: 'SUBTOTAL', label: 'Subtotal', type: 'text' },
  { key: 'VAT_AMOUNT', label: 'VAT Amount', type: 'text' },
  { key: 'TOTAL_AMOUNT', label: 'Total Amount', type: 'text' },
  { key: 'PAYMENT_TERMS', label: 'Payment Terms', type: 'select', options: [
    { value: '100_upfront', display: '100% Upfront' },
    { value: '50_50', display: '50 / 50 Milestones' },
    { value: '30_40_30', display: '30 / 40 / 30 Split' },
  ]},
  { key: 'VALIDITY_PERIOD', label: 'Validity Period', type: 'select', options: [
    { value: '7_days', display: '7 Days' },
    { value: '14_days', display: '14 Days' },
    { value: '30_days', display: '30 Days' },
  ]},
  { key: 'CURRENCY', label: 'Currency', type: 'select', options: [
    { value: 'SAR', display: 'SAR · Saudi Riyal' },
    { value: 'USD', display: 'USD · US Dollar' },
    { value: 'EUR', display: 'EUR · Euro' },
  ]},
];

const INVOICE_FIELDS = [
  { key: 'CLIENT_NAME', label: 'Client Business Name', type: 'text' },
  { key: 'CLIENT_VAT_NO', label: 'Client VAT Number', type: 'text' },
  { key: 'INVOICE_NUMBER', label: 'Invoice Number', type: 'text' },
  { key: 'ISSUE_DATE', label: 'Issue Date', type: 'text' },
  { key: 'DUE_DATE', label: 'Due Date', type: 'text' },
  { key: 'ITEM_1_DESC', label: 'Item 1 Description', type: 'text' },
  { key: 'ITEM_1_PRICE', label: 'Item 1 Price', type: 'text' },
  { key: 'ITEM_1_VAT', label: 'Item 1 VAT', type: 'text' },
  { key: 'ITEM_1_TOTAL', label: 'Item 1 Total', type: 'text' },
  { key: 'ITEM_2_DESC', label: 'Item 2 Description', type: 'text' },
  { key: 'ITEM_2_PRICE', label: 'Item 2 Price', type: 'text' },
  { key: 'ITEM_2_VAT', label: 'Item 2 VAT', type: 'text' },
  { key: 'ITEM_2_TOTAL', label: 'Item 2 Total', type: 'text' },
  { key: 'ITEM_3_DESC', label: 'Item 3 Description', type: 'text' },
  { key: 'ITEM_3_PRICE', label: 'Item 3 Price', type: 'text' },
  { key: 'ITEM_3_VAT', label: 'Item 3 VAT', type: 'text' },
  { key: 'ITEM_3_TOTAL', label: 'Item 3 Total', type: 'text' },
  { key: 'TOTAL_TAXABLE', label: 'Total Taxable Amount', type: 'text' },
  { key: 'TOTAL_VAT', label: 'Total VAT', type: 'text' },
  { key: 'GRAND_TOTAL', label: 'Grand Total', type: 'text' },
  { key: 'AMOUNT_IN_WORDS', label: 'Amount in Words', type: 'text' },
  { key: 'PAYMENT_STATUS', label: 'Payment Status', type: 'select', options: [
    { value: 'unpaid', display: 'Unpaid' },
    { value: 'part_paid', display: 'Part-Paid' },
    { value: 'paid', display: 'Paid' },
  ]},
  { key: 'BANK_ACCOUNT', label: 'Bank Account / IBAN', type: 'select', options: [
    { value: 'riyad_bank', display: 'Riyad Bank · SA80 8000 0000' },
    { value: 'al_rajhi', display: 'Al Rajhi Bank · SA80 2080' },
    { value: 'sabb', display: 'SABB · SA80 4500' },
    { value: 'alinma', display: 'Alinma Bank · SA80 7250' },
  ]},
];

// ==== Main ====
async function main() {
  const quoteRaw = await Packer.toBuffer(quotationDocument());
  const quoteFinal = wrapPlaceholdersInSDT(quoteRaw, QUOTE_FIELDS);
  const quotePath = path.join(outDir, 'quotation-milestone.docx');
  fs.writeFileSync(quotePath, quoteFinal);
  console.log(`✓ quotation-milestone.docx  ${quoteFinal.length} bytes`);

  const invRaw = await Packer.toBuffer(taxInvoiceDocument());
  const invFinal = wrapPlaceholdersInSDT(invRaw, INVOICE_FIELDS);
  const invPath = path.join(outDir, 'tax-invoice.docx');
  fs.writeFileSync(invPath, invFinal);
  console.log(`✓ tax-invoice.docx          ${invFinal.length} bytes`);
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
