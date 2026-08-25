// src/lib/supabase/admin.ts
// Service-role Supabase client. BYPASSES RLS. Server-only — never import from
// client components. Use this for admin operations that need to bypass RLS.

import 'server-only';
import { createClient } from '@supabase/supabase-js';

let _client: ReturnType<typeof createClient> | null = null;

export function createAdminClient() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return _client;
}
