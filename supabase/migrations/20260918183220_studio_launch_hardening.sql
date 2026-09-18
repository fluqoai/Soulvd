begin;
create or replace function public.soulvd_automation_send(p_run uuid,p_actor uuid,p_body text,p_manual boolean default false) returns jsonb language plpgsql security invoker set search_path='' as $$
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
 -- Never send an old recommendation after a newer customer message or staff reply.
 if exists(select 1 from public.whatsapp_messages newer where newer.tenant_id=r.tenant_id
  and newer.contact_id=c.id and newer.created_at>m.created_at and newer.id<>m.id) then
  update public.automation_runs set state='skipped',error_code='CONVERSATION_CHANGED',finished_at=now() where id=r.id;
  return jsonb_build_object('allowed',false,'code','CONVERSATION_CHANGED');
 end if;
 result:=public.soulvd_meta_enqueue(r.tenant_id,p_actor,r.request_id,'message',c.wa_id,p_body,null,false);
 update public.automation_runs set state=case when (result->>'allowed')::boolean then 'sent' else 'skipped' end,output=p_body,error_code=result->>'code',finished_at=now() where id=r.id;
 return result;
end $$;


-- Synthetic integration checks use the same durable, signed delivery pipeline.
alter table public.crm_deliveries alter column message_id drop not null;
alter table public.crm_deliveries add constraint crm_delivery_test_message check(
 (event_type='integration.test' and message_id is null) or (event_type<>'integration.test' and message_id is not null));
create function public.soulvd_crm_test(p_tenant uuid,p_actor uuid,p_id uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare integration public.crm_integrations; recent uuid; result uuid;
begin
 perform soulvd_private.require_manager(p_tenant,p_actor,true);
 select * into integration from public.crm_integrations where id=p_id and tenant_id=p_tenant for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if integration.status<>'active' or not exists(select 1 from soulvd_private.crm_credentials where integration_id=p_id and expires_at>now()) then raise exception 'INTEGRATION_INACTIVE'; end if;
 select id into recent from public.crm_deliveries where integration_id=p_id and event_type='integration.test'
  and (status in('queued','processing') or created_at>now()-interval '1 minute') order by created_at desc limit 1;
 if found then return recent; end if;
 insert into public.crm_deliveries(tenant_id,integration_id,event_type,payload)
 values(p_tenant,p_id,'integration.test',jsonb_build_object('type','integration.test','test',true,'created_at',now())) returning id into result;
 return result;
end $$;
create function public.soulvd_ai_status(p_tenant uuid,p_actor uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare entitlement soulvd_private.ai_entitlements; daily integer; lim integer;
begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role in('owner','admin')) then raise exception 'FORBIDDEN'; end if;
 select * into entitlement from soulvd_private.ai_entitlements where tenant_id=p_tenant;
 select daily_limit into lim from public.bot_settings where tenant_id=p_tenant;
 select requests into daily from public.ai_daily_usage where tenant_id=p_tenant and day=(now() at time zone 'Asia/Riyadh')::date;
 return jsonb_build_object('enabled',coalesce(entitlement.enabled and now()>=entitlement.period_start and now()<entitlement.period_end and entitlement.requests_used<entitlement.request_limit,false),
  'remaining',greatest(0,coalesce(entitlement.request_limit-entitlement.requests_used,0)),
  'dailyRemaining',greatest(0,coalesce(lim,20)-coalesce(daily,0)), 'expiresAt',entitlement.period_end);
end $$;
revoke all on function public.soulvd_crm_test(uuid,uuid,uuid),public.soulvd_ai_status(uuid,uuid) from public,anon,authenticated;
grant execute on function public.soulvd_crm_test(uuid,uuid,uuid),public.soulvd_ai_status(uuid,uuid) to service_role;
commit;
