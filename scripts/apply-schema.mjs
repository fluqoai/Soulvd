// scripts/apply-schema.mjs
//
// Applies supabase/migrations/0001_initial_schema.sql to the configured Supabase project.
//
// Usage:
//   node scripts/apply-schema.mjs                  # uses SUPABASE_DB_PASSWORD from .env
//   SUPABASE_DB_PASSWORD=xxx node scripts/apply-schema.mjs
//
// The connection details come from the .env file (NEXT_PUBLIC_SUPABASE_URL) or env vars.
// The DB password is REQUIRED — Supabase direct Postgres connections don't accept the
// service-role JWT as a password. Get yours from:
//   Supabase dashboard -> Project Settings -> Database -> Connection string

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projRoot = join(__dirname, '..');

function loadEnv() {
  // Minimal .env loader (no deps)
  try {
    const raw = readFileSync(join(projRoot, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (m && !process.env[m[1]]) {
        let v = m[2];
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        process.env[m[1]] = v;
      }
    }
  } catch {
    // .env is optional
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ref = url.replace(/^https?:\/\//, '').split('.')[0];

if (!ref) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL not set in .env');
  process.exit(1);
}

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error('ERROR: SUPABASE_DB_PASSWORD not set.');
  console.error('  Get it from: Supabase dashboard -> Project Settings -> Database -> Connection string');
  console.error('  Then either add it to .env or pass it inline:');
  console.error('    SUPABASE_DB_PASSWORD=xxx node scripts/apply-schema.mjs');
  process.exit(1);
}

const host = `db.${ref}.supabase.co`;
const port = 5432;
const database = 'postgres';
const user = 'postgres';

const sqlPath = join(projRoot, 'supabase', 'migrations', '0001_initial_schema.sql');
const sql = readFileSync(sqlPath, 'utf8');

console.log('---');
console.log('Project:    ', ref);
console.log('Connecting: ', `postgresql://${user}@${host}:${port}/${database}`);
console.log('Migration:  ', sqlPath);
console.log('SQL length: ', sql.length, 'chars');
console.log('---');

const client = new pg.Client({
  host,
  port,
  user,
  password,
  database,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
});

try {
  await client.connect();
  console.log('Connected. Applying schema...');
  // We split on the do $$ block at the end which contains raise notice — pg can handle
  // multi-statement SQL but a single .query() works for our file.
  await client.query(sql);
  console.log('---');
  console.log('Schema applied successfully.');
  console.log('---');
  // Quick verification
  const { rows: tables } = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name;
  `);
  console.log('Tables in public schema:');
  for (const r of tables) console.log('  -', r.table_name);
  const { rows: buckets } = await client.query(`
    select id, name, public from storage.buckets order by id;
  `);
  console.log('Storage buckets:');
  for (const r of buckets) console.log('  -', r.id, '(public:', r.public + ')');
} catch (e) {
  console.error('FAILED:', e.message);
  if (e.code) console.error('Code:', e.code);
  process.exit(1);
} finally {
  await client.end();
}
