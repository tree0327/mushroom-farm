-- 회원 판정에 「구글로 로그인한 계정」 조건을 더한다.
-- 이메일만 맞춰 보면, Supabase 의 이메일·비밀번호 가입이 열려 있을 때 누구나 등록된 이메일로 가입해 회원·관리자가 될 수 있다.
-- 되돌리기: 20261105100000_mushroom_core.sql 의 두 함수 정의로 다시 만든다.
create or replace function app.current_member_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select m.id
  from public.member m
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
    from public.member m
    join auth.users u on lower(u.email) = m.email
    where u.id = (select auth.uid())
      and exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'google')
  ), false);
$$;

revoke execute on function app.current_member_id(), app.is_admin() from public, anon;
grant execute on function app.current_member_id(), app.is_admin() to authenticated, service_role;
