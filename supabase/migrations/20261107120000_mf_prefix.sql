-- 버섯재배관리 표·함수 이름 앞에 mf_ 를 붙인다. 이 DB 는 sales-tracker(sale, sales_member 등)와 같이 쓴다.
-- 표 7개: member, room, daily_log, room_log, push_subscription, if_push_subscription, push_log
-- 제약·인덱스·정책·트리거·identity 시퀀스 이름도 <표>_... → mf_<표>_... 로 맞춘다(decisions.md 제약 이름 규칙).
-- 함수 4개: save_day, delete_day, farm_days, room_totals → mf_* (권한은 rename 으로 그대로 따라간다).
-- 본문이 표 이름을 글자로 들고 있는 함수(app.current_member_id, app.is_admin, mf_* 4개)는 새 이름으로 다시 만든다.
-- 되돌리기: 아래 do 블록을 mf_ 를 떼는 방향으로 돌리고(alter table public.mf_<t> rename to <t> …),
--   함수는 alter function public.mf_<f> rename to <f> 후 20261105100000_mushroom_core.sql·20261105100300_member_google_only.sql 의 본문으로 다시 만든다.

do $$
declare
  t text;
  nt text;
  r record;
begin
  foreach t in array array['member', 'room', 'daily_log', 'room_log', 'push_subscription', 'if_push_subscription', 'push_log'] loop
    nt := 'mf_' || t;
    execute format('alter table public.%I rename to %I', t, nt);

    -- 제약(이름을 바꾸면 딸린 인덱스 이름도 같이 바뀐다)
    for r in select conname from pg_constraint where conrelid = format('public.%I', nt)::regclass and conname not like 'mf\_%' loop
      execute format('alter table public.%I rename constraint %I to %I', nt, r.conname, 'mf_' || r.conname);
    end loop;

    -- 제약에 딸리지 않은 인덱스
    for r in select indexname from pg_indexes where schemaname = 'public' and tablename = nt and indexname not like 'mf\_%' loop
      execute format('alter index public.%I rename to %I', r.indexname, 'mf_' || r.indexname);
    end loop;

    for r in select policyname from pg_policies where schemaname = 'public' and tablename = nt and policyname not like 'mf\_%' loop
      execute format('alter policy %I on public.%I rename to %I', r.policyname, nt, 'mf_' || r.policyname);
    end loop;

    for r in select tgname from pg_trigger where tgrelid = format('public.%I', nt)::regclass and not tgisinternal and tgname not like 'mf\_%' loop
      execute format('alter trigger %I on public.%I rename to %I', r.tgname, nt, 'mf_' || r.tgname);
    end loop;

    execute format('alter sequence public.%I rename to %I', t || '_id_seq', nt || '_id_seq');
  end loop;
end $$;

comment on table public.mf_if_push_subscription is '브라우저가 준 푸시 구독 원문. mf_push_subscription 으로 옮긴다.';

-- ─────────────────────────────────────────────
-- 회원 판정(본문만 새 표 이름으로)
-- ─────────────────────────────────────────────
create or replace function app.current_member_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select m.id
  from public.mf_member m
  join auth.users u on lower(u.email) = m.email
  where u.id = (select auth.uid())
    and exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'google');
$$;

create or replace function app.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select m.is_admin
    from public.mf_member m
    join auth.users u on lower(u.email) = m.email
    where u.id = (select auth.uid())
      and exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'google')
  ), false);
$$;

-- ─────────────────────────────────────────────
-- 농장 함수: 이름 바꾸고(권한 유지) 본문을 새 표 이름으로
-- ─────────────────────────────────────────────
alter function public.save_day(date, integer, integer, integer, text, jsonb) rename to mf_save_day;
alter function public.delete_day(date) rename to mf_delete_day;
alter function public.farm_days(date, date) rename to mf_farm_days;
alter function public.room_totals(date, date) rename to mf_room_totals;

create or replace function public.mf_save_day(
  p_log_date date,
  p_bottled_count integer,
  p_inoculated_count integer,
  p_contaminated_count integer,
  p_memo text,
  p_rooms jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  r jsonb;
  v_room_id bigint;
  v_good numeric;
  v_defect numeric;
  v_temp numeric;
  v_hum smallint;
  v_memo text := coalesce(btrim(p_memo), '');
begin
  if p_bottled_count is null and p_inoculated_count is null and p_contaminated_count is null and v_memo = '' then
    delete from public.mf_daily_log where log_date = p_log_date;
  else
    insert into public.mf_daily_log (log_date, bottled_count, inoculated_count, contaminated_count, memo)
    values (p_log_date, p_bottled_count, p_inoculated_count, p_contaminated_count, v_memo)
    on conflict (log_date) do update set
      bottled_count = excluded.bottled_count,
      inoculated_count = excluded.inoculated_count,
      contaminated_count = excluded.contaminated_count,
      memo = excluded.memo;
  end if;

  for r in select * from jsonb_array_elements(coalesce(p_rooms, '[]'::jsonb)) loop
    v_room_id := (r ->> 'room_id')::bigint;
    v_good := (r ->> 'good_kg')::numeric;
    v_defect := (r ->> 'defect_kg')::numeric;
    v_temp := (r ->> 'temperature_c')::numeric;
    v_hum := (r ->> 'humidity_pct')::smallint;
    if v_good is null and v_defect is null and v_temp is null and v_hum is null then
      delete from public.mf_room_log where log_date = p_log_date and room_id = v_room_id;
    else
      insert into public.mf_room_log (log_date, room_id, good_kg, defect_kg, temperature_c, humidity_pct)
      values (p_log_date, v_room_id, v_good, v_defect, v_temp, v_hum)
      on conflict (log_date, room_id) do update set
        good_kg = excluded.good_kg,
        defect_kg = excluded.defect_kg,
        temperature_c = excluded.temperature_c,
        humidity_pct = excluded.humidity_pct;
    end if;
  end loop;
end;
$$;

create or replace function public.mf_delete_day(p_log_date date)
returns void
language sql
set search_path = ''
as $$
  delete from public.mf_room_log where log_date = p_log_date;
  delete from public.mf_daily_log where log_date = p_log_date;
$$;

create or replace function public.mf_farm_days(p_from date, p_to date)
returns table (
  log_date date,
  bottled_count bigint,
  inoculated_count bigint,
  contaminated_count bigint,
  good_kg numeric,
  defect_kg numeric,
  has_memo boolean
)
language sql
stable
set search_path = ''
as $$
  with dates as (
    select d.log_date from public.mf_daily_log d where d.log_date between p_from and p_to
    union
    select r.log_date from public.mf_room_log r where r.log_date between p_from and p_to
  ),
  rooms as (
    select r.log_date, sum(r.good_kg) as good_kg, sum(r.defect_kg) as defect_kg
    from public.mf_room_log r
    where r.log_date between p_from and p_to
    group by r.log_date
  )
  select x.log_date, d.bottled_count, d.inoculated_count, d.contaminated_count,
         rm.good_kg, rm.defect_kg, coalesce(d.memo, '') <> ''
  from dates x
  left join public.mf_daily_log d on d.log_date = x.log_date
  left join rooms rm on rm.log_date = x.log_date
  order by x.log_date;
$$;

create or replace function public.mf_room_totals(p_from date, p_to date)
returns table (room_id bigint, name text, is_active boolean, good_kg numeric, defect_kg numeric)
language sql
stable
set search_path = ''
as $$
  select rm.id, rm.name, rm.is_active, sum(r.good_kg), sum(r.defect_kg)
  from public.mf_room_log r
  join public.mf_room rm on rm.id = r.room_id
  where r.log_date between p_from and p_to
  group by rm.id, rm.name, rm.is_active, rm.sort_order
  order by rm.sort_order, rm.id;
$$;
