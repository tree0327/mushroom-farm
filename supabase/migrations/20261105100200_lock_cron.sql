-- 20261105100000_mushroom_core.sql 의 `grant execute on all functions in schema app` 이
-- app.call_cron_route(Vault 의 cron_secret 을 헤더에 담아 보낸다) 실행 권한을 로그인 사용자에게 다시 열었다. 다시 막는다.
-- 일기 판정에만 쓰던 app.kst_date 도 지운다.
-- 파일 이름이 _cron.sql 로 끝나 PGlite 시험에서는 빠진다(call_cron_route 는 pg_cron 마이그레이션에만 있다).
revoke execute on function app.call_cron_route(text) from public, anon, authenticated, service_role;
drop function if exists app.kst_date(timestamptz);
