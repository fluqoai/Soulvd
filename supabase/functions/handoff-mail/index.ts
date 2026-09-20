// Internal service endpoint. Recipients and message details come only from the database.
Deno.serve(async (request: Request) => {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const base = Deno.env.get('SUPABASE_URL');
  const mailKey = Deno.env.get('TEAM_EMAIL_KEY');
  const callerKey = Deno.env.get('TEAM_INVITATION_SERVICE_KEY');
  const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
  const authorization = request.headers.get('authorization');
  if (!key || !authorization || (authorization !== `Bearer ${key}` && (!callerKey || authorization !== `Bearer ${callerKey}`)))
    return reply({ allowed: false, code: 'FORBIDDEN' }, 403);
  if (request.method !== 'POST') return reply({ allowed: false, code: 'INVALID_INPUT' }, 405);
  if (!base || !mailKey) return reply({ allowed: false, code: 'EMAIL_UNAVAILABLE' }, 503);
  try {
    const raw = await request.text();
    if (raw.length > 256) return reply({ allowed: false, code: 'INVALID_INPUT' }, 400);
    const { run } = JSON.parse(raw);
    if (typeof run !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(run))
      return reply({ allowed: false, code: 'INVALID_INPUT' }, 400);
    const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
    const claim = await fetch(`${base}/rest/v1/rpc/soulvd_handoff_notification`, {
      method: 'POST', headers, body: JSON.stringify({ p_run: run }), signal: AbortSignal.timeout(10000),
    });
    if (!claim.ok) return reply({ allowed: false, code: 'LOOKUP_FAILED' }, 503);
    const handoff = await claim.json();
    if (!handoff.allowed) return reply({ allowed: false, code: handoff.code });
    const url = `https://www.soulvd.sa/app/whatsapp?phone=${encodeURIComponent(handoff.phone)}`;
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mailKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `handoff-${run}` },
      body: JSON.stringify({
        from: Deno.env.get('TEAM_EMAIL_FROM'), to: [handoff.email],
        subject: 'محادثة تحتاج متابعة موظف في Soulvd',
        text: `وصلت محادثة تحتاج متابعة بشرية.\n\nرسالة العميل: ${handoff.message}\n\nافتح المحادثة داخل Soulvd للرد من رقم النشاط: ${url}\n\nإذا لم تكن عضوًا في هذه المساحة، اقبل دعوة الفريق أولًا.`,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!sent.ok) return reply({ allowed: false, code: 'EMAIL_FAILED' }, 503);
    const marked = await fetch(`${base}/rest/v1/whatsapp_contacts?id=eq.${handoff.contact}&tenant_id=eq.${handoff.tenant}&handoff_notified_at=is.null`, {
      method: 'PATCH', headers, body: JSON.stringify({ handoff_notified_at: new Date().toISOString() }), signal: AbortSignal.timeout(10000),
    });
    return reply({ allowed: marked.ok, code: marked.ok ? null : 'MARK_FAILED' });
  } catch {
    return reply({ allowed: false, code: 'EMAIL_FAILED' }, 503);
  }
});
