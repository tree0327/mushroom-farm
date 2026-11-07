# mushroom-farm 전면 재설계 — 설정 가능한 입력 항목 + 관리 화면 세분화 + 모듈화 (mf_ 접두사 포함, 한 번에 배포)

## Context
- 앞 작업(커밋 `d5b0fa6`, 브랜치 `refactor/mf-prefix`)에서 mushroom 표·함수에 `mf_` 접두사를 붙였다. 운영 DB 적용은 아직 안 됨(확인 창 취소, "Nothing was run").
- 사용자가 범위를 넓혔다: 코드 구조 전면 재설계 + 파일 모듈화 + 관리 페이지 세분화 + "버섯 농장에서 관리할 수 있는 모든 정보를 관리자가 직접 세팅"(새 항목에 id 부여).
- 결정(사용자 답변):
  | 항목 | 결정 |
  |---|---|
  | 배포 | mf_ 와 이번 재설계를 한 번에 운영 적용·배포 |
  | 리팩토링 | 구조까지 전면 재설계 |
  | 새 항목 방식 | 항목 정의 표(id) + 값 표. 앱이 DB 구조(ALTER TABLE)를 바꾸지 않는다 |
  | 값 종류 | 숫자(정수/소수) · 선택형 · 글 — 관리자가 고른다 |
  | 기본 7항목 | 이름·단위·범위·끄기 가능, 삭제 불가(분석 계산 유지) |
  | 분석 | 항목별 요약 카드 + 고르면 추이 그래프 |
  | 설정 항목 | 입력 항목 켜고 끄기, 분석 기본값, 농장 정보, 온습도(=숫자 항목) 기준 범위·경고, 사용자 정의 항목 |
  | 권한 | 관리자만 변경, 회원은 보기만 |

## 1) 사용자가 요청한 내용
mf_ 정리에 더해 코드 전부 리팩토링·모듈화, 관리 페이지를 세분화해 농장에서 기록·관리할 정보를 관리자가 직접 설정(항목 추가 시 새 id)하게 해 달라.

## 2) 이해한 내용
- 지금 기록 항목 7개(입병·접종·오염 / 호실별 정품·불량·온도·습도)는 표 칸·함수·화면·검증 코드에 박혀 있다 → 항목을 "데이터"로 바꾼다.
- 항목은 농장 단위(하루 1값) 또는 호실 단위(하루·호실마다 1값). 관리자가 만들고, 회원은 그 항목으로 기록만 한다.
- 기본 7항목은 "역할(role)"을 가져서 수확량·불량률·오염률·병당 수확 계산이 계속 된다.
- 운영 mushroom 기록은 0건(`mf_daily_log`·`mf_room_log` 0행, 2026-11-07 조회)이라 옮길 실데이터는 없다. 그래도 마이그레이션은 옮기는 SQL을 넣고, 적용 직전 0행을 다시 확인한다.

## 3) 작업 상세 설명 (쉽게)
- **항목 표**: "입병", "정품", "배지 상태" 같은 항목 한 줄 = id 하나. 이름, 종류(정수/소수/선택/글), 단위, 입력 허용 범위, 경고 범위, 분석 표시(합계/평균/없음), 순서, 켜짐 여부를 가진다.
- **선택지 표**: 선택형 항목의 보기(좋음/보통/나쁨…)도 각각 id.
- **값 표**: (날짜, 항목 id, 호실 id 또는 없음, 값) 한 줄씩 쌓는다. 하루 메모는 따로.
- **농장 설정**: 농장 이름, 품종, 분석 기본 기간, 하루 목표 수확량, 불량률·오염률 경고 기준 — 한 줄짜리 표.
- 기록 화면은 켜진 항목을 순서대로 그려서 받는다. 경고 범위를 벗어난 값은 기록·목록·분석에서 표시한다.
- 더보기 → "관리" 아래로 농장 정보 / 입력 항목 / 호실 / 계정 / 알림을 나눈다. 회원은 보기만, 관리자만 저장 버튼이 보인다(실제 차단은 DB RLS).

## 4) 작업 계획

### 4-1. DB — 새 마이그레이션 `supabase/migrations/20261107130000_mf_fields.sql`
(`20261107120000_mf_prefix.sql` 다음에 적용. 기존 파일은 고치지 않는다)

표 (칸 순서·공통 4칸 트리거·제약 이름 규칙은 decisions.md 그대로):
| 표 | 칸 | 제약 |
|---|---|---|
| `mf_farm_setting` | id(=1 고정), farm_name, crop, default_period, target_daily_kg, defect_rate_warn_pct, contamination_rate_warn_pct | id=1 ck, period ck(1w/1m/3m/6m/1y), 0~100 ck |
| `mf_field` | id, scope(farm/room), role(null 또는 bottled/inoculated/contaminated/good/defect/temperature/humidity), name, value_type(int/decimal/choice/text), unit, min_value, max_value, warn_min, warn_max, summary(sum/avg/none), sort_order, is_active | role uk(부분), (scope,name) uk, min≤max ck, 이름 1~20자 ck |
| `mf_field_option` | id, field_id fk, label, sort_order, is_active | (field_id,label) uk |
| `mf_day` | id, log_date uk, memo | memo ≤1000 |
| `mf_value` | id, log_date, field_id fk(restrict), room_id fk(restrict, null=농장), num_value, option_id fk(restrict), text_value | (log_date, field_id, room_id) uk **nulls not distinct**, 값 칸 정확히 하나 ck, text ≤500 |

트리거·함수:
- `mf_field_guard` (before update/delete on mf_field): role 있는 항목은 scope·value_type·role 변경과 삭제 금지 / 값이 있는 항목은 scope·value_type 변경 금지.
- `mf_value_check` (before insert/update on mf_value): scope 와 room_id 일치, value_type 과 값 칸 일치(int 는 정수), min/max 범위, option 이 그 항목 것인지 — 위반 시 23514. (Data API 직접 쓰기도 막힘)
- `mf_save_day(p_log_date, p_memo, p_values jsonb)`: 받은 (field_id, room_id) 키마다 값 있으면 upsert, 비면 delete. memo 비면 mf_day 행 삭제.
- `mf_delete_day(p_log_date)`.
- `mf_farm_days(p_from, p_to)` → 하루 1행: log_date, has_memo, totals jsonb `{field_id: {sum, avg, min, max, n, opts:{option_id: count}}}` (1년=최대 731행 — Data API 1000행 한도 안).
- `mf_room_totals(p_from, p_to)` → (room_id, field_id, sum, avg, n).
- 앞 마이그레이션의 `mf_save_day/mf_delete_day/mf_farm_days/mf_room_totals` 는 새 시그니처로 drop 후 재생성.

씨앗·이전:
- 기본 7항목 insert(지금 범위 그대로: 병 수 int 0~10,000,000 / kg decimal 0~999,999.9 / 온도 -20~60 / 습도 int 0~100, 분석 표시: 병·kg=합계, 온습도=평균).
- `mf_farm_setting` 1행(default_period '1m').
- `mf_daily_log`·`mf_room_log` → `mf_value`·`mf_day` insert-select, 그 뒤 두 표 drop(운영 0행 확인 후). **표 삭제 포함 — 사용자 승인 대상.**

RLS·권한:
- 읽기: 회원(`app.current_member_id() is not null`) 전부.
- `mf_farm_setting`·`mf_field`·`mf_field_option` 쓰기: `app.is_admin()` 만. `mf_field` delete 는 `role is null` 도 조건.
- `mf_day`·`mf_value` 쓰기: 회원.
- 새 FK(field_id, room_id, option_id)에 인덱스(advisors unindexed_foreign_keys 방지).

### 4-2. 코드 구조 (전면 재설계, 규칙: `src/app` 은 라우트만, 기능은 `src/features/<기능>/`)
```
src/features/
  farm-setting/  queries.ts  actions.ts  schema.ts  components/farm-setting-form.tsx
  field/         queries.ts  actions.ts  schema.ts  types.ts
                 components/ field-list.tsx  field-form.tsx  option-editor.tsx
  farm-log/      queries.ts  actions.ts  schema.ts  lib/value-input.ts(글자→값 파싱·경고 판정, 테스트)
                 components/ log-editor.tsx(조립만)  day-nav.tsx  field-input.tsx(종류별 입력칸)
                             farm-fields-card.tsx  room-card.tsx  memo-card.tsx  delete-day-dialog.tsx
  analysis/      lib/ period.ts  buckets.ts  metrics.ts(role 기반 수확·불량률 등)  field-summary.ts  (+ 테스트)
                 components/ trend-chart.tsx  summary-cards.tsx  field-cards.tsx  room-ranking.tsx  period-nav.tsx
  calendar/      components/month-calendar.tsx (list 페이지 달력 분리)
  room/ member/  (그대로, Room 타입을 room/types.ts 로 이동 — 지금은 farm-log/queries 에 있음)
  push/          components/push-settings.tsx · install-guide.tsx 분리
```
- 기존 재사용: `useAction`(src/shared/hooks/use-action.ts), `Result`/`fail`/`codeFromDbError`(src/shared/lib/result.ts), `requireMember`·`getMemberOrRedirect`(src/shared/lib/member.ts), `PageHeader`/`PageBody`, shadcn `Card`·`Input`·`Textarea`·`Switch`·`AlertDialog`·`Label`, `stats.ts` 의 `periodRange`·`previousRange`·`buckets`·`summarize` 로직(파일만 나누고 role 기반 입력으로 바꿈), `room-manager.tsx` 의 순서 바꾸기·켜고 끄기 UI 패턴(항목 목록에 그대로).
- 선택형 입력: 보기가 적으니 버튼 묶음(새 부품 없이 `Button` variant). 글: `Input`.
- 문구는 `src/shared/messages.ts` 에 코드 추가(FIELD_DUPLICATE, FIELD_IN_USE, FIELD_LOCKED, VALUE_OUT_OF_RANGE 등).
- `database.types.ts` 손으로 새 표·함수에 맞춤.

### 4-3. 화면
| 경로 | 내용 | 권한 |
|---|---|---|
| `/log` | 켜진 농장 항목 카드 → 호실 카드(켜진 호실 × 켜진 호실 항목) → 메모. 종류별 입력칸, 범위 밖 저장 막음, 경고 범위 밖이면 칸에 경고 표시 | 회원 |
| `/list` | 달력 + 그날 요약(역할 항목) + 경고 있는 날 점 표시 | 회원 |
| `/stats` | 기간 탭(기본값 = 농장 설정), 기본 지표 카드(끈 항목 관련 카드는 숨김, 불량률·오염률 경고 기준 넘으면 표시, 하루 목표 대비), 사용자 항목 요약 카드(합계/평균/선택 횟수, 글은 제외), 카드 누르면 `?f=<id>` 추이 그래프, 호실 비교 | 회원 |
| `/more` | 관리 메뉴: 농장 정보 · 입력 항목 · 호실 · 계정(관리자) · 알림 · 로그아웃 | 회원 |
| `/more/farm` | 농장 이름·품종·분석 기본 기간·하루 목표 kg·불량률/오염률 경고 % | 보기: 회원 / 저장: 관리자 |
| `/more/fields` | 농장 항목 / 호실 항목 두 묶음. 순서 바꾸기·켜고 끄기·추가 | 〃 |
| `/more/fields/new?scope=…`, `/more/fields/[id]` | 이름·종류(만든 뒤 값이 있으면 고정)·단위·입력 범위·경고 범위·분석 표시·선택지 편집·삭제(사용자 항목, 값 없을 때만 — 있으면 "끄기" 안내) | 〃 |
| `/more/rooms`, `/more/members` | 지금 그대로 | 지금 그대로 |
- 농장 이름은 기록 화면 제목 줄과 로그인 화면에 쓴다(manifest 는 정적이라 그대로).

### 4-4. 테스트
- PGlite `supabase/tests/core.test.ts`: 새 표 RLS(회원 읽기·관리자만 설정 쓰기·낯선 계정 0행), `mf_field_guard`(기본 항목 삭제·종류 변경 거절), `mf_value_check`(범위·종류·scope·선택지 소속), `mf_save_day` upsert/빈값 삭제, `mf_farm_days` jsonb 합계·평균·선택 횟수, 기존 mf_ 이름 검사 유지.
- Vitest: `analysis/lib/*`(기존 stats.test 이전 + role 매핑·항목 요약), `farm-log/lib/value-input.ts`(파싱·경고).

### 4-5. 문서
- `docs/decisions.md` DB·화면 카드 갱신(항목 정의 방식, 설정 권한), `docs/design.md` 부품 표(선택형 버튼 묶음, 경고 표시 색 토큰), README 데이터 모델.

### 4-6. 운영 적용·배포 순서
1. 로컬: typecheck·lint·test·build·knip 통과.
2. 적용 직전 운영 재확인: `mf_` 대상 표 행 수(daily_log·room_log 0행), sales 표 행 수 기록.
3. MCP `apply_migration` 2개 순서대로(mf_prefix → mf_fields). 각각 한 트랜잭션.
4. 즉시 로컬 dev(운영 DB 연결)로 화면 확인 — 구글 로그인은 사용자 Chrome(claude-in-chrome)에서 사용자가 1회.
5. main 병합·push → Vercel 자동 배포 → 운영 주소 확인.
- 3~5 사이 운영 mushroom 앱은 옛 코드라 오류(기록 0건·사용자 4명). sales-tracker 는 영향 없음.
- 되돌리기: 백업 없음(사용자 결정). 바뀌는 데이터는 `mf_member` 4행뿐이고 스냅샷이 `/private/tmp/claude-501/-Users-gimdabin-Develop/644fe5b0-d34d-4af8-a39b-6d6f25b44349/scratchpad/2026-11-07_before-mf_member.json` 에 있다. 마이그레이션 머리 주석에 역방향 SQL.

### 범위 밖
- sales-tracker 객체·옛 표 6개·옛 가계부 Pages, 보안 advisors 기존 항목(sale_check_prepaid_balance 등), 메이저 의존성, 호실별 경고 범위 덮어쓰기(항목 단위 경고만), 항목 값 수정 이력, 푸시로 경고 알림 보내기.

## 5) 검증 계획
| 대상 | 방법 |
|---|---|
| 정적 | `npm run typecheck`, `npm run lint`, `npx knip`(의도적 유지만 남음) |
| DB 로직 | `npm test` — PGlite 에 모든 mf 마이그레이션 적용 후 RLS·트리거·함수 |
| 빌드 | `npm run build` |
| 운영 DB | 적용 후 `list_tables`(mf_ 표 목록, sales 표 행 수 변화 없음), 기본 7항목·설정 1행 조회, `get_advisors` security·performance 를 적용 전과 비교(새 경고 0) |
| 쿼리 | `mf_farm_days`·`mf_room_totals`·값 조회에 `EXPLAIN (ANALYZE, BUFFERS)` |
| UI | 로컬 dev → 관리자 로그인: 항목 추가(숫자·선택·글)·순서·끄기 → `/log` 저장(범위 밖 거절, 경고 표시) → `/list`·`/stats`(요약 카드·`?f=` 추이) → `/more/farm` 저장. 각 화면 스크린샷, 콘솔 에러 0, 네트워크 4xx/5xx 0. 회원(비관리자) 화면에서 저장 버튼 없음·직접 저장 시 거절 확인은 PGlite RLS 테스트로 대체(회원 계정 로그인 불가 시) |
| sales-tracker 무영향 | https://tree0327.github.io/sales-tracker/ 로그인 화면 + 콘솔·네트워크 에러 0 |
| 운영 배포 | Vercel 배포 후 운영 주소에서 같은 화면 |
| 완료 | `/ponytail-review` → done-checklist |
