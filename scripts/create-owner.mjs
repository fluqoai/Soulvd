// scripts/create-owner.mjs
//
// Creates a new auth user via the Supabase Admin API and promotes them
// to 'owner' in public.users. Use this for the first user; later
// owner/editor invites happen via the admin panel.
//
// Usage:
//   node scripts/create-owner.mjs --email you@example.com --password 'YourSecurePass1!' --name 'Your Name'
//
//   or (interactive):
//   node scripts/create-owner.mjs

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projRoot = join(__dirname, '..');

function loadEnv() {
  try {
    const raw = readFileSync(join(projRoot, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (m && !process.env[m[1]]) {
        let v = m[2];
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        process.env[m[1]] = v;
      }
    }
  } catch {}
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env'); process.exit(1); }

const service = createClient(url, serviceKey, { auth: { persistSession: false } });

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? process.argv[i + 1] : def;
}

const email = arg('email');
const password = arg('password');
const name = arg('name', '');

async function main() {
  if (!email || !password) {
    console.error('Usage:');
    console.error('  node scripts/create-owner.mjs --email you@example.com --password "YourSecurePass1!" [--name "Your Name"]');
    process.exit(1);
  }

  console.log(`Creating user ${email} ...`);

  // 1. Create the auth user (auto-confirm so they can log in immediately)
  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: name ? { full_name: name } : undefined,
  });
  if (createErr) {
    if (createErr.message?.includes('already')) {
      console.log('User already exists, skipping auth creation.');
    } else {
      console.error('Auth create error:', createErr.message);
      process.exit(1);
    }
  } else {
    console.log('  auth user created:', created.user.id);
  }

  // 2. Wait a beat for the trigger to create the public.users row
  await new Promise((r) => setTimeout(r, 500));

  // 3. Promote to owner
  const { data: updated, error: updErr } = await service
    .from('users')
    .update({ role: 'owner', full_name: name || undefined })
    .eq('email', email)
    .select('id, email, role, full_name');

  if (updErr) {
    console.error('Promote error:', updErr.message);
    process.exit(1);
  }
  if (!updated || updated.length === 0) {
    console.error('No public.users row found. The trigger may not have fired. Try logging in once to trigger it, then re-run.');
    process.exit(1);
  }
  console.log('  promoted:', updated[0]);
  console.log('\nDone. You can now sign in at /login with this email/password.');
}

main().catch((e) => { console.error(e); process.exit(1); });
