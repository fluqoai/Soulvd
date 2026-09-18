import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname, 'lyvoiipsmcbffvpkrxhy.supabase.co');
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const bucket = await admin.storage.getBucket('conversation-media');
assert.equal(bucket.data?.public, false);
assert.equal(Number(bucket.data.file_size_limit), 3_800_000);
const invalid = await admin.functions.invoke('team-invitation-mail', { body: {} });
assert.equal(invalid.error?.context?.status, 400);
const denied = await anon.functions.invoke('team-invitation-mail', { body: {} });
assert.ok([401, 403].includes(denied.error?.context?.status));
const privateRpc = await anon.rpc('soulvd_message_media', { p_tenant: randomUUID(), p_actor: randomUUID(), p_message: randomUUID() });
assert.equal(privateRpc.error?.code, '42501');
console.log('PASS: live private bucket, upload cap, service mail validation, anonymous mail/media denial. No mail sent.');

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) throw new Error('SUPABASE_ACCESS_TOKEN required for rollback integration check');
const tenant = randomUUID();
const query = `begin;
do $$ declare actor uuid; invite jsonb; delivery jsonb; begin
  select user_id into actor from public.tenant_members where tenant_id='feda22b7-f85d-40bb-8a4a-d713fc8e07d0' and role='owner' limit 1;
  if actor is null then raise exception 'TEST_ACTOR_MISSING'; end if;
  insert into public.tenants(id,name,is_test) values('${tenant}','Transactional repair verification',true);
  insert into public.tenant_members(tenant_id,user_id,role) values('${tenant}',actor,'owner');
  insert into public.subscriptions(tenant_id,plan_id,status,period_start,period_end) values('${tenant}','starter_v1','active',now()-interval '1 day',now()+interval '29 days');
  invite := public.soulvd_invite_member('${tenant}',actor,'repair-fixture@example.invalid','agent');
  if not (invite->>'allowed')::boolean then raise exception 'TEST_INVITE_FAILED'; end if;
  delivery := public.soulvd_invitation_delivery('${tenant}',actor,(invite->>'invitationId')::uuid);
  if delivery->>'email' <> 'repair-fixture@example.invalid' or delivery->>'deliveryKey' is null then raise exception 'TEST_DELIVERY_FAILED'; end if;
  delivery := public.soulvd_invitation_delivery('${tenant}',actor,(invite->>'invitationId')::uuid);
  if delivery->>'code' <> 'RETRY_LATER' then raise exception 'TEST_COOLDOWN_FAILED'; end if;
  if not public.soulvd_revoke_invitation('${tenant}',actor,(invite->>'invitationId')::uuid) then raise exception 'TEST_REVOKE_FAILED'; end if;
end $$;
rollback;
select not exists(select 1 from public.tenants where id='${tenant}') as rolled_back;`;
const response = await fetch('https://api.supabase.com/v1/projects/lyvoiipsmcbffvpkrxhy/database/query', {
  method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
});
if (!response.ok) throw new Error('Rollback integration check failed: ' + response.status);
const result = await response.json();
assert.equal(result[0]?.rolled_back, true);
console.log('PASS: real PostgreSQL invitation reservation, delivery claim/cooldown and cancellation. Fixture rolled back; no customer records changed.');
