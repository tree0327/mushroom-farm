-- 부부 일기 예약 알림(21시 일기 쓰기·9시 답장)을 멈춘다.
-- app.call_cron_route 와 Vault 의 app_url·cron_secret 은 남긴다 — 푸시를 붙일 기능이 정해지면 새 예약에 다시 쓴다.
-- 되돌리기: 20261023135714_couple_app_cron.sql 의 cron.schedule 두 줄.
select cron.unschedule(jobname) from cron.job where jobname in ('diary-evening', 'diary-morning');
