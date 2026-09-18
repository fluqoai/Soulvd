alter table public.tenant_invitations add column delivery_attempted_at timestamptz,
  add column email_sent_at timestamptz, add column delivery_key uuid;

create function public.soulvd_invitation_delivery(p_tenant uuid,p_actor uuid,p_invite uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare i public.tenant_invitations; s public.subscriptions; label text;
begin
  if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role in ('owner','admin')) then raise exception 'FORBIDDEN'; end if;
  select * into s from public.subscriptions where tenant_id=p_tenant for update;
  if not found or s.status<>'active' or now()<s.period_start or now()>=s.period_end then return jsonb_build_object('code','SUBSCRIPTION_INACTIVE'); end if;
  select * into i from public.tenant_invitations where id=p_invite and tenant_id=p_tenant for update;
  if not found or i.status<>'pending' or i.expires_at<=now() then return jsonb_build_object('code','INVITATION_EXPIRED'); end if;
  if i.delivery_attempted_at>now()-interval '60 seconds' then return jsonb_build_object('code','RETRY_LATER'); end if;
  update public.tenant_invitations set delivery_attempted_at=now(),delivery_key=gen_random_uuid() where id=i.id returning * into i;
  select name into label from public.tenants where id=p_tenant;
  return jsonb_build_object('email',i.email,'name',label,'deliveryKey',i.delivery_key);
end; $$;

create function public.soulvd_revoke_invitation(p_tenant uuid,p_actor uuid,p_invite uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role in ('owner','admin')) then raise exception 'FORBIDDEN'; end if;
  perform 1 from public.subscriptions where tenant_id=p_tenant for update;
  update public.tenant_invitations set status='revoked' where id=p_invite and tenant_id=p_tenant and status='pending';
  return found;
end; $$;
revoke all on function public.soulvd_invitation_delivery(uuid,uuid,uuid),public.soulvd_revoke_invitation(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.soulvd_invitation_delivery(uuid,uuid,uuid),public.soulvd_revoke_invitation(uuid,uuid,uuid) to service_role;
