'use client';

import { useEffect } from 'react';

/** Supabase's invitation emails return credentials in a URL fragment. */
export function AuthInviteRedirect() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const type = params.get('type');
    if ((type === 'invite' || type === 'recovery') &&
        params.has('access_token') && params.has('refresh_token') &&
        !window.location.pathname.endsWith('/set-password')) {
      // Keep credentials in the fragment: they never enter server request URLs.
      window.location.replace(`/set-password${window.location.hash}`);
    }
  }, []);
  return null;
}
