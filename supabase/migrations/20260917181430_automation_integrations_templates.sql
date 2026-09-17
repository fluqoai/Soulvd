begin;
create function public.soulvd_enqueue_message(p_tenant uuid,p_actor uuid,p_request uuid,p_kind text,p_to text,p_body text,p_template uuid,p_consent boolean,p_parameters jsonb default '[]'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions; c soulvd_private.meta_connections; n uuid; cid uuid; rid uuid; j soulvd_private.meta_jobs; payload jsonb; gate jsonb; wt public.whatsapp_templates; last_message timestamptz; rendered text; idx integer;
begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor) then raise exception 'FORBIDDEN'; end if;
 if p_kind not in ('message','template') or p_kind is null or p_request is null then raise exception 'INVALID_JOB'; end if;
 select * into s from public.subscriptions where tenant_id=p_tenant for update;
 if s.status<>'active' or now()<s.period_start or now()>=s.period_end then return jsonb_build_object('allowed',false,'code','SUBSCRIPTION_INACTIVE'); end if;
 select mc.* into c from soulvd_private.meta_connections mc join public.whatsapp_numbers wn on wn.id=mc.number_id where wn.tenant_id=p_tenant and wn.status='connected' order by mc.created_at limit 1;
 if not found then return jsonb_build_object('allowed',false,'code','NOT_CONNECTED'); end if;
 n:=c.number_id;
 if p_kind='template' then
  if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role in ('owner','admin')) then raise exception 'FORBIDDEN'; end if;
  -- p_body is the validated JSON template submitted by the server action.
  payload:=p_body::jsonb;
 else
  if p_to !~ '^[0-9]{7,15}$' then raise exception 'INVALID_RECIPIENT'; end if;
  if p_template is not null then
   select * into wt from public.whatsapp_templates where id=p_template and tenant_id=p_tenant and status='approved';
   if not found then return jsonb_build_object('allowed',false,'code','TEMPLATE_NOT_APPROVED'); end if;
   if wt.category='MARKETING' and exists(select 1 from public.whatsapp_contacts where tenant_id=p_tenant and wa_id=p_to and marketing_opted_out) then return jsonb_build_object('allowed',false,'code','MARKETING_OPTED_OUT'); end if;
   if jsonb_typeof(p_parameters) is distinct from 'array' or jsonb_array_length(p_parameters)<>wt.parameter_count then raise exception 'INVALID_PARAMETERS'; end if;
   if exists(select 1 from jsonb_array_elements(p_parameters) x where jsonb_typeof(x)<>'string' or length(x#>>'{}') not between 1 and 1000) then raise exception 'INVALID_PARAMETERS'; end if;
   rendered:=wt.body;
   for idx in 1..wt.parameter_count loop rendered:=replace(rendered,'{{'||idx||'}}',p_parameters->>(idx-1)); end loop;
   payload:=jsonb_build_object('messaging_product','whatsapp','to',p_to,'type','template','template',jsonb_build_object('name',wt.name,'language',jsonb_build_object('code',wt.language)) || case when wt.parameter_count=0 then '{}'::jsonb else jsonb_build_object('components',jsonb_build_array(jsonb_build_object('type','body','parameters',(select jsonb_agg(jsonb_build_object('type','text','text',x)) from jsonb_array_elements_text(p_parameters) x)))) end);
  else
   if length(trim(p_body)) not between 1 and 4096 then raise exception 'INVALID_MESSAGE'; end if;
   payload:=jsonb_build_object('messaging_product','whatsapp','to',p_to,'type','text','text',jsonb_build_object('body',p_body));
  end if;
 end if;
 select * into j from soulvd_private.meta_jobs where tenant_id=p_tenant and request_id=p_request;
 if found then
  if j.payload<>payload or j.kind<>p_kind then raise exception 'REQUEST_CONFLICT'; end if;
  return jsonb_build_object('allowed',true,'id',j.id,'message_id',case when p_kind='message' then j.resource_id end);
 end if;
 if (select count(*) from soulvd_private.meta_jobs where tenant_id=p_tenant and created_at>now()-interval '1 minute')>=30 then return jsonb_build_object('allowed',false,'code','RATE_LIMITED'); end if;
 if p_kind='template' then
  gate:=public.soulvd_create_resource(p_tenant,p_actor,'templates','reserved_'||replace(gen_random_uuid()::text,'-',''));
  if not (gate->>'allowed')::boolean then return gate; end if;
  rid:=(gate->>'id')::uuid;
  update public.whatsapp_templates set name=payload->>'name',language=payload->>'language',category=payload->>'category',body=payload->'components'->0->>'text',parameter_count=(select count(distinct m[1]) from regexp_matches(payload->'components'->0->>'text','[{][{]([0-9]+)[}][}]','g') m) where id=rid;
 else
  select id,last_inbound_at into cid,last_message from public.whatsapp_contacts where tenant_id=p_tenant and wa_id=p_to;
  if p_template is null and (last_message is null or last_message<now()-interval '24 hours') then return jsonb_build_object('allowed',false,'code','WINDOW_CLOSED'); end if;
  if p_template is not null and not coalesce(p_consent,false) and not exists(select 1 from public.whatsapp_contacts where id=cid and opted_in_at is not null) then return jsonb_build_object('allowed',false,'code','CONSENT_REQUIRED'); end if;
  gate:=public.soulvd_consume_conversation(p_tenant,'wa:'||p_to);
  if not (gate->>'allowed')::boolean then return gate; end if;
  insert into public.whatsapp_contacts(tenant_id,wa_id,opted_in_at) values(p_tenant,p_to,case when p_consent then now() end)
  on conflict(tenant_id,wa_id) do update set opted_in_at=coalesce(whatsapp_contacts.opted_in_at,excluded.opted_in_at) returning id into cid;
  insert into public.whatsapp_messages(tenant_id,contact_id,number_id,direction,kind,body,status)
  values(p_tenant,cid,n,'outbound',case when p_template is null then 'text' else 'template' end,case when p_template is null then p_body else rendered end,'queued') returning id into rid;
 end if;
 insert into soulvd_private.meta_jobs(tenant_id,number_id,kind,resource_id,request_id,payload) values(p_tenant,n,p_kind,rid,p_request,payload) returning id into n;
 return jsonb_build_object('allowed',true,'id',n,'message_id',case when p_kind='message' then rid end);
end $$;


create or replace function public.soulvd_meta_sync_templates(p_tenant uuid,p_actor uuid,p_templates jsonb)
returns integer language plpgsql security invoker set search_path='' as $$
declare item jsonb; resource uuid; gate jsonb; state text; updated integer:=0; begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role in ('owner','admin')) then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.subscriptions where tenant_id=p_tenant for update;
 for item in select value from jsonb_array_elements(p_templates) loop
  -- Body-only templates with positional text parameters are supported.
  if item->>'language' not in ('ar','en_US') or item->>'body' is null then continue; end if;
  state:=case item->>'status' when 'APPROVED' then 'approved' when 'REJECTED' then 'rejected' when 'PENDING' then 'pending' when 'PAUSED' then 'rejected' when 'DISABLED' then 'rejected' when 'ARCHIVED' then 'archived' when 'DELETED' then 'archived' else null end;
  if state is null then continue; end if;
  select id into resource from public.whatsapp_templates where tenant_id=p_tenant and name=item->>'name' and language=item->>'language';
  if not found then
   gate:=public.soulvd_create_resource(p_tenant,p_actor,'templates','reserved_'||replace(gen_random_uuid()::text,'-',''));
   if not (gate->>'allowed')::boolean then continue; end if;
   resource:=(gate->>'id')::uuid;
  end if;
  update public.whatsapp_templates set name=item->>'name',language=item->>'language',body=item->>'body',category=item->>'category',status=state,provider_status=item->>'status',parameter_count=(select count(distinct m[1]) from regexp_matches(item->>'body','[{][{]([0-9]+)[}][}]','g') m) where id=resource;
  updated:=updated+1;
 end loop;
 return updated;
end $$;

revoke all on function public.soulvd_enqueue_message(uuid,uuid,uuid,text,text,text,uuid,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.soulvd_enqueue_message(uuid,uuid,uuid,text,text,text,uuid,boolean,jsonb) to service_role;
commit;
