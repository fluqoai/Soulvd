begin;

alter table public.bot_settings
  add column handoff_email text check (handoff_email is null or handoff_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  add column handoff_phone text check (handoff_phone is null or handoff_phone ~ '^[0-9]{7,15}$');

alter table public.whatsapp_contacts
  add column handoff_at timestamptz,
  add column handoff_reason text,
  add column handoff_assignee_email text;

create index whatsapp_contacts_handoff_queue
  on public.whatsapp_contacts(tenant_id, handoff_at desc)
  where handoff_at is not null;

create or replace view public.inbox_overview with (security_invoker=true) as
 select t.tenant_id,t.contact_id,c.wa_id as phone,c.name,c.last_inbound_at,
 t.last_message_id,t.last_message_at,t.inbound_count,
 greatest(0,t.inbound_count-coalesce(r.read_seq,0)) as unread,
 left(m.body,180) as preview,m.direction,m.status,
 c.handoff_at,c.handoff_reason,c.handoff_assignee_email
 from public.inbox_threads t join public.whatsapp_contacts c on c.id=t.contact_id and c.tenant_id=t.tenant_id
 join public.whatsapp_messages m on m.id=t.last_message_id and m.tenant_id=t.tenant_id
 left join public.inbox_reads r on r.tenant_id=t.tenant_id and r.contact_id=t.contact_id and r.user_id=(select auth.uid());

commit;
