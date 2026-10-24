-- 옛 가계부 transactions 의 매출 행(flow=income, category=매출)을 sales_record 로 옮긴다.
-- 운영 적용 전 전체 덤프 필수. 옮긴 뒤 행 수·원금 합·실수령 합이 다르면 예외로 멈춘다(트랜잭션째 취소).
-- 옛 표는 지우지 않는다 — 지우기는 다음 파일(legacy_drop_ledger)에서 덤프 확인 뒤 따로.
-- 되돌리기: delete from public.sales_record; (이 파일 적용 직후, 새 매출을 넣기 전에만)

do $$
declare
  src_count bigint; src_amount numeric; src_final numeric;
  dst_count bigint; dst_amount numeric; dst_final numeric;
begin
  if exists (select 1 from public.sales_record) then
    raise exception 'sales_record 가 비어 있지 않다 — 이미 옮겼거나 새 매출이 들어갔다. 중복 이관을 막으려고 멈춘다.';
  end if;

  -- 소수 금액이 있으면 정수 칸으로 옮길 때 값이 바뀐다 → 멈추고 사람이 본다.
  if exists (
    select 1 from public.transactions
    where flow = 'income' and category = '매출' and (amount <> trunc(amount) or final <> trunc(final))
  ) then
    raise exception '소수 금액인 매출 행이 있다. 정수로 옮기면 값이 바뀌어 멈춘다.';
  end if;

  select count(*), coalesce(sum(amount), 0), coalesce(sum(final), 0)
    into src_count, src_amount, src_final
  from public.transactions where flow = 'income' and category = '매출';

  -- created_at 은 공통 트리거가 now() 로 덮으므로, 원래 입력 시각은 sold_at 에 남는다.
  insert into public.sales_record (sold_at, pay_type, amount, final_amount, name)
  select t.date, t.method, t.amount::integer, t.final::integer, coalesce(t.memo, '')
  from public.transactions t
  where t.flow = 'income' and t.category = '매출'
  order by t.date, t.id;

  select count(*), coalesce(sum(amount), 0), coalesce(sum(final_amount), 0)
    into dst_count, dst_amount, dst_final
  from public.sales_record;

  if (src_count, src_amount, src_final) is distinct from (dst_count, dst_amount, dst_final) then
    raise exception '이관 불일치: 원본 %건 %원/%원, 옮긴 것 %건 %원/%원',
      src_count, src_amount, src_final, dst_count, dst_amount, dst_final;
  end if;

  raise notice '매출 이관: %건, 원금 합 %원, 실수령 합 %원', dst_count, dst_amount, dst_final;
end $$;
