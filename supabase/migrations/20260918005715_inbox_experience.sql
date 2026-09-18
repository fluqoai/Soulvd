begin;
-- Per-contact summaries avoid rescanning the complete message archive on every refresh.
alter table public.whatsapp_messages add column inbox_seq bigint;
create index inbox_message_history on public.whatsapp_messages(tenant_id,contact_id,created_at desc,id desc);
create table public.inbox_threads (
 tenant_id uuid not null, contact_id uuid not null,
 last_message_id uuid not null references public.whatsapp_messages(id),
 last_message_at timestamptz not null, inbound_count bigint not null default 0 check(inbound_count>=0),
 updated_at timestamptz not null default now(), primary key(tenant_id,contact_id),
 foreign key(tenant_id,contact_id) references public.whatsapp_contacts(tenant_id,id) on delete cascade
);
create index inbox_thread_order on public.inbox_threads(tenant_id,last_message_at desc,contact_id desc);
create table public.inbox_reads (
 tenant_id uuid not null, contact_id uuid not null, user_id uuid not null references public.users(id) on delete cascade,
 read_seq bigint not null check(read_seq>=0), updated_at timestamptz not null default now(),
 primary key(tenant_id,contact_id,user_id),
 foreign key(tenant_id,contact_id) references public.inbox_threads(tenant_id,contact_id) on delete cascade
);
create index inbox_reads_user on public.inbox_reads(user_id,tenant_id);
alter table public.inbox_threads enable row level security;
alter table public.inbox_reads enable row level security;
revoke all on public.inbox_threads,public.inbox_reads from public,anon,authenticated;
grant select on public.inbox_threads,public.inbox_reads to authenticated;
grant insert,update on public.inbox_reads to authenticated;
grant all on public.inbox_threads,public.inbox_reads to service_role;
create policy thread_read on public.inbox_threads for select to authenticated using(soulvd_private.is_member(tenant_id));
create policy own_reads on public.inbox_reads for all to authenticated
 using(user_id=(select auth.uid()) and soulvd_private.is_member(tenant_id))
 with check(user_id=(select auth.uid()) and soulvd_private.is_member(tenant_id));
with numbered as (
 select id,row_number() over(partition by tenant_id,contact_id order by created_at,id) seq
 from public.whatsapp_messages where direction='inbound'
) update public.whatsapp_messages m set inbox_seq=n.seq from numbered n where m.id=n.id;
insert into public.inbox_threads(tenant_id,contact_id,last_message_id,last_message_at,inbound_count)
 select distinct on(m.tenant_id,m.contact_id) m.tenant_id,m.contact_id,m.id,m.created_at,
 count(*) filter(where m.direction='inbound') over(partition by m.tenant_id,m.contact_id)
 from public.whatsapp_messages m order by m.tenant_id,m.contact_id,m.created_at desc,m.id desc;
create function soulvd_private.track_inbox_message() returns trigger language plpgsql security invoker set search_path='' as $$
declare seq bigint; begin
 if tg_op='UPDATE' then
  update public.inbox_threads set updated_at=clock_timestamp() where tenant_id=new.tenant_id and contact_id=new.contact_id;
  return new;
 end if;
 insert into public.inbox_threads as t(tenant_id,contact_id,last_message_id,last_message_at,inbound_count)
 values(new.tenant_id,new.contact_id,new.id,new.created_at,case when new.direction='inbound' then 1 else 0 end)
 on conflict(tenant_id,contact_id) do update set
 inbound_count=t.inbound_count+excluded.inbound_count,
 last_message_id=case when (excluded.last_message_at,excluded.last_message_id)>(t.last_message_at,t.last_message_id) then excluded.last_message_id else t.last_message_id end,
 last_message_at=greatest(t.last_message_at,excluded.last_message_at),updated_at=clock_timestamp()
 returning inbound_count into seq;
 if new.direction='inbound' then update public.whatsapp_messages set inbox_seq=seq where id=new.id; end if;
 return new;
end $$;
revoke all on function soulvd_private.track_inbox_message() from public,anon,authenticated;
create trigger track_inbox_message after insert or update of status on public.whatsapp_messages
 for each row execute function soulvd_private.track_inbox_message();
-- The cursor is the last inbound message actually displayed, not client wall-clock time.
create function public.soulvd_read_inbox(p_tenant uuid,p_message uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare m public.whatsapp_messages; begin
 select * into m from public.whatsapp_messages where id=p_message and tenant_id=p_tenant and direction='inbound';
 if not found or auth.uid() is null then raise exception 'NOT_FOUND'; end if;
 insert into public.inbox_reads as r(tenant_id,contact_id,user_id,read_seq) values(p_tenant,m.contact_id,auth.uid(),m.inbox_seq)
 on conflict(tenant_id,contact_id,user_id) do update set read_seq=greatest(r.read_seq,excluded.read_seq),updated_at=now();
end $$;
create view public.inbox_overview with(security_invoker=true) as
 select t.tenant_id,t.contact_id,c.wa_id as phone,c.name,c.last_inbound_at,
 t.last_message_id,t.last_message_at,t.inbound_count,
 greatest(0,t.inbound_count-coalesce(r.read_seq,0)) as unread,
 left(m.body,180) as preview,m.direction,m.status
 from public.inbox_threads t join public.whatsapp_contacts c on c.id=t.contact_id and c.tenant_id=t.tenant_id
 join public.whatsapp_messages m on m.id=t.last_message_id and m.tenant_id=t.tenant_id
 left join public.inbox_reads r on r.tenant_id=t.tenant_id and r.contact_id=t.contact_id and r.user_id=(select auth.uid());
revoke all on public.inbox_overview from public,anon;
grant select on public.inbox_overview to authenticated,service_role;
revoke all on function public.soulvd_read_inbox(uuid,uuid) from public,anon;
grant execute on function public.soulvd_read_inbox(uuid,uuid) to authenticated;
create function public.soulvd_inbox_counts(p_tenant uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('unread',coalesce(sum(greatest(0,t.inbound_count-coalesce(r.read_seq,0))),0),'incoming',coalesce(sum(t.inbound_count),0))
 from public.inbox_threads t left join public.inbox_reads r on r.tenant_id=t.tenant_id and r.contact_id=t.contact_id and r.user_id=(select auth.uid()) where t.tenant_id=p_tenant;
$$;
revoke all on function public.soulvd_inbox_counts(uuid) from public,anon;
grant execute on function public.soulvd_inbox_counts(uuid) to authenticated;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.inbox_threads;
 end if;
end $$;
commit;
