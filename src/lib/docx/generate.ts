// src/lib/docx/generate.ts
// Runtime .docx template filler for the templates engine.
//
// Our .docx templates wrap every {{KEY}} token in a Word Content Control
// (w:sdt). At generation time we replace the inner <w:t> content of each
// SDT with the actual value. Both text fields and drop-down fields share
// the same <w:sdtContent> structure, so one algorithm handles both.
//
// Input:  templateBytes (the .docx) + data (KEY -> value map)
// Output: a new .docx as Uint8Array

import PizZip from 'pizzip';

const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

/**
 * Escape a value for safe inclusion in OOXML <w:t> text.
 * Splits into multiple <w:t> runs at line breaks (Word treats <w:br/> as a soft break).
 */
function escapeForTextRun(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export type FillData = Record<string, string>;

/**
 * Fill all {{KEY}} placeholders in a .docx template.
 * Returns the modified file as a Uint8Array.
 *
 * Strategy:
 *  1. Unzip the .docx
 *  2. Read word/document.xml
 *  3. For each <w:sdt>...<w:tag w:val="KEY"/>...</w:sdt>:
 *     - Find the inner <w:t>...</w:t> (inside <w:sdtContent>)
 *     - Replace its text with the value from data[KEY]
 *     - If data[KEY] is missing, leave the placeholder
 *  4. Write the modified XML back and return the new zip bytes
 */
export function fillDocxTemplate(templateBytes: Uint8Array, data: FillData): Uint8Array {
  const zip = new PizZip(templateBytes);
  const docXml = zip.file('word/document.xml')?.asText() ?? '';

  // Match each <w:sdt>...</w:sdt> block. We need to be careful because the
  // blocks can contain nested elements, but in our templates the SDTs are
  // flat. Use a non-greedy match to grab from <w:sdt> to the FIRST </w:sdt>.
  const sdtRegex = /<w:sdt>(?:(?!<\/w:sdt>).)*<\/w:sdt>/g;

  const newXml = docXml.replace(sdtRegex, (sdtBlock) => {
    // Extract the tag name
    const tagMatch = sdtBlock.match(/<w:tag w:val="([A-Z0-9_]+)"/);
    if (!tagMatch) return sdtBlock;
    const key = tagMatch[1];
    if (!(key in data)) return sdtBlock;

    const value = data[key];
    if (value == null) return sdtBlock;
    const safe = escapeForTextRun(String(value));

    // Find the <w:t> inside <w:sdtContent>...</w:sdtContent> and replace its text.
    // We replace only the FIRST <w:t> inside the content (drop-downs and text
    // fields both have a single <w:t> in sdtContent per the template generator).
    const contentMatch = sdtBlock.match(/<w:sdtContent>([\s\S]*?)<\/w:sdtContent>/);
    if (!contentMatch) return sdtBlock;

    const inner = contentMatch[1];
    // The inner can have a single <w:r>...<w:t>...</w:t>...</w:r>.
    // We just swap the text inside the first <w:t>.
    const replaced = inner.replace(/<w:t([^>]*)>[^<]*<\/w:t>/, (_m, attrs) => `<w:t${attrs}>${safe}</w:t>`);

    return sdtBlock.replace(/<w:sdtContent>[\s\S]*?<\/w:sdtContent>/, `<w:sdtContent>${replaced}</w:sdtContent>`);
  });

  zip.file('word/document.xml', newXml);
  return zip.generate({ type: 'uint8array' }) as Uint8Array;
}

/**
 * Convert a number to Arabic words (for the AMOUNT_IN_WORDS field on invoices).
 * Handles SAR specifically. Limited to amounts up to 999,999,999.99.
 */
export function numberToArabicWords(num: number, currency: string = 'ريال سعودي'): string {
  if (num == null || isNaN(num)) return '';
  const isNeg = num < 0;
  const abs = Math.abs(num);
  const whole = Math.floor(abs);
  const cents = Math.round((abs - whole) * 100);

  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
                'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر',
                'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function threeDigits(n: number): string {
    if (n === 0) return '';
    let out = '';
    const h = Math.floor(n / 100);
    const t = n % 100;
    if (h) out += hundreds[h] + ' ';
    if (t) {
      if (t < 20) out += ones[t];
      else {
        const tn = Math.floor(t / 10);
        const on = t % 10;
        out += (on ? ones[on] + ' و' : '') + tens[tn];
      }
    }
    return out.trim();
  }

  function group(n: number, singular: string, dual: string, plural: string, two: string, many: string): string {
    if (n === 0) return '';
    if (n === 1) return singular;
    if (n === 2) return dual;
    if (n >= 3 && n <= 10) return plural;
    if (n === 11) return two; // not actually used, kept for symmetry
    return many;
  }

  const wholeWords = (() => {
    if (whole === 0) return 'صفر';
    const parts: string[] = [];

    const millions = Math.floor(whole / 1_000_000);
    const thousands = Math.floor((whole % 1_000_000) / 1000);
    const rem = whole % 1000;

    if (millions) {
      parts.push(threeDigits(millions));
      parts.push(group(millions, 'مليون', 'مليونان', 'ملايين', 'مليوناً', 'مليون'));
    }
    if (thousands) {
      parts.push(threeDigits(thousands));
      parts.push(group(thousands, 'ألف', 'ألفان', 'آلاف', 'ألفاً', 'ألف'));
    }
    if (rem) parts.push(threeDigits(rem));

    return parts.filter(Boolean).join(' و ').trim();
  })();

  const out: string[] = [];
  if (isNeg) out.push('سالب');
  out.push(wholeWords);
  out.push(currency);
  if (cents > 0) {
    out.push('و');
    out.push(threeDigits(cents));
    out.push(cents === 1 ? 'هللة' : 'هللات');
  }
  return out.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}
