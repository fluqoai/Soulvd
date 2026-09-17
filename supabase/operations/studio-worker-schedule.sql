-- Run after the studio migrations. Store the existing META_WORKER_SECRET in
-- Supabase Vault under the name soulvd_worker_secret before enabling this job.
-- Keep its value out of SQL files, cron commands, source control and output.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create or replace function soulvd_private.studio_worker_tick() returns bigint
language plpgsql security invoker set search_path='' as $$
declare token text; request_id bigint; begin
 if not exists(select 1 from public.automation_runs where state in ('queued','processing'))
 and not exists(select 1 from public.crm_deliveries where (status='queued' and next_attempt_at<=now()) or status='processing')
 and not exists(select 1 from soulvd_private.meta_jobs where status in ('queued','processing')) then return null; end if;
 select decrypted_secret into token from vault.decrypted_secrets where name='soulvd_worker_secret';
 if token is null then raise exception 'WORKER_SECRET_NOT_CONFIGURED'; end if;
 select net.http_post(
  url:='https://www.soulvd.sa/api/meta/whatsapp/worker',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),
  body:='{}'::jsonb,timeout_milliseconds:=60000
 ) into request_id;
 return request_id;
end $$;
revoke all on function soulvd_private.studio_worker_tick() from public,anon,authenticated,service_role;
select cron.schedule('soulvd-studio-worker','* * * * *','select soulvd_private.studio_worker_tick();');
-- Technical counters only: customer messages, drafts, payments and audit trails are retained.
select cron.schedule('soulvd-crm-rate-counter-cleanup','17 2 * * *',
 $$delete from soulvd_private.crm_rate_limits where minute<now()-interval '1 day';$$);
commit;
