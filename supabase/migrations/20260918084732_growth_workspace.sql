begin;
create table public.audience_contacts (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants,
 phone text not null check(phone ~ '^[1-9][0-9]{7,14}$'), name text not null default '' check(length(name)<=120),
 segment text not null default '' check(length(segment)<=80), consent_source text not null default '' check(length(consent_source)<=300),
 consent_at timestamptz, suppressed boolean not null default false, created_at timestamptz not null default now(),
 unique(tenant_id,phone), unique(tenant_id,id)
);
create index audience_segment on public.audience_contacts(tenant_id,segment);
create table public.workspace_guides (
 tenant_id uuid primary key references public.tenants, data jsonb not null check(octet_length(data::text)<=20000),
 updated_at timestamptz not null default now(), submitted_at timestamptz, flow_id uuid references public.automation_flows, knowledge_id uuid references public.bot_knowledge
);
create table public.campaigns (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants,
 name text not null check(length(name) between 1 and 120), segment text not null default '',
 template_id uuid references public.whatsapp_templates, parameters jsonb not null default '[]',
 state text not null default 'draft' check(state in ('draft','running','paused','completed','cancelled')),
 created_by uuid not null references public.users, created_at timestamptz not null default now(),
 error_code text, unique(tenant_id,id)
);
create index campaigns_tenant on public.campaigns(tenant_id,created_at desc);
create index campaigns_running on public.campaigns(created_at) where state='running';
create table public.campaign_recipients (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, campaign_id uuid not null,
 contact_id uuid not null, request_id uuid not null default gen_random_uuid(),
 state text not null default 'pending' check(state in ('pending','queued','skipped')),
 message_id uuid references public.whatsapp_messages, error_code text,
 foreign key(tenant_id,campaign_id) references public.campaigns(tenant_id,id) on delete cascade,
 foreign key(tenant_id,contact_id) references public.audience_contacts(tenant_id,id), unique(campaign_id,contact_id)
);
create index campaign_pending on public.campaign_recipients(campaign_id,id) where state='pending';
create index campaign_recipients_tenant on public.campaign_recipients(tenant_id,campaign_id);
do $$ declare t text; begin
 foreach t in array array['audience_contacts','workspace_guides','campaigns','campaign_recipients'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  execute format('create policy tenant_read on public.%I for select to authenticated using(soulvd_private.is_member(tenant_id))',t);
 end loop;
end $$;

create function soulvd_private.preparation_manager(p_tenant uuid,p_actor uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role in ('owner','admin')) then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.subscriptions where tenant_id=p_tenant for update;
 if not found then raise exception 'NOT_FOUND'; end if;
end $$;
revoke all on function soulvd_private.preparation_manager(uuid,uuid) from public,anon,authenticated;
grant execute on function soulvd_private.preparation_manager(uuid,uuid) to service_role;

create function public.soulvd_import_audience(p_tenant uuid,p_actor uuid,p_rows jsonb,p_segment text,p_source text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r jsonb; added integer:=0; existing integer:=0; begin
 perform soulvd_private.preparation_manager(p_tenant,p_actor);
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 500 or length(p_segment)>80 or length(p_source)>300 then raise exception 'INVALID_IMPORT'; end if;
 for r in select value from jsonb_array_elements(p_rows) loop
  if coalesce(r->>'phone','') !~ '^[1-9][0-9]{7,14}$' or length(coalesce(r->>'name',''))>120 then raise exception 'INVALID_IMPORT'; end if;
  -- Existing records are deliberately preserved, including suppression and consent evidence.
  if exists(select 1 from public.audience_contacts where tenant_id=p_tenant and phone=r->>'phone') then existing:=existing+1; continue; end if;
  if (select count(*) from public.audience_contacts where tenant_id=p_tenant)>=20000 then raise exception 'CONTACT_LIMIT'; end if;
  insert into public.audience_contacts(tenant_id,phone,name,segment,consent_source,consent_at)
   values(p_tenant,r->>'phone',coalesce(r->>'name',''),p_segment,p_source,case when length(trim(p_source))>=3 then now() end);
  added:=added+1;
 end loop;
 return jsonb_build_object('added',added,'existing',existing);
end $$;

create function public.soulvd_save_guide(p_tenant uuid,p_actor uuid,p_data jsonb) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform soulvd_private.preparation_manager(p_tenant,p_actor);
 if p_data->>'goal' not in ('automation','assistant','integration') or octet_length(p_data::text)>20000 then raise exception 'INVALID_GUIDE'; end if;
 insert into public.workspace_guides(tenant_id,data) values(p_tenant,p_data) on conflict(tenant_id) do update set data=excluded.data,updated_at=now(),submitted_at=case when workspace_guides.data=excluded.data then workspace_guides.submitted_at else null end;
end $$;

create function public.soulvd_submit_guide(p_tenant uuid,p_actor uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform soulvd_private.preparation_manager(p_tenant,p_actor);
 update public.workspace_guides set submitted_at=coalesce(submitted_at,now()) where tenant_id=p_tenant and data->>'goal'='integration' and length(trim(data->>'need'))>=10 and length(trim(data->>'system'))>=1;
 if not found then raise exception 'INVALID_GUIDE'; end if;
end $$;
revoke all on function public.soulvd_submit_guide(uuid,uuid) from public,anon,authenticated;
grant execute on function public.soulvd_submit_guide(uuid,uuid) to service_role;

create function public.soulvd_apply_guide(p_tenant uuid,p_actor uuid,p_flow jsonb,p_knowledge text) returns uuid language plpgsql security invoker set search_path='' as $$
declare g public.workspace_guides; fid uuid; kid uuid; begin
 perform soulvd_private.require_manager(p_tenant,p_actor,false);
 select * into g from public.workspace_guides where tenant_id=p_tenant for update;
 if not found or g.data->>'goal'='integration' or p_flow->>'status' is distinct from 'draft' or p_flow->'definition'->>'mode' is distinct from 'draft' then raise exception 'INVALID_GUIDE'; end if;
 fid:=public.soulvd_studio_save(p_tenant,p_actor,'flow',g.flow_id,p_flow);
 kid:=g.knowledge_id;
 if length(trim(p_knowledge))>0 then kid:=public.soulvd_studio_save(p_tenant,p_actor,'knowledge',kid,jsonb_build_object('title','معلومات النشاط — الإعداد الموجّه','content',p_knowledge)); end if;
 update public.workspace_guides set flow_id=fid,knowledge_id=kid where tenant_id=p_tenant;
 return fid;
end $$;

create function public.soulvd_campaign_save(p_tenant uuid,p_actor uuid,p_id uuid,p_name text,p_segment text,p_template uuid,p_parameters jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare rid uuid; begin
 perform soulvd_private.preparation_manager(p_tenant,p_actor);
 if p_template is not null and not exists(select 1 from public.whatsapp_templates where tenant_id=p_tenant and id=p_template) then raise exception 'NOT_FOUND'; end if;
 if jsonb_typeof(p_parameters) is distinct from 'array' or jsonb_array_length(p_parameters)>10 or length(p_segment)>80 then raise exception 'INVALID_PARAMETERS'; end if;
 if p_id is null then
  if (select count(*) from public.campaigns where tenant_id=p_tenant)>=100 then raise exception 'CAMPAIGN_LIMIT'; end if;
  insert into public.campaigns(tenant_id,name,segment,template_id,parameters,created_by) values(p_tenant,p_name,p_segment,p_template,p_parameters,p_actor) returning id into rid;
 else
  update public.campaigns set name=p_name,segment=p_segment,template_id=p_template,parameters=p_parameters,created_by=p_actor where id=p_id and tenant_id=p_tenant and state='draft' returning id into rid;
 end if;
 if rid is null then raise exception 'IMMUTABLE_CAMPAIGN'; end if;
 return rid;
end $$;

create function public.soulvd_campaign_control(p_tenant uuid,p_actor uuid,p_id uuid,p_action text) returns void language plpgsql security invoker set search_path='' as $$
declare c public.campaigns; t public.whatsapp_templates; begin
 perform soulvd_private.preparation_manager(p_tenant,p_actor);
 select * into c from public.campaigns where id=p_id and tenant_id=p_tenant for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if p_action='pause' and c.state='running' then update public.campaigns set state='paused' where id=c.id; return; end if;
 if p_action='cancel' and c.state in ('draft','running','paused') then update public.campaigns set state='cancelled' where id=c.id; return; end if;
 if p_action is distinct from 'start' or c.state not in ('draft','paused') then raise exception 'INVALID_STATE'; end if;
 perform soulvd_private.require_manager(p_tenant,p_actor,false);
 if not exists(select 1 from public.whatsapp_numbers where tenant_id=p_tenant and status='connected') then raise exception 'NOT_CONNECTED'; end if;
 select * into t from public.whatsapp_templates where tenant_id=p_tenant and id=c.template_id and status='approved';
 if not found then raise exception 'TEMPLATE_NOT_APPROVED'; end if;
 if jsonb_array_length(c.parameters)<>t.parameter_count or exists(select 1 from jsonb_array_elements(c.parameters) x where jsonb_typeof(x)<>'string' or length(x#>>'{}') not between 1 and 1000) then raise exception 'INVALID_PARAMETERS'; end if;
 if c.state='draft' then
  if (select count(*) from public.audience_contacts where tenant_id=p_tenant and (c.segment='' or segment=c.segment) and consent_at is not null and not suppressed)>5000 then raise exception 'AUDIENCE_TOO_LARGE'; end if;
  insert into public.campaign_recipients(tenant_id,campaign_id,contact_id)
   select p_tenant,c.id,a.id from public.audience_contacts a where a.tenant_id=p_tenant and (c.segment='' or a.segment=c.segment) and a.consent_at is not null and not a.suppressed
   and not exists(select 1 from public.whatsapp_contacts w where w.tenant_id=p_tenant and w.wa_id=a.phone and w.marketing_opted_out);
 end if;
 if not exists(select 1 from public.campaign_recipients where campaign_id=c.id and state='pending') then raise exception 'EMPTY_AUDIENCE'; end if;
 update public.campaigns set state='running',error_code=null,created_by=p_actor where id=c.id;
end $$;

-- One admission per worker call: durable, idempotent and constrained by the existing wallet/quotas.
create function public.soulvd_campaign_tick() returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.campaigns; r public.campaign_recipients; a public.audience_contacts; result jsonb; begin
 -- Subscription first, then campaign, matching all interactive operations.
 select x.* into c from public.campaigns x join public.subscriptions s on s.tenant_id=x.tenant_id where x.state='running' order by x.created_at limit 1 for update of s skip locked;
 if not found then return null; end if;
 select * into c from public.campaigns where id=c.id and state='running' for update;
 if not found then return null; end if;
 select * into r from public.campaign_recipients where campaign_id=c.id and state='pending' order by id limit 1 for update;
 if not found then update public.campaigns set state='completed' where id=c.id; return null; end if;
 select * into a from public.audience_contacts where id=r.contact_id;
 if a.suppressed or a.consent_at is null or exists(select 1 from public.whatsapp_contacts where tenant_id=c.tenant_id and wa_id=a.phone and marketing_opted_out) then
  update public.campaign_recipients set state='skipped',error_code='CONSENT_REQUIRED' where id=r.id; return jsonb_build_object('skipped',true);
 end if;
 if not exists(select 1 from public.tenant_members where tenant_id=c.tenant_id and user_id=c.created_by and role in ('owner','admin')) then update public.campaigns set state='paused',error_code='FORBIDDEN' where id=c.id; return null; end if;
 begin
  result:=public.soulvd_enqueue_message(c.tenant_id,c.created_by,r.request_id,'message',a.phone,'',c.template_id,true,c.parameters);
 exception when others then
  -- Roll back admission (including conversation usage) before persisting the pause reason.
  update public.campaigns set state='paused',error_code=case when sqlerrm in ('WALLET_INSUFFICIENT','WALLET_RATE_UNAVAILABLE','INVALID_PARAMETERS','FORBIDDEN') then sqlerrm else 'ADMISSION_FAILED' end where id=c.id;
  return jsonb_build_object('allowed',false,'code',sqlerrm);
 end;
 if (result->>'allowed')::boolean then
  update public.campaign_recipients set state='queued',message_id=(result->>'message_id')::uuid where id=r.id;
 elsif result->>'code'='RATE_LIMITED' then return null;
 else update public.campaigns set state='paused',error_code=result->>'code' where id=c.id;
 end if;
 return result;
end $$;

create function public.soulvd_growth_summary(p_tenant uuid,p_actor uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor) then raise exception 'FORBIDDEN'; end if;
 return jsonb_build_object('segments',coalesce((select jsonb_agg(x) from (select a.segment,count(*) as total,count(*) filter(where a.consent_at is not null and not a.suppressed and not exists(select 1 from public.whatsapp_contacts w where w.tenant_id=p_tenant and w.wa_id=a.phone and w.marketing_opted_out)) as eligible from public.audience_contacts a where a.tenant_id=p_tenant group by a.segment) x),'[]'::jsonb),
 'campaigns',coalesce((select jsonb_agg(x order by x.created_at desc) from (select c.*,count(r.id) as total,count(r.id) filter(where r.state='pending') as pending,count(r.id) filter(where r.state='skipped') as skipped,count(r.id) filter(where r.state='queued') as queued,count(r.id) filter(where m.status in ('delivered','read')) as delivered,count(r.id) filter(where m.status='read') as read,count(r.id) filter(where m.status='failed') as failed,count(r.id) filter(where m.status='unknown') as uncertain from public.campaigns c left join public.campaign_recipients r on r.campaign_id=c.id left join public.whatsapp_messages m on m.id=r.message_id where c.tenant_id=p_tenant group by c.id) x),'[]'::jsonb));
end $$;

do $$ declare f text; begin
 foreach f in array array['soulvd_growth_summary(uuid,uuid)','soulvd_import_audience(uuid,uuid,jsonb,text,text)','soulvd_save_guide(uuid,uuid,jsonb)','soulvd_apply_guide(uuid,uuid,jsonb,text)','soulvd_campaign_save(uuid,uuid,uuid,text,text,uuid,jsonb)','soulvd_campaign_control(uuid,uuid,uuid,text)','soulvd_campaign_tick()'] loop
  execute 'revoke all on function public.'||f||' from public,anon,authenticated';
  execute 'grant execute on function public.'||f||' to service_role';
 end loop;
end $$;
commit;
