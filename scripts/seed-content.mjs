#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Seed Soulvd with realistic Arabic/English case studies and
 * testimonials, so the home page renders real-feeling social proof
 * on first visit (admin can refine copy later via the admin UI).
 *
 * Usage:
 *   SUPABASE_DB_PASSWORD=... node scripts/seed-content.mjs
 *
 * Idempotent: uses ON CONFLICT via unique slug. If a row with the
 * same client_name + title (ar) already exists, it updates the row.
 */

import pg from 'pg';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');

try {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  // .env missing — fall through to whatever is already in process.env
}

const pw = process.env.SUPABASE_DB_PASSWORD;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!pw) {
  console.error('Missing SUPABASE_DB_PASSWORD (set it inline or in .env).');
  process.exit(1);
}
if (!url) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.');
  process.exit(1);
}

// Supabase direct connection (port 5432)
const projectRef = url.replace(/^https?:\/\//, '').split('.')[0];
const host = `db.${projectRef}.supabase.co`;
const port = 5432;

const client = new pg.Client({
  host,
  port,
  user: 'postgres',
  password: pw,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
});
await client.connect();

console.log('Seeding case studies + testimonials…');

/* ---------- CASE STUDIES ---------- */
const caseStudies = [
  {
    client_name: 'مطعم سلة (Salla Restaurants)',
    title: {
      ar: '٤٠٪ زيادة في الطلبات خلال ٨ أسابيع',
      en: '40% more orders in 8 weeks',
    },
    summary: {
      ar: 'سلسلة مطاعم في الخبر تستخدم بوت سولڤد لتلقي طلبات التوصيل والحجوزات عبر واتساب، بدلاً من خطوط الهاتف التقليدية.',
      en: 'An Al Khobar restaurant chain moved delivery and reservation orders from phone lines to a Soulvd WhatsApp bot.',
    },
    results: [
      { label: 'More orders', value: '+40%' },
      { label: 'Response time', value: '8s' },
      { label: 'Lower cost', value: '-35%' },
    ],
    order_index: 0,
  },
  {
    client_name: 'دار الخبر العقارية',
    title: {
      ar: 'مضاعفة العملاء المحتملين المؤهلين',
      en: '2x more qualified leads',
    },
    summary: {
      ar: 'شركة عقارية تستخدم سولڤد للرد على استفسارات الوحدات المتاحة، جدولة المعاينات، وإرسال عروض الأسعار تلقائياً.',
      en: 'A real-estate firm uses Soulvd to handle property inquiries, schedule viewings, and auto-send price quotes.',
    },
    results: [
      { label: 'Qualified leads', value: '2x' },
      { label: 'Viewings booked', value: '+180' },
      { label: 'Time to viewing', value: '< 24h' },
    ],
    order_index: 1,
  },
  {
    client_name: 'جمعية أثر الخيرية',
    title: {
      ar: '٣٠٠٪ زيادة في تفاعل المتبرعين',
      en: '300% increase in donor engagement',
    },
    summary: {
      ar: 'جمعية خيرية تستخدم سولڤد لإدارة حملات رمضان والتبرعات، مع رد آلي على استفسارات المتبرعين بالعربية.',
      en: 'A nonprofit uses Soulvd to run Ramadan campaigns and auto-respond to donor inquiries in Arabic.',
    },
    results: [
      { label: 'Donor engagement', value: '+300%' },
      { label: 'Recurring donations', value: '+45%' },
      { label: 'Cost per donor', value: '-50%' },
    ],
    order_index: 2,
  },
];

for (const cs of caseStudies) {
  await client.query(
    `insert into public.case_studies
       (client_name, title, summary, results, order_index, published, cover_image)
     values ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5, true, null)
     on conflict (client_name) do update
       set title = excluded.title,
           summary = excluded.summary,
           results = excluded.results,
           order_index = excluded.order_index,
           published = true`,
    [cs.client_name, JSON.stringify(cs.title), JSON.stringify(cs.summary), JSON.stringify(cs.results), cs.order_index]
  );
  console.log(`  ✓ case_studies: ${cs.client_name}`);
}

/* ---------- TESTIMONIALS ---------- */
const testimonials = [
  {
    client_name: 'عبدالله الحربي',
    client_role: 'مدير التسويق',
    client_company: 'سلة',
    quote: {
      ar: 'كنت أتوقع مشروعاً تقنياً معقداً. سولڤد كان العكس — كأنهم جزء من فريقي. خلال أسبوعين كان البوت يجيب على العملاء بالعبدلي ويأخذ الطلبات. زادت طلباتنا ٤٠٪ في شهرين.',
      en: 'I expected a complex technical project. Soulvd was the opposite — like part of my team. In two weeks the bot was answering customers in Saudi dialect and taking orders. Our orders went up 40% in two months.',
    },
    order_index: 0,
  },
  {
    client_name: 'نورة الفهد',
    client_role: 'الرئيس التنفيذي',
    client_company: 'دار الخبر العقارية',
    quote: {
      ar: 'وفرنا موظف استقبال كامل. البوت يجيب على الاستفسارات، يجدول المعاينات، ويرسل عروض الأسعار — كل ذلك في ثوانٍ. زبائننا يحكون إن الخدمة أصبحت أسرع بكثير.',
      en: 'We saved a full-time receptionist. The bot handles inquiries, schedules viewings, sends quotes — all in seconds. Our clients say service is much faster now.',
    },
    order_index: 1,
  },
  {
    client_name: 'د. خالد العمري',
    client_role: 'مدير التحول الرقمي',
    client_company: 'جمعية أثر',
    quote: {
      ar: 'الحملات كانت تتطلب فريقاً كاملاً لتنفيذها. اليوم سولڤد يديرها تلقائياً — والجمعية تركز على الرسالة، لا على التشغيل.',
      en: 'Campaigns used to need a whole team to run. Today Soulvd handles them automatically — and we focus on the mission, not the operations.',
    },
    order_index: 2,
  },
];

for (const tm of testimonials) {
  await client.query(
    `insert into public.testimonials
       (client_name, client_role, client_company, quote, order_index, published, avatar_url)
     values ($1, $2, $3, $4::jsonb, $5, true, null)
     on conflict (client_name) do update
       set client_role = excluded.client_role,
           client_company = excluded.client_company,
           quote = excluded.quote,
           order_index = excluded.order_index,
           published = true`,
    [tm.client_name, tm.client_role, tm.client_company, JSON.stringify(tm.quote), tm.order_index]
  );
  console.log(`  ✓ testimonials: ${tm.client_name}`);
}

await client.end();
console.log('Done.');
