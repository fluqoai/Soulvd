// Copy the already-authorized Resend SMTP credentials into server-only Edge secrets.
const ref = 'lyvoiipsmcbffvpkrxhy';
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) throw new Error('SUPABASE_ACCESS_TOKEN is required');
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const url = `https://api.supabase.com/v1/projects/${ref}`;
const project = await fetch(url, { headers });
if (!project.ok || (await project.json()).name.toLowerCase() !== 'soulvd') throw new Error('Wrong project');
const response = await fetch(url + '/config/auth', { headers });
if (!response.ok) throw new Error('Cannot read authorized mail configuration');
const auth = await response.json();
const mailKey = process.env.RESEND_API_KEY ?? auth.smtp_pass;
if (auth.smtp_host !== 'smtp.resend.com' || !mailKey?.startsWith('re_') || !auth.smtp_admin_email) throw new Error('Verified Resend SMTP configuration required');
const callerKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!callerKey) throw new Error('The existing server service credential is required');
const saved = await fetch(url + '/secrets', { method: 'POST', headers, body: JSON.stringify([{ name: 'TEAM_EMAIL_KEY', value: mailKey }, { name: 'TEAM_EMAIL_FROM', value: `Soulvd <${auth.smtp_admin_email}>` }, { name: 'TEAM_INVITATION_SERVICE_KEY', value: callerKey }]) });
if (!saved.ok) throw new Error('Secret provisioning failed: ' + saved.status);
console.log('Team mail secrets configured from existing SMTP. No credential values logged.');
