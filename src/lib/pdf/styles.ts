// src/lib/pdf/styles.ts
// StyleSheet for the bilingual (Arabic + English) tax-invoice PDF.
// Built on @react-pdf/renderer. Uses Noto Sans Arabic (registered in
// ./fonts.ts) as the base font; it ships with both Arabic and Latin
// glyphs so a single font family covers the whole document.
//
// Layout: each client/seller field is a 3-column row
//   [English label] [value] [Arabic label]
// so the value (which is the same Latin/numeric text in both languages)
// appears only once. The two labels flank it.

import { StyleSheet } from '@react-pdf/renderer';
import { PDF_COLORS } from './branding';
import { ARABIC_FONT, ARABIC_BOLD_FONT } from './fonts';

const FONT_REG = ARABIC_FONT;
const FONT_BOLD = ARABIC_BOLD_FONT;

export const pdfStyles = StyleSheet.create({
  // ============== Page ==============
  page: {
    fontFamily: FONT_REG,
    fontSize: 10,
    color: PDF_COLORS.ink,
    backgroundColor: PDF_COLORS.paper,
    paddingTop: 36,
    paddingBottom: 80,   // leave room for the fixed footer
    paddingHorizontal: 40,
    lineHeight: 1.4,
  },

  // ============== Header (top of every page) ==============
  // Two-column layout: brand on the left, doc-info card on the right.
  // The card is sage-tinted with a left accent bar so the document number
  // and dates read as a clear "letterhead block" rather than a list of
  // metadata strings crammed next to the title.
  headerBand: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    paddingBottom: 14,
    marginBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: PDF_COLORS.sage700,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  brandMark: {
    width: 52,
    height: 52,
    marginRight: 14,
  },
  brandNameAr: {
    fontFamily: FONT_BOLD,
    fontSize: 20,
    color: PDF_COLORS.ink,
    textAlign: 'left',
    letterSpacing: 0.2,
  },
  brandNameEn: {
    fontSize: 10.5,
    color: PDF_COLORS.ink600,
    marginTop: 2,
    textAlign: 'left',
    letterSpacing: 1.5,
  },
  brandTagline: {
    fontSize: 8.5,
    color: PDF_COLORS.ink600,
    marginTop: 4,
    textAlign: 'left',
    fontFamily: FONT_REG,
  },

  // Right side: a structured doc-info block. English micro-label on top
  // (sage, uppercase, letter-spaced), Arabic title below, then a tinted
  // sage "pill" for the document number, then a clean row for the date.
  // Visual hierarchy: number > title > date > label.
  headerRight: {
    alignItems: 'flex-end',
    minWidth: 240,
  },
  docTypeLabel: {
    fontSize: 9,
    fontFamily: FONT_BOLD,
    color: PDF_COLORS.sage700,
    letterSpacing: 2.5,
    textAlign: 'right',
  },
  docTypeAr: {
    fontFamily: FONT_BOLD,
    fontSize: 17,
    color: PDF_COLORS.ink,
    marginTop: 2,
    textAlign: 'right',
  },
  docNumberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PDF_COLORS.sage50,
    borderLeftWidth: 3,
    borderLeftColor: PDF_COLORS.sage700,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  docNumberLabel: {
    fontSize: 7.5,
    fontFamily: FONT_BOLD,
    color: PDF_COLORS.ink600,
    letterSpacing: 1.5,
    marginRight: 8,
  },
  docNumberValue: {
    fontFamily: FONT_BOLD,
    fontSize: 13,
    color: PDF_COLORS.ink,
    letterSpacing: 0.3,
  },
  docDateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  docDateLabel: {
    fontSize: 7.5,
    fontFamily: FONT_BOLD,
    color: PDF_COLORS.ink600,
    letterSpacing: 1.5,
    marginRight: 8,
  },
  docDateValueAr: {
    fontSize: 9,
    color: PDF_COLORS.ink,
    marginRight: 6,
  },
  docDateSep: {
    fontSize: 9,
    color: PDF_COLORS.ink300,
    marginRight: 6,
  },
  docDateValueEn: {
    fontSize: 9,
    color: PDF_COLORS.ink600,
  },

  // ============== Section heading ==============
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    fontFamily: FONT_BOLD,
    fontSize: 9,
    color: PDF_COLORS.sage700,
    letterSpacing: 0.8,
    marginBottom: 4,
    marginTop: 12,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.linen200,
  },
  sectionHeadingAr: { textAlign: 'right' },
  sectionHeadingEn: { textAlign: 'left' },

  // ============== 3-column field row (En label | value | Ar label) ==============
  // The value is in the middle so it appears only once (not duplicated
  // in both languages). For long values (address, notes) the value
  // takes a full-width row with both labels stacked above.
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    paddingVertical: 2,
  },
  fieldRowWide: {
    flexDirection: 'column',
    marginBottom: 6,
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.linen200,
  },
  fieldLabelEn: {
    width: '30%',
    fontSize: 8,
    color: PDF_COLORS.ink600,
    textAlign: 'left',
  },
  fieldValue: {
    width: '40%',
    fontSize: 9.5,
    color: PDF_COLORS.ink,
    textAlign: 'center',
  },
  fieldLabelAr: {
    width: '30%',
    fontSize: 8,
    color: PDF_COLORS.ink600,
    textAlign: 'right',
  },
  // For wide rows: labels on top, value below (bilingual)
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  fieldValueWide: {
    fontSize: 9.5,
    color: PDF_COLORS.ink,
    textAlign: 'right',
  },

  // ============== Line items table ==============
  itemsTable: {
    marginTop: 4,
    marginBottom: 6,
  },
  itemsHeader: {
    flexDirection: 'row',
    backgroundColor: PDF_COLORS.sage700,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  itemsHeaderCellAr: {
    color: PDF_COLORS.paper,
    fontFamily: FONT_BOLD,
    fontSize: 9,
    textAlign: 'right',
  },
  itemsHeaderCellEn: {
    color: PDF_COLORS.paper,
    fontFamily: FONT_BOLD,
    fontSize: 9,
    textAlign: 'left',
  },
  itemsHeaderCellNum: {
    color: PDF_COLORS.paper,
    fontFamily: FONT_BOLD,
    fontSize: 9,
    textAlign: 'right',
  },

  colDesc:  { width: '58%' },
  colQty:   { width: '10%' },
  colPrice: { width: '14%' },
  colTotal: { width: '18%' },

  itemRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.linen200,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  itemRowAlt: {
    flexDirection: 'row',
    backgroundColor: PDF_COLORS.linen,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.linen200,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  itemDescCell: {
    width: '58%',
    flexDirection: 'column',
  },
  itemDescAr: {
    fontSize: 10,
    color: PDF_COLORS.ink,
    textAlign: 'right',
  },
  itemDescEn: {
    fontSize: 8.5,
    color: PDF_COLORS.ink600,
    textAlign: 'left',
    marginTop: 1,
  },
  itemNum: {
    fontSize: 10,
    color: PDF_COLORS.ink,
    textAlign: 'right',
  },
  itemTotal: {
    fontFamily: FONT_BOLD,
    fontSize: 10,
    color: PDF_COLORS.ink,
    textAlign: 'right',
  },

  // ============== Totals box (bilingual) ==============
  totalsWrap: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  totalsBox: {
    width: 300,
    borderWidth: 0.5,
    borderColor: PDF_COLORS.linen200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.linen200,
  },
  totalsRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  totalsLabels: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    flexGrow: 1,
  },
  totalsLabelAr: {
    fontSize: 9,
    color: PDF_COLORS.ink700,
    textAlign: 'right',
  },
  totalsLabelEn: {
    fontSize: 7.5,
    color: PDF_COLORS.ink600,
    textAlign: 'right',
    marginTop: 1,
  },
  totalsValue: {
    fontSize: 9.5,
    color: PDF_COLORS.ink,
    marginLeft: 14,
    minWidth: 80,
    textAlign: 'right',
  },
  totalsRowGrand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: PDF_COLORS.sage700,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  totalsLabelsGrand: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    flexGrow: 1,
  },
  totalsLabelArGrand: {
    fontFamily: FONT_BOLD,
    fontSize: 11,
    color: PDF_COLORS.paper,
    textAlign: 'right',
  },
  totalsLabelEnGrand: {
    fontSize: 8.5,
    color: PDF_COLORS.paper,
    textAlign: 'right',
    marginTop: 1,
  },
  totalsValueGrand: {
    fontFamily: FONT_BOLD,
    fontSize: 13,
    color: PDF_COLORS.paper,
    marginLeft: 14,
    minWidth: 90,
    textAlign: 'right',
  },

  // ============== Notes (bilingual) ==============
  notesBox: {
    marginTop: 10,
    padding: 8,
    backgroundColor: PDF_COLORS.linen,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: PDF_COLORS.sage500,
  },
  notesLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  notesLabelAr: {
    fontFamily: FONT_BOLD,
    fontSize: 8.5,
    color: PDF_COLORS.sage700,
    textAlign: 'right',
  },
  notesLabelEn: {
    fontFamily: FONT_BOLD,
    fontSize: 8.5,
    color: PDF_COLORS.sage700,
    textAlign: 'left',
  },
  notesText: {
    fontSize: 9,
    color: PDF_COLORS.ink,
    lineHeight: 1.4,
    textAlign: 'right',
  },

  // ============== Footer (full-width, bilingual) ==============
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.linen200,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerCol: {
    flexDirection: 'column',
    flex: 1,
  },
  footerColAr: { alignItems: 'flex-end' },
  footerColEn: { alignItems: 'flex-start' },
  footerLine: {
    fontSize: 8,
    color: PDF_COLORS.ink600,
    lineHeight: 1.5,
  },
  footerLineAr: { textAlign: 'right' },
  footerLineEn: { textAlign: 'left' },
  thanks: {
    fontSize: 9,
    color: PDF_COLORS.sage700,
    fontFamily: FONT_BOLD,
    marginTop: 4,
    textAlign: 'center',
  },
  stamp: {
    width: 72,
    height: 72,
    marginHorizontal: 10,
  },

  // ============== Page number ==============
  pageNumber: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 7.5,
    color: PDF_COLORS.ink600,
  },

  // ============== Muted / placeholder ==============
  muted: { color: PDF_COLORS.ink600 },
});
