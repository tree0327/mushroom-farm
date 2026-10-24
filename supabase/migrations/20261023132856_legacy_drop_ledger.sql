-- 옛 가계부 표를 지운다. 되돌릴 수 없다.
-- 적용 조건(사람이 확인): 1) 전체 덤프를 떴다 2) 덤프를 다시 읽어 표마다 행 수가 맞다 3) 매출 이관(legacy_move_sales)이 끝났다.
-- 되돌리기: 덤프에서 이 표들만 복원(pg_restore -t transactions ...).

-- db push 로 이관과 한 번에 돌지 않게, 덤프 확인 뒤 같은 연결에서 아래 설정을 켜야만 돈다:
--   set app.allow_ledger_drop = 'on';
do $$
begin
  if coalesce(current_setting('app.allow_ledger_drop', true), '') <> 'on' then
    raise exception '덤프 확인 표시(app.allow_ledger_drop)가 없다. 옛 표를 지우지 않는다.';
  end if;
  -- 매출 이관이 안 끝났으면 지우지 않는다
  if (select count(*) from public.sales_record)
     < (select count(*) from public.transactions where flow = 'income' and category = '매출') then
    raise exception '매출 이관이 덜 됐다. 옛 표를 지우지 않는다.';
  end if;
end $$;

-- realtime publication 에서 먼저 뺀다(0010_realtime 이 넣은 것)
do $$
declare t text;
begin
  foreach t in array array['transactions', 'fixed_expenses', 'expense_categories', 'budgets'] loop
    if exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime drop table public.%I', t);
    end if;
  end loop;
end $$;

drop table if exists public.budgets;
drop table if exists public.fixed_expenses;
drop table if exists public.expense_categories;
drop table if exists public.transactions;
drop table if exists public.sales_records;
