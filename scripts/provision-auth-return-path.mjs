// Preserve invitation destinations without allowing redirects off Soulvd.
const ref = 'lyvoiipsmcbffvpkrxhy';
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) throw new Error('SUPABASE_ACCESS_TOKEN is required');
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const url = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const read = await fetch(url, { headers });
if (!read.ok) throw new Error('Cannot read Auth configuration');
const auth = await read.json();
if (auth.site_url !== 'https://www.soulvd.sa') throw new Error('Wrong Auth site');
const oldLink = 'https://www.soulvd.sa/api/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email';
const newLink = oldLink + '&amp;redirect_to={{ .RedirectTo | urlquery }}';
const template = auth.mailer_templates_confirmation_content;
if (!template?.includes(oldLink)) throw new Error('Unexpected confirmation template');
const redirects = new Set(auth.uri_allow_list.split(',').filter(Boolean));
redirects.add('https://www.soulvd.sa/api/auth/confirm?next=**');
const body = {
  uri_allow_list: [...redirects].join(','),
  mailer_templates_confirmation_content: template.includes('redirect_to={{ .RedirectTo | urlquery }}') ? template : template.replace(oldLink, newLink),
};
const saved = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body) });
if (!saved.ok) throw new Error('Auth update failed: ' + saved.status);
const verified = await (await fetch(url, { headers })).json();
if (verified.mailer_templates_confirmation_content !== body.mailer_templates_confirmation_content || verified.uri_allow_list !== body.uri_allow_list) throw new Error('Auth update verification failed');
console.log('Confirmation destinations configured and verified. Credentials were not logged.');
