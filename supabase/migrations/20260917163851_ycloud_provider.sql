begin;
alter table soulvd_private.meta_connections add column provider text not null default 'meta' check(provider in ('meta','ycloud'));
create or replace function public.soulvd_meta_bind(p_tenant uuid,p_actor uuid,p_phone text,p_waba text,p_number text,p_token text,p_mode text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions; n uuid; lim integer; begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 select * into s from public.subscriptions where tenant_id=p_tenant for update;
 if not found then raise exception 'SUBSCRIPTION_NOT_FOUND'; end if;
 if p_mode='test' then
  if not exists(select 1 from public.users where id=p_actor and role in ('owner','editor')) or not exists(select 1 from public.tenants where id=p_tenant and is_test) then raise exception 'TEST_STAFF_ONLY'; end if;
 elsif s.status<>'active' or now()<s.period_start or now()>=s.period_end then raise exception 'SUBSCRIPTION_INACTIVE'; end if;
 if p_phone !~ '^[+][0-9]{7,15}$' or p_waba !~ '^[0-9]+$' or p_number !~ '^[0-9]+$' or length(p_token)<20 then raise exception 'INVALID_CONNECTION'; end if;
 select number_id into n from soulvd_private.meta_connections where phone_number_id=p_number;
 if found and not exists(select 1 from public.whatsapp_numbers where id=n and tenant_id=p_tenant) then raise exception 'NUMBER_ALREADY_BOUND'; end if;
 select id into n from public.whatsapp_numbers where tenant_id=p_tenant and phone=p_phone;
 if n is null then
  select numbers_limit into lim from public.subscription_plans where id=s.plan_id;
  if (select count(*) from public.whatsapp_numbers where tenant_id=p_tenant)>=lim then raise exception 'NUMBER_LIMIT'; end if;
  insert into public.whatsapp_numbers(tenant_id,phone,status) values(p_tenant,p_phone,'connected') returning id into n;
 end if;
 if exists(select 1 from soulvd_private.meta_connections where number_id=n and (phone_number_id<>p_number or waba_id<>p_waba or provider<>'meta')) then raise exception 'NUMBER_MISMATCH'; end if;
 insert into soulvd_private.meta_connections(number_id,waba_id,phone_number_id,encrypted_token,mode)
 values(n,p_waba,p_number,p_token,p_mode)
 on conflict(number_id) do update set encrypted_token=excluded.encrypted_token, mode=excluded.mode;
 update public.whatsapp_numbers set status='connected' where id=n;
 return n;
end $$;
create or replace function public.soulvd_ycloud_bind(p_tenant uuid,p_actor uuid,p_phone text,p_waba text,p_number text,p_token text,p_mode text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions; n uuid; lim integer; begin
 if not exists(select 1 from public.users where id=p_actor and role in ('owner','editor')) then raise exception 'STAFF_ONLY'; end if;
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 select * into s from public.subscriptions where tenant_id=p_tenant for update;
 if not found then raise exception 'SUBSCRIPTION_NOT_FOUND'; end if;
 if p_mode='test' then
  if not exists(select 1 from public.users where id=p_actor and role in ('owner','editor')) or not exists(select 1 from public.tenants where id=p_tenant and is_test) then raise exception 'TEST_STAFF_ONLY'; end if;
 elsif s.status<>'active' or now()<s.period_start or now()>=s.period_end then raise exception 'SUBSCRIPTION_INACTIVE'; end if;
 if p_phone !~ '^[+][0-9]{7,15}$' or p_waba !~ '^[0-9]+$' or p_number !~ '^[0-9]+$' or length(p_token)<20 then raise exception 'INVALID_CONNECTION'; end if;
 select number_id into n from soulvd_private.meta_connections where phone_number_id=p_number;
 if found and not exists(select 1 from public.whatsapp_numbers where id=n and tenant_id=p_tenant) then raise exception 'NUMBER_ALREADY_BOUND'; end if;
 select id into n from public.whatsapp_numbers where tenant_id=p_tenant and phone=p_phone;
 if n is null then
  select numbers_limit into lim from public.subscription_plans where id=s.plan_id;
  if (select count(*) from public.whatsapp_numbers where tenant_id=p_tenant)>=lim then raise exception 'NUMBER_LIMIT'; end if;
  insert into public.whatsapp_numbers(tenant_id,phone,status) values(p_tenant,p_phone,'connected') returning id into n;
 end if;
 if exists(select 1 from soulvd_private.meta_connections where number_id=n and (phone_number_id<>p_number or waba_id<>p_waba or provider<>'ycloud')) then raise exception 'NUMBER_MISMATCH'; end if;
 insert into soulvd_private.meta_connections(number_id,waba_id,phone_number_id,encrypted_token,mode,provider)
 values(n,p_waba,p_number,p_token,p_mode,'ycloud')
 on conflict(number_id) do update set encrypted_token=excluded.encrypted_token, mode=excluded.mode;
 update public.whatsapp_numbers set status='connected' where id=n;
 return n;
end $$;
create or replace function public.soulvd_meta_ingest(p_id text,p_payload jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare e jsonb; ch jsonb; v jsonb; m jsonb; st jsonb; c soulvd_private.meta_connections; t uuid; cid uuid; ts timestamptz; state text;
begin
 insert into soulvd_private.meta_events(id,payload) values(p_id,p_payload) on conflict do nothing;
 if not found then return false; end if;
 for e in select value from jsonb_array_elements(coalesce(p_payload->'entry','[]')) order by value->>'id' loop
  for ch in select value from jsonb_array_elements(coalesce(e->'changes','[]')) loop
   v:=ch->'value';
   if ch->>'field'='message_template_status_update' then
    state:=case v->>'event' when 'APPROVED' then 'approved' when 'REJECTED' then 'rejected' when 'PENDING' then 'pending' when 'PAUSED' then 'rejected' when 'DISABLED' then 'rejected' when 'ARCHIVED' then 'archived' when 'DELETED' then 'archived' else null end;
    update public.whatsapp_templates wt set status=coalesce(state,wt.status),provider_status=v->>'event'
    where wt.name=v->>'message_template_name' and wt.language=v->>'message_template_language'
    and wt.tenant_id in(select n.tenant_id from soulvd_private.meta_connections mc join public.whatsapp_numbers n on n.id=mc.number_id where mc.waba_id=e->>'id' and mc.provider=coalesce(ch->>'soulvd_provider','meta'));
    continue;
   end if;
   select * into c from soulvd_private.meta_connections where phone_number_id=v->'metadata'->>'phone_number_id' and provider=coalesce(v->>'soulvd_provider','meta');
   if not found or c.waba_id<>e->>'id' then continue; end if;
   select tenant_id into t from public.whatsapp_numbers where id=c.number_id;
   -- Same lock order as enqueue: subscription before contacts and usage.
   perform 1 from public.subscriptions where tenant_id=t for update;
   for m in select value from jsonb_array_elements(coalesce(v->'messages','[]')) loop
    -- Preserve unsupported/identity formats in the raw event for reconciliation.
    if not coalesce(m->>'from' ~ '^[0-9]{7,15}$',false) or m->>'id' is null then continue; end if;
    ts:=least(to_timestamp((m->>'timestamp')::double precision),now());
    insert into public.whatsapp_contacts(tenant_id,wa_id,name,last_inbound_at)
    values(t,m->>'from',v->'contacts'->0->'profile'->>'name',ts)
    on conflict(tenant_id,wa_id) do update set last_inbound_at=greatest(whatsapp_contacts.last_inbound_at,excluded.last_inbound_at)
    returning id into cid;
    insert into public.whatsapp_messages(tenant_id,contact_id,number_id,direction,kind,body,status,meta_message_id,created_at)
    values(t,cid,c.number_id,'inbound',coalesce(m->>'type','unknown'),coalesce(m->'text'->>'body','['||coalesce(m->>'type','unknown')||']'),'received',m->>'id',ts) on conflict(meta_message_id) do nothing;
    -- Never lose inbound messages at the cap. Admission governs subsequent service.
    perform public.soulvd_consume_conversation(t,'wa:'||(m->>'from'));
   end loop;
   for st in select value from jsonb_array_elements(coalesce(v->'statuses','[]')) loop
    state:=st->>'status';
    if state not in ('sent','delivered','read','failed') or st->>'id' is null then continue; end if;
    insert into soulvd_private.meta_receipts(meta_message_id,number_id,status) values(st->>'id',c.number_id,state)
    on conflict(meta_message_id) do update set status=excluded.status,updated_at=now()
    where meta_receipts.number_id=excluded.number_id and
    (case excluded.status when 'read' then 4 when 'delivered' then 3 when 'failed' then 2 else 1 end) >= (case meta_receipts.status when 'read' then 4 when 'delivered' then 3 when 'failed' then 2 else 1 end);
    update public.whatsapp_messages set status=state where tenant_id=t and number_id=c.number_id and meta_message_id=st->>'id'
    and ((state='sent' and status in ('queued','processing','accepted','unknown')) or (state='delivered' and status in ('queued','processing','accepted','unknown','sent')) or (state='read' and status<>'read') or (state='failed' and status in ('queued','processing','accepted','unknown','sent')));
   end loop;
  end loop;
 end loop;
 return true;
end $$;
create or replace function public.soulvd_meta_sync_templates(p_tenant uuid,p_actor uuid,p_templates jsonb)
returns integer language plpgsql security invoker set search_path='' as $$
declare item jsonb; resource uuid; gate jsonb; state text; updated integer:=0; begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role in ('owner','admin')) then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.subscriptions where tenant_id=p_tenant for update;
 for item in select value from jsonb_array_elements(p_templates) loop
  -- Current console supports plain body-only templates without parameters.
  if item->>'language' not in ('ar','en_US') or item->>'body' is null or item->>'body' ~ '[{}]' then continue; end if;
  state:=case item->>'status' when 'APPROVED' then 'approved' when 'REJECTED' then 'rejected' when 'PENDING' then 'pending' when 'PAUSED' then 'rejected' when 'DISABLED' then 'rejected' when 'ARCHIVED' then 'archived' when 'DELETED' then 'archived' else null end;
  if state is null then continue; end if;
  select id into resource from public.whatsapp_templates where tenant_id=p_tenant and name=item->>'name' and language=item->>'language';
  if not found then
   gate:=public.soulvd_create_resource(p_tenant,p_actor,'templates','reserved_'||replace(gen_random_uuid()::text,'-',''));
   if not (gate->>'allowed')::boolean then continue; end if;
   resource:=(gate->>'id')::uuid;
  end if;
  update public.whatsapp_templates set name=item->>'name',language=item->>'language',body=item->>'body',category=item->>'category',status=state,provider_status=item->>'status' where id=resource;
  updated:=updated+1;
 end loop;
 return updated;
end $$;
create or replace function public.soulvd_meta_claim(p_id uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare j soulvd_private.meta_jobs; c soulvd_private.meta_connections; s public.subscriptions; last_message timestamptz; gate jsonb; begin
 -- A crashed worker is ambiguous, not eligible for automatic retry.
 with stale as (update soulvd_private.meta_jobs set status='unknown',error_code='WORKER_INTERRUPTED' where status='processing' and claimed_at<now()-interval '5 minutes' returning resource_id,kind)
 update public.whatsapp_messages set status='unknown' where id in(select resource_id from stale where kind='message') and status='queued';
 select * into j from soulvd_private.meta_jobs candidate where status='queued' and (p_id is null or id=p_id)
 and not exists(select 1 from soulvd_private.meta_jobs recent where recent.number_id=candidate.number_id and recent.claimed_at>now()-interval '1 second') order by created_at for update skip locked limit 1;
 if not found then return null; end if;
 -- A short per-number claim lock spaces dispatches without holding a network transaction.
 if not pg_try_advisory_xact_lock(hashtextextended(j.number_id::text,0)) then return null; end if;
 if exists(select 1 from soulvd_private.meta_jobs where number_id=j.number_id and claimed_at>now()-interval '1 second') then return null; end if;
 select * into s from public.subscriptions where tenant_id=j.tenant_id;
 if s.status<>'active' or now()<s.period_start or now()>=s.period_end then
  update soulvd_private.meta_jobs set status='failed',error_code='SUBSCRIPTION_INACTIVE' where id=j.id;
  if j.kind='message' then update public.whatsapp_messages set status='failed' where id=j.resource_id; else update public.whatsapp_templates set status='rejected',provider_status='SUBSCRIPTION_INACTIVE' where id=j.resource_id; end if;
  return null;
 end if;
 if j.kind='message' then
  gate:=public.soulvd_consume_conversation(j.tenant_id,'wa:'||(j.payload->>'to'));
  if not (gate->>'allowed')::boolean then
   update soulvd_private.meta_jobs set status='failed',error_code=gate->>'code' where id=j.id;
   update public.whatsapp_messages set status='failed' where id=j.resource_id;
   return null;
  end if;
 end if;
 if j.kind='message' and j.payload->>'type'='text' then
  select last_inbound_at into last_message from public.whatsapp_contacts where tenant_id=j.tenant_id and wa_id=j.payload->>'to';
  if last_message is null or last_message<now()-interval '24 hours' then
   update soulvd_private.meta_jobs set status='failed',error_code='WINDOW_CLOSED' where id=j.id;
   update public.whatsapp_messages set status='failed' where id=j.resource_id;
   return null;
  end if;
 end if;
 update soulvd_private.meta_jobs set status='processing',claimed_at=now() where id=j.id;
 select * into c from soulvd_private.meta_connections where number_id=j.number_id;
 return to_jsonb(j)||jsonb_build_object('waba_id',c.waba_id,'phone_number_id',c.phone_number_id,'encrypted_token',c.encrypted_token,'provider',c.provider,'phone',(select phone from public.whatsapp_numbers where id=c.number_id));
end $$;

create function public.soulvd_ycloud_ingest(p_id text,p_payload jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare m jsonb; c soulvd_private.meta_connections; value jsonb; change jsonb; entry jsonb; v_phone text; stamp text;
begin
 if p_id is null or length(p_id) not between 1 and 256 or p_payload->>'id' is distinct from p_id then raise exception 'INVALID_EVENT'; end if;
 if p_payload->>'type'='whatsapp.template.reviewed' then
  m:=p_payload->'whatsappTemplate';
  change:=jsonb_build_object('field','message_template_status_update','soulvd_provider','ycloud','value',jsonb_build_object('event',m->>'status','message_template_name',m->>'name','message_template_language',m->>'language'));
  entry:=jsonb_build_object('id',m->>'wabaId','changes',jsonb_build_array(change));
 elsif p_payload->>'type' in ('whatsapp.inbound_message.received','whatsapp.message.updated') then
  m:=case when p_payload->>'type'='whatsapp.inbound_message.received' then p_payload->'whatsappInboundMessage' else p_payload->'whatsappMessage' end;
  v_phone:=case when p_payload->>'type'='whatsapp.inbound_message.received' then m->>'to' else m->>'from' end;
  select mc.* into c from soulvd_private.meta_connections mc join public.whatsapp_numbers n on n.id=mc.number_id where mc.provider='ycloud' and n.phone=v_phone and mc.waba_id=m->>'wabaId';
  if not found then
   insert into soulvd_private.meta_events(id,payload) values('ycloud:'||p_id,p_payload) on conflict do nothing;
   return found;
  end if;
  value:=jsonb_build_object('soulvd_provider','ycloud','metadata',jsonb_build_object('phone_number_id',c.phone_number_id));
  if p_payload->>'type'='whatsapp.inbound_message.received' then
   -- Actual send time controls the 24h reply window; never substitute arrival time.
   if m->>'sendTime' is null or m->>'id' is null then raise exception 'INVALID_INBOUND'; end if;
   stamp:=extract(epoch from (m->>'sendTime')::timestamptz)::text;
   value:=value||jsonb_build_object('contacts',jsonb_build_array(jsonb_build_object('profile',m->'customerProfile')),'messages',jsonb_build_array(jsonb_build_object('id','ycloud:'||(m->>'id'),'from',regexp_replace(m->>'from','^[+]','','g'),'timestamp',stamp,'type',m->>'type','text',m->'text')));
  else
   if m->>'id' is null then raise exception 'INVALID_RECEIPT'; end if;
   value:=value||jsonb_build_object('statuses',jsonb_build_array(jsonb_build_object('id','ycloud:'||(m->>'id'),'status',m->>'status')));
  end if;
  entry:=jsonb_build_object('id',c.waba_id,'changes',jsonb_build_array(jsonb_build_object('field','messages','value',value)));
 else
  insert into soulvd_private.meta_events(id,payload) values('ycloud:'||p_id,p_payload) on conflict do nothing;
  return found;
 end if;
 return public.soulvd_meta_ingest('ycloud:'||p_id,jsonb_build_object('object','whatsapp_business_account','entry',jsonb_build_array(entry),'source_event',p_payload));
end $$;
revoke all on function public.soulvd_ycloud_bind(uuid,uuid,text,text,text,text,text),public.soulvd_ycloud_ingest(text,jsonb) from public,anon,authenticated;
grant execute on function public.soulvd_ycloud_bind(uuid,uuid,text,text,text,text,text),public.soulvd_ycloud_ingest(text,jsonb) to service_role;

commit;
