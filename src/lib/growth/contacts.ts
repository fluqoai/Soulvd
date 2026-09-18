export type ImportRow = { phone: string; name: string };

/** Match the stored international digits, while allowing partial phone searches. */
export function contactSearch(value: string): { column: 'phone' | 'name'; term: string } {
  const raw = value.trim().slice(0, 100);
  const digits = raw.replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776));
  if (/^[+\d\s()-]+$/.test(digits) && /\d/.test(digits)) {
    const full = contactPhone(digits);
    let term = digits.replace(/[^\d]/g, '');
    if (term.startsWith('00')) term = term.slice(2);
    else if (term.startsWith('05')) term = '966' + term.slice(1);
    return { column: 'phone', term: full ?? term };
  }
  return { column: 'name', term: raw.replace(/[\\%_]/g, '') };
}

export function contactPhone(value: string): string | null {
  let n = value
    .trim()
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776));
  if (/[^\d+\s()-]/.test(n)) return null;
  n = n.replace(/[\s()-]/g, "");
  if (n.startsWith("00")) n = "+" + n.slice(2);
  if (/^05\d{8}$/.test(n)) n = "+966" + n.slice(1);
  else if (/^5\d{8}$/.test(n)) n = "+966" + n;
  else if (/^9665\d{8}$/.test(n)) n = "+" + n;
  return /^\+[1-9]\d{7,14}$/.test(n) ? n.slice(1) : null;
}

// Quoted CSV, Excel TSV and semicolon exports. Never evaluate cells or formulas.
export function parseContactsFile(text: string): string[][] {
  if (text.length > 500_000)
    throw new Error("حجم الملف أكبر من 500 كيلوبايت. قسّمه إلى ملفات أصغر.");
  text = text.replace(/^\uFEFF/, "");
  const header = text.split(/\r?\n/, 1)[0];
  const sep = header.includes("\t")
    ? "\t"
    : header.includes(";") && !header.includes(",")
      ? ";"
      : ",";
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === sep || c === "\n")) {
      row.push(cell.replace(/\r$/, "").trim());
      cell = "";
      if (c === "\n") {
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else cell += c;
    if (rows.length > 5001 || row.length > 30 || cell.length > 1000)
      throw new Error("الحد 5,000 صف و30 عمودًا، و1,000 حرف للخلية.");
  }
  if (quoted) throw new Error("علامات الاقتباس غير مكتملة في الملف.");
  row.push(cell.replace(/\r$/, "").trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length > 5001) throw new Error("الحد 5,000 جهة اتصال لكل ملف.");
  return rows;
}

export function previewContacts(
  rows: string[][],
  phoneCol: number,
  nameCol: number,
  hasHeader: boolean,
) {
  const contacts: ImportRow[] = [],
    invalid: number[] = [];
  let duplicates = 0;
  const seen = new Set<string>();
  rows.slice(hasHeader ? 1 : 0).forEach((r, index) => {
    const phone = contactPhone(r[phoneCol] ?? "");
    if (!phone) {
      invalid.push(index + (hasHeader ? 2 : 1));
      return;
    }
    if (seen.has(phone)) {
      duplicates++;
      return;
    }
    seen.add(phone);
    contacts.push({ phone, name: (r[nameCol] ?? "").slice(0, 120) });
  });
  return { contacts, invalid, duplicates };
}
