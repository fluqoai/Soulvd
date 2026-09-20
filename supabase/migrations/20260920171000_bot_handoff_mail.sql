begin;
alter table public.whatsapp_contacts add column handoff_notified_at timestamptz;

create function public.soulvd_handoff_notification(p_run uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r public.automation_runs; m public.whatsapp_messages; c public.whatsapp_contacts;
begin
 select * into r from public.automation_runs where id=p_run and state='handoff';
 if not found then return jsonb_build_object('allowed',false,'code','NOT_FOUND'); end if;
 select * into m from public.whatsapp_messages where id=r.message_id and tenant_id=r.tenant_id;
 select * into c from public.whatsapp_contacts where id=m.contact_id and tenant_id=r.tenant_id;
 if c.handoff_at is null or c.handoff_assignee_email is null or c.handoff_notified_at is not null then
  return jsonb_build_object('allowed',false,'code','NOT_REQUIRED');
 end if;
 return jsonb_build_object('allowed',true,'email',c.handoff_assignee_email,'phone',c.wa_id,
  'message',left(m.body,500),'reason',r.error_code,'tenant',r.tenant_id,'contact',c.id);
end $$;
revoke all on function public.soulvd_handoff_notification(uuid) from public,anon,authenticated;
grant execute on function public.soulvd_handoff_notification(uuid) to service_role;
commit;
