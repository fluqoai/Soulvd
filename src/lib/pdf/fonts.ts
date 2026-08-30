// src/lib/pdf/fonts.ts
// Loads + registers the fonts used by the PDF generator with @react-pdf/renderer.
//
// Why Noto Sans Arabic?
//   - SIL Open Font License, free for commercial use.
//   - Ships Arabic, Latin, and digits in one family, so a single Text element
//     with mixed content (e.g. "15% ضريبة") renders correctly.
//   - Hinted TTF, which @react-pdf/renderer supports directly (no WOFF2).
//
// Loaded as base64 data URIs so @react-pdf/renderer can read the font data
// without a network round-trip at render time. Cached at module scope so we
// only do the file I/O and base64 encode once per server lifetime.

import { Font } from '@react-pdf/renderer';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const ARABIC_FONT = 'NotoSansArabic';
export const ARABIC_BOLD_FONT = 'NotoSansArabic-Bold';

let _registered = false;
let _registerPromise: Promise<void> | null = null;

/**
 * Read the font TTF files from public/fonts, base64-encode them, and
 * register them with @react-pdf/renderer. Idempotent: subsequent calls
 * return the same in-flight promise. Safe to call from any server-side
 * context (route handlers, server actions, RSC pages).
 */
export async function ensureFontsRegistered(): Promise<void> {
  if (_registered) return;
  if (_registerPromise) return _registerPromise;

  _registerPromise = (async () => {
    // process.cwd() is the Next.js project root in both `next dev` and
    // `next start` (verified by reading the brand stamp from the same path).
    const fontsDir = path.join(process.cwd(), 'public', 'fonts');
    const [regularBuf, boldBuf] = await Promise.all([
      readFile(path.join(fontsDir, 'NotoSansArabic-Regular.ttf')),
      readFile(path.join(fontsDir, 'NotoSansArabic-Bold.ttf')),
    ]);
    Font.register({
      family: ARABIC_FONT,
      src: `data:font/ttf;base64,${regularBuf.toString('base64')}`,
      fontWeight: 'normal',
    });
    Font.register({
      family: ARABIC_BOLD_FONT,
      src: `data:font/ttf;base64,${boldBuf.toString('base64')}`,
      fontWeight: 'bold',
    });
    _registered = true;
  })();

  return _registerPromise;
}
