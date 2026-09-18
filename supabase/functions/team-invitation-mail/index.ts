// Internal service endpoint. Normal user JWTs and publishable keys cannot send mail.
Deno.serve(async (request: Request) => {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const base = Deno.env.get('SUPABASE_URL');
  const mailKey = Deno.env.get('TEAM_EMAIL_KEY');
  const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  const callerKey = Deno.env.get('TEAM_INVITATION_SERVICE_KEY');
  const authorization = request.headers.get('authorization');
  if (!key || !authorization || (authorization !== `Bearer ${key}` && (!callerKey || authorization !== `Bearer ${callerKey}`))) return reply({ allowed: false, code: 'FORBIDDEN' }, 403);
  if (request.method !== 'POST') return reply({ allowed: false, code: 'INVALID_INPUT' }, 405);
  if (!mailKey || !base) return reply({ allowed: false, code: 'EMAIL_FAILED' });
  try {
    const raw = await request.text();
    if (raw.length > 2048) return reply({ allowed: false, code: 'INVALID_INPUT' }, 413);
    const input = JSON.parse(raw);
    const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    if (![input.tenant,input.actor,input.invitation].every(v => typeof v === 'string' && uuid.test(v))) return reply({ allowed: false, code: 'INVALID_INPUT' }, 400);
    const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
    const claim = await fetch(`${base}/rest/v1/rpc/soulvd_invitation_delivery`, { method: 'POST', headers, body: JSON.stringify({ p_tenant: input.tenant, p_actor: input.actor, p_invite: input.invitation }), signal: AbortSignal.timeout(10000) });
    if (!claim.ok) return reply({ allowed: false, code: 'ACTION_FAILED' });
    const invitation = await claim.json();
    if (!invitation.email) return reply({ allowed: false, code: invitation.code ?? 'ACTION_FAILED' });
    const url = `https://www.soulvd.sa/join/${input.invitation}`;
    const sent = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${mailKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `team-invite-${input.invitation}-${invitation.deliveryKey}` }, body: JSON.stringify({ from: Deno.env.get('TEAM_EMAIL_FROM'), to: [invitation.email], subject: 'دعوة للانضمام إلى فريق Soulvd', text: `تمت دعوتك إلى فريق ${invitation.name} في Soulvd.\nافتح الرابط لإنشاء حساب عضو فريق أو تسجيل الدخول ثم قبول الدعوة:\n${url}\n\nصالحة 7 أيام من إنشائها. إذا لم تكن تتوقع الدعوة، يمكنك تجاهلها.` }), signal: AbortSignal.timeout(15000) });
    if (!sent.ok) return reply({ allowed: false, code: 'EMAIL_FAILED' });
    await fetch(`${base}/rest/v1/tenant_invitations?id=eq.${input.invitation}&tenant_id=eq.${input.tenant}&delivery_key=eq.${invitation.deliveryKey}`, { method: 'PATCH', headers, body: JSON.stringify({ email_sent_at: new Date().toISOString() }), signal: AbortSignal.timeout(10000) });
    return reply({ allowed: true, invitationId: input.invitation });
  } catch { return reply({ allowed: false, code: 'EMAIL_FAILED' }); }
});
