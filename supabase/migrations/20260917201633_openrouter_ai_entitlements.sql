-- No entitlements are issued by this migration. Commercial terms come later.
-- Browser clients and merchant settings cannot grant or extend AI allowances.
begin;
create table soulvd_private.ai_entitlements (
 tenant_id uuid primary key references public.tenants,
 enabled boolean not null default false,
 period_start timestamptz not null,
 period_end timestamptz not null check(period_end>period_start),
 request_limit integer not null check(request_limit>0),
 requests_used integer not null default 0 check(requests_used between 0 and request_limit),
 grant_reference text not null check(length(trim(grant_reference)) between 1 and 120)
);
alter table soulvd_private.ai_entitlements enable row level security;
revoke all on soulvd_private.ai_entitlements from public,anon,authenticated,service_role;
-- Grant issuance is deliberately unavailable to the application until billing is designed.
grant select,update on soulvd_private.ai_entitlements to service_role;
alter table public.automation_runs add column ai_reserved_at timestamptz;

create or replace function public.soulvd_ai_reserve(p_tenant uuid,p_run uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
declare lim integer; used integer; entitlement soulvd_private.ai_entitlements; begin
 perform 1 from public.subscriptions where tenant_id=p_tenant and status='active'
  and now()>=period_start and now()<period_end for update;
 if not found then return false; end if;
 select daily_limit into lim from public.bot_settings where tenant_id=p_tenant and enabled for update;
 if not found then return false; end if;
 select * into entitlement from soulvd_private.ai_entitlements where tenant_id=p_tenant for update;
 if not found or not entitlement.enabled or now()<entitlement.period_start or now()>=entitlement.period_end
  or entitlement.requests_used>=entitlement.request_limit then return false; end if;
 perform 1 from public.automation_runs where id=p_run and tenant_id=p_tenant
  and state='processing' and ai_reserved_at is null for update;
 if not found then return false; end if;
 insert into public.ai_daily_usage(tenant_id,day,requests)
  values(p_tenant,(now() at time zone 'Asia/Riyadh')::date,0) on conflict do nothing;
 update public.ai_daily_usage set requests=requests+1
  where tenant_id=p_tenant and day=(now() at time zone 'Asia/Riyadh')::date and requests<lim
  returning requests into used;
 if not found then return false; end if;
 update soulvd_private.ai_entitlements set requests_used=requests_used+1 where tenant_id=p_tenant;
 update public.automation_runs set ai_reserved_at=now() where id=p_run;
 return true;
end $$;
revoke all on function public.soulvd_ai_reserve(uuid,uuid) from public,anon,authenticated;
grant execute on function public.soulvd_ai_reserve(uuid,uuid) to service_role;
commit;
