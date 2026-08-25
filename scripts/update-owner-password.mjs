// scripts/update-owner-password.mjs
//
// Updates the password of a Supabase auth user.
// Usage: node scripts/update-owner-password.mjs <user-id> <new-password>
//
// The user-id is the auth.users.id (the same id mirrored in public.users).
// Reads SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL from .env.
//
// IMPORTANT: pass the new password on the command line so it never gets
// persisted to a file. Don't echo the password in your shell history.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projRoot = join(__dirname, '..');

function loadEnv() {
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
  } catch {}
}
loadEnv();

const [userId, newPassword] = process.argv.slice(2);

if (!userId || !newPassword) {
  console.error('Usage: node scripts/update-owner-password.mjs <user-id> <new-password>');
  process.exit(1);
}

if (newPassword.length < 6) {
  console.error('Password must be at least 6 characters.');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data, error } = await supabase.auth.admin.updateUserById(userId, {
  password: newPassword,
});

if (error) {
  console.error('FAILED:', error.message);
  process.exit(1);
}

console.log('Password updated for user:', data.user.id);
console.log('Email:', data.user.email);
console.log('Updated at:', data.user.updated_at);
