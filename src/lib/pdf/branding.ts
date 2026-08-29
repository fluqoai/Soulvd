// src/lib/pdf/branding.ts
// Brand constants used across all generated PDF documents.

export const BRAND = {
  nameAr: 'سولڤد',
  nameEn: 'Soulvd',
  taglineAr: 'نحوّل محادثات واتساب إلى مبيعات',
  taglineEn: 'We turn WhatsApp conversations into sales',
  cr: '7054075218',
  vat: '314295103800003',
  addressAr: 'الخبر، المملكة العربية السعودية',
  addressEn: 'Al Khobar, Kingdom of Saudi Arabia',
  email: 'info@soulvd.sa',
  phone: '+966 56 966 8873',
  website: 'soulvd.sa',
  whatsappNumber: '966569668873',
  // Path inside the bucket — the stamp PNG is in `public/brand/`
  // and is served at /brand/soulvd-stamp.png
  stampPath: '/brand/soulvd-stamp.png',
  // Wordmark
  wordmarkPath: '/brand/soulvd-logo.png',
  // Mark
  markPath: '/brand/soulvd-mark.png',
} as const;

export const PDF_COLORS = {
  // Matches the admin design tokens
  ink:       '#2C2A26',
  ink700:    '#4A463E',
  ink600:    '#6B655C',
  ink300:    '#A8A39A',
  ink100:    '#E8E4DA',
  sage:      '#485A4D',
  sage700:   '#3A4A3E',
  sage500:   '#5E7368',
  sage200:   '#C9D2CB',
  sage100:   '#E2E8E3',
  sage50:    '#F0F3EF',
  linen:     '#FAF7F0',
  linen200:  '#E8E2D1',
  linen400:  '#C7B591',
  paper:     '#FFFFFF',
  border:    '#DCD6C6',
  accent:    '#1F4E79',  // the blue used in the .docx templates
  red:       '#B23B3B',
  amber:     '#A86A2C',
  amber100:  '#FCEFD8',
  amber800:  '#7E511E',
  red100:    '#FADCDC',
  red800:    '#8E2828',
} as const;
