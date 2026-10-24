-- 예약 알림: 21시(12:00 UTC) 일기 쓰기, 9시(00:00 UTC) 답장. pg_cron 은 UTC 로 돈다.
-- 앱 주소와 비밀 헤더는 Vault 에서 읽는다(이 파일과 저장소에는 값이 없다). 적용 전에 한 번 넣어 둔다:
--   select vault.create_secret('<https://앱 주소>', 'app_url');
--   select vault.create_secret('<Vercel 의 CRON_SECRET 과 같은 값>', 'cron_secret');
-- 되돌리기: select cron.unschedule('diary-evening'); select cron.unschedule('diary-morning');

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function app.call_cron_route(p_path text)
returns bigint
language sql
security definer
set search_path = ''
as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'app_url') || p_path,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$$;
comment on function app.call_cron_route(text) is '예약 알림 주소 부르기. pg_cron 만 부른다(Vault 를 읽어서 definer).';
revoke execute on function app.call_cron_route(text) from public, anon, authenticated, service_role;

select cron.schedule('diary-evening', '0 12 * * *', $$ select app.call_cron_route('/api/cron/evening') $$);
select cron.schedule('diary-morning', '0 0 * * *', $$ select app.call_cron_route('/api/cron/morning') $$);
