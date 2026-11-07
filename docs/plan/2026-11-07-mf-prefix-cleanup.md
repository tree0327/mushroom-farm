# mushroom-farm 정리 리팩토링 (mf_ 접두사 + 죽은 코드 + 문서 + 의존성)

## 1) 사용자가 요청한 내용
- 이전 레포에서 옮겨 와 남은 불필요한 코드·안 맞는 이름 정리
- 운영 DB(`cckuhriufgziikpipmdx`)를 sales-tracker와 같이 쓰므로, mushroom-farm이 쓰는 표에 `mf_` 접두사를 붙여 구분 (sales-tracker 쪽 `st_`는 소스가 없어 하지 않음)
- 의존성 정리 (같은 메이저 안 업데이트 + 누락 추가)
- 전부 하나의 큰 작업으로 계획 후 진행

## 2) 이해한 내용 (결정 사항)
| 항목 | 결정 |
|---|---|
| mf_ 대상 표 | `member`, `room`, `daily_log`, `room_log`, `push_subscription`, `if_push_subscription`, `push_log` (7개, 운영 행 수: member 4, 나머지 0) |
| mf_ 대상 함수 | `save_day`, `delete_day`, `farm_days`, `room_totals` → `mf_*` |
| 이름 맞추기 | 제약(`_uk/_fk/_ck`), 인덱스, 정책, 트리거, identity 시퀀스 이름도 `mf_<표>_...` 로 (decisions.md 의 `<표>_<칸>_uk` 규칙 유지) |
| 손대지 않음 | sales-tracker 객체(`sale`, `sales_member` 등 6표·함수·버킷), 옛 표 6개(`sales_record`, `sales_records`, 가계부 4표), 옛 가계부 Pages, `app` 스키마 이름(`app.*` 는 mushroom 전용이라 그대로 — 본문만 새 표 이름으로) |
| 배포 | Vercel 은 main push 시 자동 배포 → 마이그레이션 적용 직후 main push |

## 3) 작업 상세 설명 (쉽게)
- DB 에서 mushroom 표 7개 이름 앞에 `mf_` 를 붙인다. 데이터·권한·RLS 는 이름만 바뀌고 그대로 따라간다.
- 단, 함수 본문은 표 이름을 글자로 들고 있어서 자동으로 안 바뀐다 → `app.current_member_id`, `app.is_admin`, `mf_save_day`, `mf_delete_day`, `mf_farm_days`, `mf_room_totals` 를 새 이름으로 다시 만든다. 옛 함수 4개는 지운다.
- 앱 코드의 `.from("member")` 같은 표 이름·`.rpc("save_day")` 를 새 이름으로 바꾼다.
- 아무도 안 쓰는 코드(매출 화면 등)와 안 쓰는 export 를 지운다.
- 문서(decisions.md, design.md)를 지금 앱(구글 로그인, 버섯 탭) 기준으로 고친다.
- 패키지를 같은 메이저 안 최신으로 올리고 빠진 `server-only` 를 넣는다.

## 4) 작업 계획

### 단계 A — 백업 (운영 변경 전)
- 사용자 실행: `npx supabase login` → `npx supabase link --project-ref cckuhriufgziikpipmdx` → `npx supabase db dump -f <백업경로>/2026-11-07_before-mf_schema.sql` 와 `--data-only` 덤프. (DB 비밀번호 필요 → 사용자)
- 운영 함수 정의를 `pg_get_functiondef` 로 떠서 repo 마이그레이션 원문과 일치하는지 대조 (다르면 운영본 기준).

### 단계 B — 마이그레이션 `supabase/migrations/20261107120000_mf_prefix.sql` (신규 1개)
- `alter table public.<t> rename to mf_<t>` × 7
- `alter table ... rename constraint`, `alter index ... rename`, `alter policy ... rename`, `alter trigger ... rename`, `alter sequence ... rename` (현재 이름은 운영에서 `pg_constraint`/`pg_indexes`/`pg_policies`/`pg_trigger` 조회로 목록 확정)
- `create or replace function app.current_member_id()/app.is_admin()` — `20261105100300_member_google_only.sql` 본문에서 `public.member` → `public.mf_member`
- `mf_save_day/mf_delete_day/mf_farm_days/mf_room_totals` 생성(본문은 `mushroom_core.sql` 의 것 + 새 표 이름), 같은 grant/revoke 복사, 옛 4개 함수 drop
- `push_log_kind_ck` 등 check 값은 그대로
- 되돌리기 SQL 을 파일 머리 주석에 적는다(역순 rename + 옛 함수 재생성)
- 기존 마이그레이션 파일은 수정 안 함(적용 이력)

### 단계 C — 앱 코드 (표·함수 이름 교체, 패턴 동일)
- `.from("<t>")` → `.from("mf_<t>")`, `.rpc("<f>")` → `.rpc("mf_<f>")`
- 대상: `src/shared/lib/member.ts`, `src/app/auth/callback/route.ts`, `src/app/(main)/more/members/page.tsx`, `src/features/member/actions.ts`, `src/features/room/actions.ts`, `src/features/farm-log/{queries,actions}.ts`, `src/features/push/{send,actions}.ts`
- `src/shared/lib/database.types.ts`: 손으로 맞춘 파일이므로 표·함수 키 이름만 교체 (생성기 재실행 안 함 — sales 표까지 끌려와서)
- `supabase/tests/core.test.ts`: SQL 안 표 이름을 새 이름으로 (검증 내용은 그대로, `sales_record` 줄은 유지)

### 단계 D — 죽은 코드 삭제 (knip 근거)
- 파일: `src/features/sales/` 전체(actions, queries, components/sales-screen, totals + totals.test), `src/shared/lib/utils.ts`, `src/shared/ui/{badge,dialog,separator,sheet,skeleton}.tsx`
- export: `bucketUnit/BucketUnit`(stats.ts), `InstallGuide` export 키워드, `MESSAGES` export 키워드, `Row`, `Member` 타입 등 — 내부에서 쓰이면 `export` 만 제거, 아무도 안 쓰면 삭제
- shadcn 부품의 미사용 export(`CardFooter`, `AlertDialogTrigger` 등)는 shadcn 생성 원본이라 유지
- 유지(오탐): `public/sw.js`, `pretendard`
- totals.test.ts 는 삭제 대상 코드의 테스트라 함께 삭제 (테스트 조작 아님 — 대상 코드 제거)

### 단계 E — 문서·이름
- `docs/decisions.md`: 로그인(구글 OAuth + member 화이트리스트), 범위(버섯재배관리), 표 이름 규칙에 `mf_` 접두사·공유 DB 설명 추가
- `docs/design.md`: 아래 탭(기록·목록·분석·더보기), 하위 화면 예시
- `README.md`: 표 이름 mf_ 반영, 공유 DB 메모
- GitHub 레포 설명(“현금/카드 매출 기록…”) 수정은 `gh repo edit` — 외부 변경이라 실행 전 확인

### 단계 F — 의존성
- 같은 메이저 안: next·eslint-config-next 16.4.5, react·react-dom 19.3.1, @supabase/supabase-js 2.119.0, lucide-react 1.70.0, shadcn 4.23.0, tailwindcss·@tailwindcss/turbopack 4.3.5, vitest 5.1.0, @electric-sql/pglite 0.5.15, cn 0.5.2 (정확 버전 고정 방식 유지)
- `server-only` 추가 (5곳 import 중)
- 제외: eslint 10, typescript 7, supabase CLI 3, web-push 4, @types/node 26, npm audit 13건

### 단계 G — 적용 순서 (운영)
1. 로컬 검증 전부 통과 (아래)
2. 사용자 승인 → MCP `apply_migration` 으로 운영 적용
3. 바로 커밋 + main push (그때 push 허락 요청) → Vercel 자동 배포
4. 배포 사이 수십 초~수 분 운영 앱 오류 가능 (사용자 4명, 데이터 거의 없음)

### 범위 밖
- sales-tracker 표 `st_` 변경, 옛 표 6개 처리·옛 Pages 내리기(이번엔 그대로 둠), 보안 advisors 수정(sale_check_prepaid_balance anon 실행, pg_net, 유출 비밀번호 보호), dabin_* 마이그레이션 원문 복구, 메이저 업그레이드

## 5) 검증 계획
| 대상 | 방법 |
|---|---|
| 정적 | `npm run typecheck`, `npm run lint`, `npx knip`(남은 항목 = 의도적 유지만) |
| DB 로직 | `npm test` — PGlite 에 새 마이그레이션까지 돌려 RLS·회원 판정·mf_save_day 검증 |
| 빌드 | `npm run build` |
| 운영 DB | 적용 후 `list_tables`(mf_ 7개, sales 표 그대로), `pg_proc` 조회(mf_ 함수 4개, 옛 4개 없음), `get_advisors` security/performance 전후 비교, sales-tracker 표 행 수 변화 없음 |
| sales-tracker 무영향 | https://tree0327.github.io/sales-tracker/ 접속 로그인 화면 + 콘솔·네트워크 에러 0 |
| UI | 로컬 dev → 로그인 후 /log 저장·/list·/stats·/more/rooms·/more/members 스크린샷, 콘솔 에러 0, 네트워크 4xx/5xx 0 (구글 로그인은 사용자가 브라우저에서) |
| 운영 배포 | Vercel 배포 후 같은 화면 확인 |
| 완료 후 | `/ponytail-review` → done-checklist |
