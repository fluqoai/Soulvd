// src/lib/pdf/styles.ts
// StyleSheet for @react-pdf/renderer. Uses brand-aligned colors (sage/linen/wood).

import { StyleSheet } from '@react-pdf/renderer';
import { PDF_COLORS } from './branding';

export const pdfStyles = StyleSheet.create({
  // Page-level
  page: {
    fontFamily: 'Helvetica',  // built-in; switch to a CJK font if needed
    fontSize: 10,
    color: PDF_COLORS.ink,
    backgroundColor: PDF_COLORS.paper,
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 40,
  },

  // Header band (top of every page)
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.linen200,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandMark: {
    width: 42,
    height: 42,
    marginRight: 10,
  },
  brandNameAr: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PDF_COLORS.ink,
  },
  brandNameEn: {
    fontSize: 9,
    color: PDF_COLORS.ink600,
    marginTop: 1,
  },
  docTypeAr: {
    fontSize: 22,
    fontWeight: 'bold',
    color: PDF_COLORS.sage700,
    textAlign: 'right',
  },
  docMeta: {
    fontSize: 9,
    color: PDF_COLORS.ink700,
    textAlign: 'right',
    marginTop: 4,
  },
  docMetaStrong: {
    fontSize: 11,
    fontWeight: 'bold',
    color: PDF_COLORS.ink,
  },

  // Section heading
  sectionHeading: {
    fontSize: 9,
    fontWeight: 'bold',
    color: PDF_COLORS.sage700,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 16,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.linen200,
  },

  // Client block
  clientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  clientCell: {
    width: '50%',
    paddingRight: 8,
    marginBottom: 6,
  },
  clientLabel: {
    fontSize: 8,
    color: PDF_COLORS.ink600,
    marginBottom: 1,
  },
  clientValue: {
    fontSize: 10,
    color: PDF_COLORS.ink,
  },

  // Line items table
  itemsTable: {
    marginTop: 4,
    marginBottom: 8,
  },
  itemsHeader: {
    flexDirection: 'row',
    backgroundColor: PDF_COLORS.sage700,
    color: PDF_COLORS.paper,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  itemsHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  itemRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.linen200,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  itemRowAlt: {
    flexDirection: 'row',
    backgroundColor: PDF_COLORS.linen,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.linen200,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  itemDesc: {
    width: '52%',
    fontSize: 10,
  },
  itemQty: {
    width: '12%',
    fontSize: 10,
    textAlign: 'right',
  },
  itemPrice: {
    width: '18%',
    fontSize: 10,
    textAlign: 'right',
  },
  itemTotal: {
    width: '18%',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  itemDescAr: {
    width: '52%',
    fontSize: 10,
    textAlign: 'right',
  },
  itemQtyAr: {
    width: '12%',
    fontSize: 10,
    textAlign: 'left',
  },
  itemPriceAr: {
    width: '18%',
    fontSize: 10,
    textAlign: 'left',
  },
  itemTotalAr: {
    width: '18%',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'left',
  },

  // Totals
  totalsWrap: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  totalsBox: {
    width: 220,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  totalsLabel: {
    fontSize: 10,
    color: PDF_COLORS.ink700,
  },
  totalsValue: {
    fontSize: 10,
    color: PDF_COLORS.ink,
  },
  totalsRowGrand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: PDF_COLORS.sage700,
    color: PDF_COLORS.paper,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  totalsLabelGrand: {
    fontSize: 12,
    fontWeight: 'bold',
    color: PDF_COLORS.paper,
  },
  totalsValueGrand: {
    fontSize: 14,
    fontWeight: 'bold',
    color: PDF_COLORS.paper,
  },

  // Notes
  notesBox: {
    marginTop: 18,
    padding: 10,
    backgroundColor: PDF_COLORS.linen,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: PDF_COLORS.sage500,
  },
  notesLabel: {
    fontSize: 8,
    color: PDF_COLORS.ink600,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  notesText: {
    fontSize: 10,
    color: PDF_COLORS.ink,
    lineHeight: 1.5,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.linen200,
  },
  footerLeft: {
    fontSize: 8,
    color: PDF_COLORS.ink600,
    lineHeight: 1.4,
  },
  footerRight: {
    fontSize: 8,
    color: PDF_COLORS.ink600,
    textAlign: 'right',
    lineHeight: 1.4,
  },
  stamp: {
    width: 84,
    height: 84,
    marginLeft: 12,
  },

  // Page number
  pageNumber: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    color: PDF_COLORS.ink600,
  },
});
