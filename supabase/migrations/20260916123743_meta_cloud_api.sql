begin;
alter table public.tenants add column is_test boolean not null default false;
create table soulvd_private.meta_review_workspaces (
 actor_id uuid primary key references public.users, tenant_id uuid unique not null references public.tenants
);
alter table soulvd_private.meta_review_workspaces enable row level security;
revoke all on soulvd_private.meta_review_workspaces from public,anon,authenticated;
grant all on soulvd_private.meta_review_workspaces to service_role;

-- Operator-only explicit sandbox, never an activation of a merchant's paid plan.
create function public.soulvd_meta_review_workspace(p_actor uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare t uuid; begin
 perform 1 from public.users where id=p_actor and role in ('owner','editor') for update;
 if not found then raise exception 'STAFF_ONLY'; end if;
 select tenant_id into t from soulvd_private.meta_review_workspaces where actor_id=p_actor;
 if found then return t; end if;
 insert into public.tenants(name,is_test) values('Meta review sandbox',true) returning id into t;
 insert into public.tenant_members(tenant_id,user_id,role) values(t,p_actor,'owner');
 insert into public.subscriptions(tenant_id,plan_id,status,period_start,period_end) values(t,'starter_v1','active',now(),now()+interval '30 days');
 insert into soulvd_private.meta_review_workspaces values(p_actor,t);
 return t;
end $$;

alter table public.whatsapp_templates add column language text not null default 'ar';
alter table public.whatsapp_templates add column category text not null default 'UTILITY';
alter table public.whatsapp_templates add column body text not null default '';
alter table public.whatsapp_templates add column provider_status text;
alter table public.whatsapp_templates drop constraint whatsapp_templates_tenant_id_name_key;
alter table public.whatsapp_templates add unique (tenant_id, name, language);

create table soulvd_private.meta_connections (
 number_id uuid primary key references public.whatsapp_numbers on delete cascade,
 waba_id text not null, phone_number_id text not null unique,
 encrypted_token text not null, mode text not null check(mode in ('api','coexistence','test')),
 created_at timestamptz not null default now()
);
create table public.whatsapp_contacts (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants,
 wa_id text not null check(wa_id ~ '^[0-9]{7,15}$'), name text,
 last_inbound_at timestamptz, opted_in_at timestamptz,
 unique(tenant_id, wa_id), unique(tenant_id,id)
);
create table public.whatsapp_messages (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants,
 contact_id uuid not null, number_id uuid not null references public.whatsapp_numbers,
 direction text not null check(direction in ('inbound','outbound')),
 kind text not null, body text not null, status text not null,
 meta_message_id text unique, created_at timestamptz not null default now(),
 foreign key(tenant_id,contact_id) references public.whatsapp_contacts(tenant_id,id)
);
create index whatsapp_messages_tenant_time on public.whatsapp_messages(tenant_id,created_at desc);
create table soulvd_private.meta_events (
 id text primary key, payload jsonb not null, received_at timestamptz not null default now()
);
create table soulvd_private.meta_receipts (
 meta_message_id text primary key, number_id uuid not null references soulvd_private.meta_connections(number_id),
 status text not null, updated_at timestamptz not null default now()
);
create table soulvd_private.meta_jobs (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants,
 number_id uuid not null references soulvd_private.meta_connections(number_id),
 kind text not null check(kind in ('message','template')), resource_id uuid not null,
 request_id uuid not null, payload jsonb not null,
 status text not null default 'queued' check(status in ('queued','processing','accepted','failed','unknown')),
 error_code text, created_at timestamptz not null default now(), claimed_at timestamptz,
 unique(tenant_id,request_id)
);
create index meta_jobs_queue on soulvd_private.meta_jobs(created_at) where status='queued';
create index meta_jobs_number_claimed on soulvd_private.meta_jobs(number_id,claimed_at desc);
do $$ declare t text; begin
 foreach t in array array['whatsapp_contacts','whatsapp_messages'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  execute format('create policy tenant_read on public.%I for select to authenticated using(soulvd_private.is_member(tenant_id))',t);
 end loop;
 foreach t in array array['meta_connections','meta_events','meta_jobs','meta_receipts'] loop
  execute format('alter table soulvd_private.%I enable row level security',t);
  execute format('revoke all on soulvd_private.%I from public,anon,authenticated',t);
  execute format('grant all on soulvd_private.%I to service_role',t);
 end loop;
end $$;

-- Only authenticated server actions / trusted workers call these invoker RPCs.
create function public.soulvd_meta_bind(p_tenant uuid,p_actor uuid,p_phone text,p_waba text,p_number text,p_token text,p_mode text)
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
 if exists(select 1 from soulvd_private.meta_connections where number_id=n and phone_number_id<>p_number) then raise exception 'NUMBER_MISMATCH'; end if;
 insert into soulvd_private.meta_connections(number_id,waba_id,phone_number_id,encrypted_token,mode)
 values(n,p_waba,p_number,p_token,p_mode)
 on conflict(number_id) do update set encrypted_token=excluded.encrypted_token, mode=excluded.mode;
 update public.whatsapp_numbers set status='connected' where id=n;
 return n;
end $$;

-- Acknowledge only after committing the signed event and its inbox updates.
create function public.soulvd_meta_connection(p_tenant uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select to_jsonb(mc) from soulvd_private.meta_connections mc join public.whatsapp_numbers n on n.id=mc.number_id where n.tenant_id=p_tenant order by mc.created_at limit 1;
$$;
create function public.soulvd_meta_sync_templates(p_tenant uuid,p_actor uuid,p_templates jsonb)
returns integer language plpgsql security invoker set search_path='' as $$
declare item jsonb; resource uuid; gate jsonb; state text; updated integer:=0; begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role in ('owner','admin')) then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.subscriptions where tenant_id=p_tenant for update;
 for item in select value from jsonb_array_elements(p_templates) loop
  -- Current console supports plain body-only templates without parameters.
  if item->>'language' not in ('ar','en_US') or item->>'body' is null or item->>'body' ~ '[{}]' then continue; end if;
  state:=case item->>'status' when 'APPROVED' then 'approved' when 'REJECTED' then 'rejected' when 'PENDING' then 'pending' else null end;
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

create function public.soulvd_meta_ingest(p_id text,p_payload jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare e jsonb; ch jsonb; v jsonb; m jsonb; st jsonb; c soulvd_private.meta_connections; t uuid; cid uuid; ts timestamptz; state text;
begin
 insert into soulvd_private.meta_events(id,payload) values(p_id,p_payload) on conflict do nothing;
 if not found then return false; end if;
 for e in select value from jsonb_array_elements(coalesce(p_payload->'entry','[]')) order by value->>'id' loop
  for ch in select value from jsonb_array_elements(coalesce(e->'changes','[]')) loop
   v:=ch->'value';
   if ch->>'field'='message_template_status_update' then
    state:=case v->>'event' when 'APPROVED' then 'approved' when 'REJECTED' then 'rejected' when 'PENDING' then 'pending' else null end;
    update public.whatsapp_templates wt set status=coalesce(state,wt.status),provider_status=v->>'event'
    where wt.name=v->>'message_template_name' and wt.language=v->>'message_template_language'
    and wt.tenant_id in(select n.tenant_id from soulvd_private.meta_connections mc join public.whatsapp_numbers n on n.id=mc.number_id where mc.waba_id=e->>'id');
    continue;
   end if;
   select * into c from soulvd_private.meta_connections where phone_number_id=v->'metadata'->>'phone_number_id';
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

create function public.soulvd_meta_enqueue(p_tenant uuid,p_actor uuid,p_request uuid,p_kind text,p_to text,p_body text,p_template uuid,p_consent boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions; c soulvd_private.meta_connections; n uuid; cid uuid; rid uuid; j soulvd_private.meta_jobs; payload jsonb; gate jsonb; wt public.whatsapp_templates; last_message timestamptz;
begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor) then raise exception 'FORBIDDEN'; end if;
 if p_kind not in ('message','template') or p_kind is null or p_request is null then raise exception 'INVALID_JOB'; end if;
 select * into s from public.subscriptions where tenant_id=p_tenant for update;
 if s.status<>'active' or now()<s.period_start or now()>=s.period_end then return jsonb_build_object('allowed',false,'code','SUBSCRIPTION_INACTIVE'); end if;
 select mc.* into c from soulvd_private.meta_connections mc join public.whatsapp_numbers wn on wn.id=mc.number_id where wn.tenant_id=p_tenant and wn.status='connected' order by mc.created_at limit 1;
 if not found then return jsonb_build_object('allowed',false,'code','NOT_CONNECTED'); end if;
 n:=c.number_id;
 if p_kind='template' then
  if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role in ('owner','admin')) then raise exception 'FORBIDDEN'; end if;
  -- p_body is the validated JSON template submitted by the server action.
  payload:=p_body::jsonb;
 else
  if p_to !~ '^[0-9]{7,15}$' then raise exception 'INVALID_RECIPIENT'; end if;
  if p_template is not null then
   select * into wt from public.whatsapp_templates where id=p_template and tenant_id=p_tenant and status='approved';
   if not found then return jsonb_build_object('allowed',false,'code','TEMPLATE_NOT_APPROVED'); end if;
   payload:=jsonb_build_object('messaging_product','whatsapp','to',p_to,'type','template','template',jsonb_build_object('name',wt.name,'language',jsonb_build_object('code',wt.language)));
  else
   if length(trim(p_body)) not between 1 and 4096 then raise exception 'INVALID_MESSAGE'; end if;
   payload:=jsonb_build_object('messaging_product','whatsapp','to',p_to,'type','text','text',jsonb_build_object('body',p_body));
  end if;
 end if;
 select * into j from soulvd_private.meta_jobs where tenant_id=p_tenant and request_id=p_request;
 if found then
  if j.payload<>payload or j.kind<>p_kind then raise exception 'REQUEST_CONFLICT'; end if;
  return jsonb_build_object('allowed',true,'id',j.id);
 end if;
 if (select count(*) from soulvd_private.meta_jobs where tenant_id=p_tenant and created_at>now()-interval '1 minute')>=30 then return jsonb_build_object('allowed',false,'code','RATE_LIMITED'); end if;
 if p_kind='template' then
  gate:=public.soulvd_create_resource(p_tenant,p_actor,'templates','reserved_'||replace(gen_random_uuid()::text,'-',''));
  if not (gate->>'allowed')::boolean then return gate; end if;
  rid:=(gate->>'id')::uuid;
  update public.whatsapp_templates set name=payload->>'name',language=payload->>'language',category=payload->>'category',body=payload->'components'->0->>'text' where id=rid;
 else
  select id,last_inbound_at into cid,last_message from public.whatsapp_contacts where tenant_id=p_tenant and wa_id=p_to;
  if p_template is null and (last_message is null or last_message<now()-interval '24 hours') then return jsonb_build_object('allowed',false,'code','WINDOW_CLOSED'); end if;
  if p_template is not null and not coalesce(p_consent,false) and not exists(select 1 from public.whatsapp_contacts where id=cid and opted_in_at is not null) then return jsonb_build_object('allowed',false,'code','CONSENT_REQUIRED'); end if;
  gate:=public.soulvd_consume_conversation(p_tenant,'wa:'||p_to);
  if not (gate->>'allowed')::boolean then return gate; end if;
  insert into public.whatsapp_contacts(tenant_id,wa_id,opted_in_at) values(p_tenant,p_to,case when p_consent then now() end)
  on conflict(tenant_id,wa_id) do update set opted_in_at=coalesce(whatsapp_contacts.opted_in_at,excluded.opted_in_at) returning id into cid;
  insert into public.whatsapp_messages(tenant_id,contact_id,number_id,direction,kind,body,status)
  values(p_tenant,cid,n,'outbound',case when p_template is null then 'text' else 'template' end,case when p_template is null then p_body else wt.body end,'queued') returning id into rid;
 end if;
 insert into soulvd_private.meta_jobs(tenant_id,number_id,kind,resource_id,request_id,payload) values(p_tenant,n,p_kind,rid,p_request,payload) returning id into n;
 return jsonb_build_object('allowed',true,'id',n);
end $$;

-- Claim exactly once. Crashed/ambiguous requests are never automatically resent.
create function public.soulvd_meta_claim(p_id uuid default null)
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
 return to_jsonb(j)||jsonb_build_object('waba_id',c.waba_id,'phone_number_id',c.phone_number_id,'encrypted_token',c.encrypted_token);
end $$;
create function public.soulvd_meta_finish(p_id uuid,p_status text,p_meta_id text,p_error text)
returns void language plpgsql security invoker set search_path='' as $$
declare j soulvd_private.meta_jobs; prior_status text; begin
 if p_status not in ('accepted','failed','unknown') then raise exception 'INVALID_STATUS'; end if;
 select * into j from soulvd_private.meta_jobs where id=p_id for update;
 if not found or j.status<>'processing' then return; end if;
 update soulvd_private.meta_jobs set status=p_status,error_code=p_error where id=p_id;
 if j.kind='message' then
  update public.whatsapp_messages set status=p_status,meta_message_id=p_meta_id where id=j.resource_id and status in ('queued','processing');
  -- Delivery webhook can arrive before the HTTP send response is committed.
  select status into prior_status from soulvd_private.meta_receipts where meta_message_id=p_meta_id and number_id=j.number_id;
  if prior_status is not null then update public.whatsapp_messages set status=prior_status where id=j.resource_id; end if;
 else
  update public.whatsapp_templates set status=case when p_status='failed' and status='pending' then 'rejected' else status end,provider_status=case when p_status='accepted' then coalesce(provider_status,'PENDING') else p_status end where id=j.resource_id;
 end if;
end $$;

do $$ declare f record; begin
 for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname like 'soulvd_meta_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
commit;
