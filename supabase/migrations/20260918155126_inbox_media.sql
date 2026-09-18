alter table public.whatsapp_messages add column media jsonb;
create table soulvd_private.message_media (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants on delete cascade,
 message_id uuid unique references public.whatsapp_messages on delete cascade,
 source text not null check(source in ('storage','ycloud','meta')),
 source_url text, media_id text, storage_path text, sha256 text,
 kind text not null check(kind in ('image','audio','video','document','sticker')),
 mime text, filename text, created_at timestamptz not null default now()
);
create index message_media_tenant_time on soulvd_private.message_media(tenant_id,created_at);
alter table soulvd_private.message_media enable row level security;
revoke all on soulvd_private.message_media from public,anon,authenticated;
grant all on soulvd_private.message_media to service_role;
create table soulvd_private.media_upload_attempts (
 tenant_id uuid not null references public.tenants on delete cascade,request_id uuid not null,sha256 text not null,created_at timestamptz not null default now(),primary key(tenant_id,request_id)
);
alter table soulvd_private.media_upload_attempts enable row level security;
revoke all on soulvd_private.media_upload_attempts from public,anon,authenticated;
grant all on soulvd_private.media_upload_attempts to service_role;
create index media_attempts_daily on soulvd_private.media_upload_attempts(tenant_id,created_at);
create function public.soulvd_reserve_media_upload(p_tenant uuid,p_actor uuid,p_request uuid,p_sha256 text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions; previous text;
begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor) then raise exception 'FORBIDDEN'; end if;
 if p_request is null or p_sha256 is null or p_sha256!~'^[a-f0-9]{64}$' then raise exception 'INVALID_MEDIA'; end if;
 select * into s from public.subscriptions where tenant_id=p_tenant for update;
 if not found or s.status<>'active' or now()<s.period_start or now()>=s.period_end then return false; end if;
 select sha256 into previous from soulvd_private.media_upload_attempts where tenant_id=p_tenant and request_id=p_request;
 if found then if previous<>p_sha256 then raise exception 'REQUEST_CONFLICT'; end if; return true; end if;
 if (select count(*) from soulvd_private.media_upload_attempts where tenant_id=p_tenant and created_at>now()-interval '1 day')>=100 then return false; end if;
 if (select count(*) from soulvd_private.media_upload_attempts where tenant_id=p_tenant and created_at>now()-interval '1 minute')>=10 then return false; end if;
 insert into soulvd_private.media_upload_attempts(tenant_id,request_id,sha256) values(p_tenant,p_request,p_sha256);
 return true;
end $$;
revoke all on function public.soulvd_reserve_media_upload(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.soulvd_reserve_media_upload(uuid,uuid,uuid,text) to service_role;

-- Keep raw provider URLs and identifiers out of merchant-readable records.
alter function public.soulvd_meta_ingest(text,jsonb) rename to soulvd_meta_ingest_before_media;
create function public.soulvd_meta_ingest(p_id text,p_payload jsonb) returns boolean
language plpgsql security invoker set search_path='' as $$
declare result boolean; entry jsonb; change jsonb; item jsonb; detail jsonb; m public.whatsapp_messages; source text; provider_id text; candidates jsonb;
begin
 result:=public.soulvd_meta_ingest_before_media(p_id,p_payload);
 if p_payload->'source_event'->>'type'='whatsapp.inbound_message.received' then
  candidates:=jsonb_build_array(p_payload->'source_event'->'whatsappInboundMessage'); source:='ycloud';
 else
  candidates:='[]';source:='meta';
  for entry in select value from jsonb_array_elements(coalesce(p_payload->'entry','[]')) loop
   for change in select value from jsonb_array_elements(coalesce(entry->'changes','[]')) loop
    candidates:=candidates||coalesce((select jsonb_agg(value||jsonb_build_object('_number_id',change->'value'->'metadata'->>'phone_number_id','_waba_id',entry->>'id')) from jsonb_array_elements(coalesce(change->'value'->'messages','[]'))),'[]');
   end loop;
  end loop;
 end if;
 for item in select value from jsonb_array_elements(candidates) loop
  if item->>'type' not in ('image','audio','video','document','sticker') then continue; end if;
  detail:=item->(item->>'type');
  provider_id:=case when source='ycloud' then 'ycloud:'|| (item->>'id') else item->>'id' end;
  select * into m from public.whatsapp_messages where meta_message_id=provider_id and direction='inbound';
  if not found or detail->>'id' is null then continue; end if;
  -- A duplicate/unbound provider event must never attach media to another asset.
  if source='ycloud' and not exists(select 1 from soulvd_private.meta_connections c join public.whatsapp_numbers n on n.id=c.number_id where c.number_id=m.number_id and c.provider='ycloud' and c.waba_id=item->>'wabaId' and n.phone=item->>'to') then continue; end if;
  if source='meta' and not exists(select 1 from soulvd_private.meta_connections c where c.number_id=m.number_id and c.provider='meta' and c.waba_id=item->>'_waba_id' and c.phone_number_id=item->>'_number_id') then continue; end if;
  insert into soulvd_private.message_media(tenant_id,message_id,source,source_url,media_id,kind,mime,filename)
  values(m.tenant_id,m.id,source,case when source='ycloud' then detail->>'link' end,detail->>'id',item->>'type',detail->>'mime_type',left(detail->>'filename',200)) on conflict(message_id) do nothing;
  if not found then continue; end if;
  update public.whatsapp_messages set media=jsonb_build_object('mime',detail->>'mime_type','filename',left(detail->>'filename',200)),body=coalesce(left(detail->>'caption',4096),'') where id=m.id;
 end loop;
 return result;
end $$;

create function public.soulvd_enqueue_media(p_tenant uuid,p_actor uuid,p_request uuid,p_to text,p_kind text,p_mime text,p_filename text,p_sha256 text,p_caption text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare j soulvd_private.meta_jobs; media soulvd_private.message_media; result jsonb; mid uuid;
begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor) then raise exception 'FORBIDDEN'; end if;
 if p_kind is null or p_kind not in ('image','audio','video','document') or p_sha256 is null or p_sha256!~'^[a-f0-9]{64}$' or p_caption is null or length(p_caption)>1024 or p_request is null then raise exception 'INVALID_MEDIA'; end if;
 perform 1 from public.subscriptions where tenant_id=p_tenant for update;
 select * into j from soulvd_private.meta_jobs where tenant_id=p_tenant and request_id=p_request;
 if found then
  select * into media from soulvd_private.message_media where message_id=j.resource_id;
  if j.payload->>'to' is distinct from p_to or media.sha256 is distinct from p_sha256 or media.kind is distinct from p_kind or (select body from public.whatsapp_messages where id=j.resource_id) is distinct from p_caption then raise exception 'REQUEST_CONFLICT'; end if;
  return jsonb_build_object('allowed',true,'id',j.id,'message_id',j.resource_id);
 end if;
 if (select count(*) from soulvd_private.message_media where tenant_id=p_tenant and source='storage' and created_at>now()-interval '1 day')>=100 then return jsonb_build_object('allowed',false,'code','MEDIA_DAILY_LIMIT'); end if;
 -- Use the existing admission transaction: subscription, window, quota, rate and wallet reservation.
 result:=public.soulvd_enqueue_message(p_tenant,p_actor,p_request,'message',p_to,case when trim(p_caption)='' then 'مرفق' else p_caption end,null,false,'[]');
 if not coalesce((result->>'allowed')::boolean,false) then return result; end if;
 mid:=(result->>'message_id')::uuid;
 insert into soulvd_private.message_media(id,tenant_id,message_id,source,storage_path,sha256,kind,mime,filename)
 values(p_request,p_tenant,mid,'storage',p_tenant::text||'/'||p_request::text,p_sha256,p_kind,p_mime,left(p_filename,200));
 update public.whatsapp_messages set kind=p_kind,body=p_caption,media=jsonb_build_object('mime',p_mime,'filename',left(p_filename,200)) where id=mid;
 update soulvd_private.meta_jobs set payload=jsonb_build_object('messaging_product','whatsapp','to',p_to,'type',p_kind,'media_file',p_request,'caption',p_caption,'filename',left(p_filename,200)) where id=(result->>'id')::uuid;
 return result;
exception when raise_exception then
 if sqlerrm in ('WALLET_INSUFFICIENT','WALLET_RATE_UNAVAILABLE') then return jsonb_build_object('allowed',false,'code',sqlerrm); end if;
 raise;
end $$;

create function public.soulvd_message_media(p_tenant uuid,p_actor uuid,p_message uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare media soulvd_private.message_media; c soulvd_private.meta_connections;
begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor) then raise exception 'FORBIDDEN'; end if;
 select * into media from soulvd_private.message_media where tenant_id=p_tenant and message_id=p_message;
 if not found then return null; end if;
 select mc.* into c from soulvd_private.meta_connections mc join public.whatsapp_messages m on m.number_id=mc.number_id where m.id=p_message and m.tenant_id=p_tenant;
 return to_jsonb(media)||jsonb_build_object('encrypted_token',case when media.source='meta' then c.encrypted_token end,'phone_number_id',c.phone_number_id);
end $$;

create function public.soulvd_job_media(p_job uuid) returns jsonb
language sql security invoker set search_path='' as $$
 select to_jsonb(mm) from soulvd_private.meta_jobs j join soulvd_private.message_media mm on mm.message_id=j.resource_id and mm.tenant_id=j.tenant_id where j.id=p_job and j.status='processing' and mm.source='storage';
$$;
-- Recheck the window when media reaches the worker, including delayed jobs.
alter function public.soulvd_meta_claim(uuid) rename to soulvd_meta_claim_before_media;
create function public.soulvd_meta_claim(p_id uuid default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb; latest timestamptz;
begin
 result:=public.soulvd_meta_claim_before_media(p_id);
 if result->'payload'->>'type' in ('image','audio','video','document') then
  select c.last_inbound_at into latest from public.whatsapp_contacts c join soulvd_private.meta_jobs j on j.tenant_id=c.tenant_id where j.id=(result->>'id')::uuid and c.wa_id=result->'payload'->>'to';
  if latest is null or latest<now()-interval '24 hours' then
   update soulvd_private.meta_jobs set status='failed',error_code='WINDOW_CLOSED' where id=(result->>'id')::uuid;
   update public.whatsapp_messages set status='failed' where id=(result->>'resource_id')::uuid;
   return null;
  end if;
 end if;
 return result;
end $$;
revoke all on function public.soulvd_meta_ingest(text,jsonb),public.soulvd_enqueue_media(uuid,uuid,uuid,text,text,text,text,text,text),public.soulvd_message_media(uuid,uuid,uuid),public.soulvd_job_media(uuid),public.soulvd_meta_claim(uuid) from public,anon,authenticated;
grant execute on function public.soulvd_meta_ingest(text,jsonb),public.soulvd_enqueue_media(uuid,uuid,uuid,text,text,text,text,text,text),public.soulvd_message_media(uuid,uuid,uuid),public.soulvd_job_media(uuid),public.soulvd_meta_claim(uuid) to service_role;
