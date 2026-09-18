begin;
alter table public.campaigns add column last_processed_at timestamptz;
create index campaign_fair_queue on public.campaigns(last_processed_at nulls first,created_at) where state='running';
create or replace function public.soulvd_campaign_tick() returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.campaigns; r public.campaign_recipients; a public.audience_contacts; result jsonb; begin
 -- Subscription first, then campaign, matching all interactive operations.
 select x.* into c from public.campaigns x join public.subscriptions s on s.tenant_id=x.tenant_id where x.state='running' order by x.last_processed_at nulls first,x.created_at limit 1 for update of s skip locked;
 if not found then return null; end if;
 select * into c from public.campaigns where id=c.id and state='running' for update;
 if not found then return null; end if;
 update public.campaigns set last_processed_at=clock_timestamp() where id=c.id;
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
commit;
