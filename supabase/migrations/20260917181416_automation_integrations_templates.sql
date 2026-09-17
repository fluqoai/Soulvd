begin;
alter table public.whatsapp_contacts add column bot_paused boolean not null default false;
alter table public.whatsapp_contacts add column marketing_opted_out boolean not null default false;
alter table public.automation_flows add column created_by uuid references public.users;
alter table public.automation_flows add column priority integer not null default 100;
create table public.bot_settings (
 tenant_id uuid primary key references public.tenants, enabled boolean not null default false,
 instructions text not null default '' check(length(instructions)<=4000),
 daily_limit integer not null default 20 check(daily_limit between 1 and 100),
 cooldown_seconds integer not null default 60 check(cooldown_seconds between 10 and 86400)
);
create table public.bot_knowledge (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants,
 title text not null check(length(title) between 1 and 120),
 content text not null check(length(content) between 1 and 8000), created_at timestamptz not null default now()
);
create table public.automation_runs (
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants,
 message_id uuid not null unique references public.whatsapp_messages, flow_id uuid references public.automation_flows,
 state text not null default 'queued' check(state in ('queued','processing','draft','sent','skipped','failed','handoff')),
 output text, error_code text, input_tokens integer, output_tokens integer,
 created_at timestamptz not null default now(),claimed_at timestamptz, finished_at timestamptz,
 request_id uuid not null default gen_random_uuid()
);
create index automation_queue on public.automation_runs(created_at) where state='queued';
create index automation_tenant_time on public.automation_runs(tenant_id,created_at desc);
create index bot_knowledge_tenant_time on public.bot_knowledge(tenant_id,created_at);
create index automation_flows_tenant_priority on public.automation_flows(tenant_id,priority,id) where status<>'archived';
create index whatsapp_contact_message_time on public.whatsapp_messages(tenant_id,contact_id,created_at desc);
create table public.ai_daily_usage (
 tenant_id uuid not null references public.tenants,day date not null,requests integer not null default 0,
 primary key(tenant_id,day)
);
create table public.crm_integrations (
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants,
 name text not null check(length(name) between 1 and 120),
 endpoint_url text not null check(length(endpoint_url)<=2048),
 status text not null default 'pending_payment' check(status in ('pending_payment','paid','active','disabled')),
 fee_halalas integer not null default 10000 check(fee_halalas=10000),
 created_at timestamptz not null default now()
);
create table soulvd_private.crm_credentials (
 integration_id uuid primary key references public.crm_integrations,
 api_key_hash text unique not null, signing_secret text not null, expires_at timestamptz not null default now()+interval '90 days'
);
create unique index crm_tenant_endpoint on public.crm_integrations(tenant_id,endpoint_url);
create table public.crm_deliveries (
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants,
 integration_id uuid not null references public.crm_integrations,event_type text not null,
 message_id uuid not null references public.whatsapp_messages,
 payload jsonb not null,status text not null default 'queued' check(status in ('queued','processing','delivered','failed')),
 attempts integer not null default 0,next_attempt_at timestamptz not null default now(),
 claimed_at timestamptz,http_status integer,error_code text,created_at timestamptz not null default now(),
 unique(integration_id,message_id,event_type)
);
create index crm_queue on public.crm_deliveries(next_attempt_at) where status='queued';
create index crm_tenant_time on public.crm_deliveries(tenant_id,created_at desc);
create table soulvd_private.crm_rate_limits(integration_id uuid references public.crm_integrations,minute timestamptz,hits integer not null,primary key(integration_id,minute));
alter table soulvd_private.bank_transfers drop constraint bank_transfers_purpose_check;
alter table soulvd_private.bank_transfers add constraint bank_transfers_purpose_check check(purpose in ('subscription','upgrade','integration'));
alter table soulvd_private.bank_transfers add column integration_id uuid references public.crm_integrations;
create table public.template_drafts (
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants,
 name text not null,body text not null check(length(body) between 1 and 1024),
 category text not null check(category in ('UTILITY','MARKETING')),language text not null check(language in ('ar','en_US')),
 examples jsonb not null default '[]',library_key text,
 created_at timestamptz not null default now()
);
alter table public.whatsapp_templates add column parameter_count integer not null default 0 check(parameter_count between 0 and 10);
create index template_drafts_tenant_time on public.template_drafts(tenant_id,created_at desc);
do $$ declare t text; begin
 foreach t in array array['bot_settings','bot_knowledge','automation_runs','ai_daily_usage','crm_integrations','crm_deliveries','template_drafts'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  execute format('create policy tenant_read on public.%I for select to authenticated using(soulvd_private.is_member(tenant_id))',t);
 end loop;
 foreach t in array array['crm_credentials','crm_rate_limits'] loop
  execute format('alter table soulvd_private.%I enable row level security',t);
  execute format('revoke all on soulvd_private.%I from public,anon,authenticated',t);
  execute format('grant all on soulvd_private.%I to service_role',t);
 end loop;
end $$;

-- One shared admission lock keeps subscription changes, plan caps and writes atomic.
create function soulvd_private.require_manager(p_tenant uuid,p_actor uuid,p_pro boolean default false)
returns void language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions; begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role in ('owner','admin')) then raise exception 'FORBIDDEN'; end if;
 select * into s from public.subscriptions where tenant_id=p_tenant for update;
 if not found or s.status<>'active' or now()<s.period_start or now()>=s.period_end then raise exception 'SUBSCRIPTION_INACTIVE'; end if;
 if p_pro and s.plan_id<>'pro_growth_v1' then raise exception 'PRO_REQUIRED'; end if;
end $$;
revoke all on function soulvd_private.require_manager(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function soulvd_private.require_manager(uuid,uuid,boolean) to service_role;

create function public.soulvd_studio_save(p_tenant uuid,p_actor uuid,p_kind text,p_id uuid,p_data jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare rid uuid; lim integer; begin
 perform soulvd_private.require_manager(p_tenant,p_actor,p_kind='integration' or (p_kind='draft' and p_data->>'library_key' is not null));
 if p_kind='flow' then
  if p_data->>'status' not in ('draft','active','archived') or p_data->'definition'->>'action' not in ('text','ai','handoff') or p_data->'definition'->>'mode' not in ('auto','draft') then raise exception 'INVALID_FLOW'; end if;
  if p_id is null then
   select flows_limit into lim from public.subscription_plans where id=(select plan_id from public.subscriptions where tenant_id=p_tenant);
   if lim is not null and (select count(*) from public.automation_flows where tenant_id=p_tenant and status<>'archived')>=lim then raise exception 'LIMIT_EXCEEDED'; end if;
   insert into public.automation_flows(tenant_id,name,definition,status,created_by,priority) values(p_tenant,p_data->>'name',p_data->'definition',p_data->>'status',p_actor,(p_data->>'priority')::integer) returning id into rid;
  else
   if not exists(select 1 from public.automation_flows where id=p_id and tenant_id=p_tenant and status<>'archived') then raise exception 'NOT_FOUND'; end if;
   update public.automation_flows set name=p_data->>'name',definition=p_data->'definition',status=p_data->>'status',priority=(p_data->>'priority')::integer,created_by=p_actor where id=p_id and tenant_id=p_tenant returning id into rid;
  end if;
 elsif p_kind='settings' then
  insert into public.bot_settings(tenant_id,enabled,instructions,daily_limit,cooldown_seconds) values(p_tenant,(p_data->>'enabled')::boolean,p_data->>'instructions',(p_data->>'daily_limit')::integer,(p_data->>'cooldown_seconds')::integer)
  on conflict(tenant_id) do update set enabled=excluded.enabled,instructions=excluded.instructions,daily_limit=excluded.daily_limit,cooldown_seconds=excluded.cooldown_seconds;
  rid:=p_tenant;
 elsif p_kind='knowledge' then
  if p_id is null then
   if (select count(*) from public.bot_knowledge where tenant_id=p_tenant)>=50 then raise exception 'LIMIT_EXCEEDED'; end if;
   insert into public.bot_knowledge(tenant_id,title,content) values(p_tenant,p_data->>'title',p_data->>'content') returning id into rid;
  else update public.bot_knowledge set title=p_data->>'title',content=p_data->>'content' where id=p_id and tenant_id=p_tenant returning id into rid; end if;
 elsif p_kind='draft' then
  if (select count(*) from public.template_drafts where tenant_id=p_tenant)>=200 and p_id is null then raise exception 'LIMIT_EXCEEDED'; end if;
  if p_id is null then
   insert into public.template_drafts(tenant_id,name,body,category,language,examples,library_key) values(p_tenant,p_data->>'name',p_data->>'body',p_data->>'category',p_data->>'language',p_data->'examples',p_data->>'library_key') returning id into rid;
  else update public.template_drafts set name=p_data->>'name',body=p_data->>'body',category=p_data->>'category',language=p_data->>'language',examples=p_data->'examples' where id=p_id and tenant_id=p_tenant returning id into rid; end if;
 elsif p_kind='integration' then
  if p_id is not null then raise exception 'IMMUTABLE_ENDPOINT'; end if;
  select id into rid from public.crm_integrations where tenant_id=p_tenant and endpoint_url=p_data->>'endpoint_url';
  if found then return rid; end if;
  if (select count(*) from public.crm_integrations where tenant_id=p_tenant)>=20 then raise exception 'LIMIT_EXCEEDED'; end if;
  insert into public.crm_integrations(tenant_id,name,endpoint_url) values(p_tenant,p_data->>'name',p_data->>'endpoint_url') returning id into rid;
 else raise exception 'INVALID_KIND'; end if;
 if rid is null then raise exception 'NOT_FOUND'; end if;
 return rid;
end $$;

-- Message persistence and enqueue are in the same transaction. Duplicate provider events cannot trigger a second run.
create function soulvd_private.queue_message_work() returns trigger language plpgsql security invoker set search_path='' as $$
declare ev text; begin
 if tg_op='INSERT' and new.direction='inbound' and trim(new.body) ~* '^(إيقاف|ايقاف|توقف|stop|unsubscribe)[.!؟[:space:]]*$' then
  update public.whatsapp_contacts set bot_paused=true,marketing_opted_out=true,opted_in_at=null where id=new.contact_id and tenant_id=new.tenant_id;
 end if;
 if tg_op='INSERT' and new.direction='inbound' and new.kind='text' then
  insert into public.automation_runs(tenant_id,message_id) select new.tenant_id,new.id where exists(select 1 from public.bot_settings where tenant_id=new.tenant_id and enabled) on conflict do nothing;
 end if;
 ev:=case when new.direction='inbound' then 'message.received' else 'message.'||new.status end;
 if (tg_op='INSERT' and new.direction='inbound') or (tg_op='UPDATE' and new.status is distinct from old.status and new.direction='outbound' and new.status in ('accepted','sent','delivered','read','failed','unknown')) then
  insert into public.crm_deliveries(tenant_id,integration_id,event_type,message_id,payload)
  select new.tenant_id,i.id,ev,new.id,jsonb_build_object('type',ev,'message',jsonb_build_object('id',new.id,'direction',new.direction,'body',new.body,'status',new.status,'created_at',new.created_at,'contact', (select wa_id from public.whatsapp_contacts where id=new.contact_id and tenant_id=new.tenant_id)))
  from public.crm_integrations i join public.subscriptions s on s.tenant_id=i.tenant_id
  where i.tenant_id=new.tenant_id and i.status='active' and s.status='active' and s.plan_id='pro_growth_v1' and now()>=s.period_start and now()<s.period_end on conflict do nothing;
 end if; return new;
end $$;
revoke all on function soulvd_private.queue_message_work() from public,anon,authenticated;
grant execute on function soulvd_private.queue_message_work() to service_role;
create trigger queue_message_work after insert or update of status on public.whatsapp_messages for each row execute function soulvd_private.queue_message_work();

create function public.soulvd_automation_claim() returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.automation_runs; m public.whatsapp_messages; begin
 -- Serialize only the short claim transaction so two workers cannot claim two messages for one contact.
 perform pg_advisory_xact_lock(hashtextextended('soulvd-automation-claim',0));
 update public.automation_runs set state='failed',error_code='WORKER_INTERRUPTED',finished_at=now() where state='processing' and claimed_at<now()-interval '5 minutes';
 select * into r from public.automation_runs q where state='queued'
 and not exists(select 1 from public.automation_runs busy join public.whatsapp_messages bm on bm.id=busy.message_id join public.whatsapp_messages qm on qm.id=q.message_id where busy.state='processing' and bm.contact_id=qm.contact_id)
 order by created_at limit 1 for update skip locked;
 if not found then return null; end if;
 update public.automation_runs set state='processing',claimed_at=now() where id=r.id;
 select * into m from public.whatsapp_messages where id=r.message_id;
 return to_jsonb(r)||jsonb_build_object('message',to_jsonb(m),'contact',(select to_jsonb(c) from public.whatsapp_contacts c where id=m.contact_id),'settings',(select to_jsonb(b) from public.bot_settings b where tenant_id=r.tenant_id),'subscription',(select to_jsonb(s) from public.subscriptions s where tenant_id=r.tenant_id),'flows',coalesce((select jsonb_agg(f order by f.priority,f.id) from public.automation_flows f where f.tenant_id=r.tenant_id and f.status='active'),'[]'));
end $$;
create function public.soulvd_ai_reserve(p_tenant uuid,p_run uuid) returns boolean language plpgsql security invoker set search_path='' as $$
declare lim integer; used integer; begin
 select daily_limit into lim from public.bot_settings where tenant_id=p_tenant and enabled for update;
 if not found or not exists(select 1 from public.automation_runs where id=p_run and tenant_id=p_tenant and state='processing') then return false; end if;
 insert into public.ai_daily_usage(tenant_id,day,requests) values(p_tenant,(now() at time zone 'Asia/Riyadh')::date,0) on conflict do nothing;
 update public.ai_daily_usage set requests=requests+1 where tenant_id=p_tenant and day=(now() at time zone 'Asia/Riyadh')::date and requests<lim returning requests into used;
 return found;
end $$;
create function public.soulvd_automation_send(p_run uuid,p_actor uuid,p_body text,p_manual boolean default false) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.automation_runs; m public.whatsapp_messages; c public.whatsapp_contacts; result jsonb; begin
 select * into r from public.automation_runs where id=p_run;
 if not found then raise exception 'NOT_FOUND'; end if;
 perform 1 from public.subscriptions where tenant_id=r.tenant_id for update;
 select * into r from public.automation_runs where id=p_run for update;
 if (p_manual and r.state<>'draft') or (not p_manual and r.state<>'processing') then raise exception 'RUN_ALREADY_FINISHED'; end if;
 if not exists(select 1 from public.tenant_members where tenant_id=r.tenant_id and user_id=p_actor and role in ('owner','admin')) then raise exception 'FORBIDDEN'; end if;
 select * into m from public.whatsapp_messages where id=r.message_id;
 select * into c from public.whatsapp_contacts where id=m.contact_id for update;
 if not p_manual and (c.bot_paused or not exists(select 1 from public.bot_settings where tenant_id=r.tenant_id and enabled) or not exists(select 1 from public.automation_flows where id=r.flow_id and status='active') or exists(select 1 from public.whatsapp_messages where contact_id=c.id and direction='outbound' and created_at>m.created_at)) then
  update public.automation_runs set state='skipped',error_code='HUMAN_TAKEOVER',finished_at=now() where id=r.id;
  return jsonb_build_object('allowed',false,'code','HUMAN_TAKEOVER');
 end if;
 result:=public.soulvd_meta_enqueue(r.tenant_id,p_actor,r.request_id,'message',c.wa_id,p_body,null,false);
 update public.automation_runs set state=case when (result->>'allowed')::boolean then 'sent' else 'skipped' end,output=p_body,error_code=result->>'code',finished_at=now() where id=r.id;
 return result;
end $$;

create function public.soulvd_crm_confirm(p_actor uuid,p_id uuid,p_reference text,p_amount integer) returns boolean language plpgsql security invoker set search_path='' as $$
declare i public.crm_integrations; b soulvd_private.bank_transfers; begin
 if not exists(select 1 from public.users where id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 if p_reference is null or length(trim(p_reference)) not between 3 and 120 then raise exception 'INVALID_REFERENCE'; end if;
 perform pg_advisory_xact_lock(hashtextextended(trim(p_reference),0));
 select * into i from public.crm_integrations where id=p_id for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if exists(select 1 from public.tenants where id=i.tenant_id and is_test) then raise exception 'TEST_WORKSPACE'; end if;
 if p_amount is distinct from i.fee_halalas then raise exception 'AMOUNT_MISMATCH'; end if;
 select * into b from soulvd_private.bank_transfers where reference=trim(p_reference);
 if found then
  if b.integration_id=p_id and b.purpose='integration' and b.amount_halalas=p_amount then return true; end if;
  raise exception 'REFERENCE_ALREADY_USED';
 end if;
 if i.status<>'pending_payment' then raise exception 'ALREADY_PAID'; end if;
 insert into soulvd_private.bank_transfers(reference,tenant_id,actor_id,purpose,amount_halalas,integration_id) values(trim(p_reference),i.tenant_id,p_actor,'integration',p_amount,p_id);
 update public.crm_integrations set status='paid' where id=p_id;
 return true;
end $$;
create function public.soulvd_crm_credentials(p_tenant uuid,p_actor uuid,p_id uuid,p_hash text,p_secret text,p_disable boolean default false) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform soulvd_private.require_manager(p_tenant,p_actor,true);
 perform 1 from public.crm_integrations where id=p_id and tenant_id=p_tenant and status in ('paid','active','disabled') for update;
 if not found then raise exception 'PAYMENT_REQUIRED'; end if;
 if p_disable then update public.crm_integrations set status='disabled' where id=p_id; return true; end if;
 if length(p_hash)<>64 or length(p_secret)<20 then raise exception 'INVALID_CREDENTIALS'; end if;
 insert into soulvd_private.crm_credentials(integration_id,api_key_hash,signing_secret) values(p_id,p_hash,p_secret)
 on conflict(integration_id) do update set api_key_hash=excluded.api_key_hash,signing_secret=excluded.signing_secret,expires_at=now()+interval '90 days';
 update public.crm_integrations set status='active' where id=p_id;
 return true;
end $$;
create function public.soulvd_crm_auth(p_hash text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare i public.crm_integrations; used integer; actor uuid; begin
 select x.* into i from public.crm_integrations x join soulvd_private.crm_credentials c on c.integration_id=x.id join public.subscriptions s on s.tenant_id=x.tenant_id where c.api_key_hash=p_hash and c.expires_at>now() and x.status='active' and s.status='active' and s.plan_id='pro_growth_v1' and now()>=s.period_start and now()<s.period_end;
 if not found then return null; end if;
 insert into soulvd_private.crm_rate_limits values(i.id,date_trunc('minute',now()),1) on conflict(integration_id,minute) do update set hits=crm_rate_limits.hits+1 where crm_rate_limits.hits<60 returning hits into used;
 if not found then return jsonb_build_object('limited',true); end if;
 select user_id into actor from public.tenant_members where tenant_id=i.tenant_id and role='owner' order by user_id limit 1;
 if actor is null then return null; end if;
 return jsonb_build_object('tenant',i.tenant_id,'actor',actor,'integration',i.id);
end $$;
create function public.soulvd_crm_claim() returns jsonb language plpgsql security invoker set search_path='' as $$
declare d public.crm_deliveries; i public.crm_integrations; c soulvd_private.crm_credentials; begin
 update public.crm_deliveries set status=case when attempts>=5 then 'failed' else 'queued' end,next_attempt_at=now(),error_code='WORKER_INTERRUPTED' where status='processing' and claimed_at<now()-interval '2 minutes';
 select * into d from public.crm_deliveries where status='queued' and next_attempt_at<=now() order by next_attempt_at limit 1 for update skip locked;
 if not found then return null; end if;
 select * into i from public.crm_integrations where id=d.integration_id;
 select * into c from soulvd_private.crm_credentials where integration_id=i.id;
 if i.status<>'active' or c.expires_at is null or c.expires_at<=now() or not exists(select 1 from public.subscriptions where tenant_id=d.tenant_id and status='active' and plan_id='pro_growth_v1' and now()>=period_start and now()<period_end) then
  update public.crm_deliveries set status='failed',error_code='INTEGRATION_INACTIVE' where id=d.id; return jsonb_build_object('skipped',true);
 end if;
 update public.crm_deliveries set status='processing',attempts=attempts+1,claimed_at=now() where id=d.id;
 return to_jsonb(d)||jsonb_build_object('attempt',d.attempts+1,'url',i.endpoint_url,'secret',c.signing_secret);
end $$;
do $$ declare f record; begin
 for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname in ('soulvd_studio_save','soulvd_automation_claim','soulvd_ai_reserve','soulvd_automation_send','soulvd_crm_confirm','soulvd_crm_credentials','soulvd_crm_auth','soulvd_crm_claim') loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
commit;
