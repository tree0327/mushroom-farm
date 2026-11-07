# 버섯재배관리 (mushroom-farm)

버섯 농장의 하루 기록(입병·접종·오염, 호실별 수확·온습도)을 적고, 기간별로 수확량·불량률을 분석하는 웹앱입니다.
아이폰 홈 화면에 추가해서 쓰는 PWA이고, 허용된 구글 계정만 쓸 수 있습니다.

> 이 저장소는 미용실 매출 관리 → 부부 가계부 → 부부 일기를 거쳐 버섯재배관리로 바뀌었습니다.
> 옛 마이그레이션(`0001`~`0010`, `20261023*`, `20261028*`)은 이력으로 남겨 둡니다.

## 화면 (아래 탭)

- **기록** (`/log`) — 하루 기록 입력. 켜진 농장 항목 → 호실마다 호실 항목 → 메모
- **목록** (`/list`) — 달력(그날 수확·경고 표시) + 달 합계
- **분석** (`/stats`) — 기간별 기본 지표(수확·불량률·오염률·병당 수확), 항목별 요약 카드와 추이, 호실 비교
- **더보기** (`/more`) — 관리: 농장 정보(`/more/farm`), 입력 항목(`/more/fields`), 호실(`/more/rooms`), 계정(`/more/members`), 푸시 설정
  - 농장 정보·입력 항목은 회원도 볼 수 있고 바꾸기는 관리자만

## 스택

- Next.js 16 App Router + TypeScript, React 19
- Supabase (Postgres, Auth — 구글 로그인, RLS)
- shadcn/ui + Tailwind CSS 4
- Web Push (`web-push`, 서비스 워커 `public/sw.js`)
- Vitest (DB 테스트는 PGlite)
- 배포: Vercel

## 구조

```
src/app/        라우트만
src/features/   기능별 코드 (farm-log, field, farm-setting, analysis, calendar, room, member, push)
src/shared/     공통 UI·라이브러리·문구
supabase/       마이그레이션·DB 테스트
docs/           decisions.md(결정), design.md(화면 규칙)
```

- 읽기는 서버 컴포넌트, 쓰기는 서버 액션. 브라우저는 DB 에 직접 붙지 않습니다.
- 서버 결과는 `{ ok: true, data }` 또는 `{ ok: false, code }`. 문구는 `src/shared/messages.ts`.

## 설치 / 실행

```
npm install
npm run dev        # http://localhost:3000
npm run build
npm run typecheck
npm run lint
npm test
npm run db:types   # Supabase 타입 다시 생성 (supabase link 필요)
```

## 환경 변수 (`.env.local`)

| 변수 | 확인 위치 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → Publishable key |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → Secret key (RLS 무시 — 노출 금지) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Vercel 환경 변수 (새로 만들 때: `npx web-push generate-vapid-keys`) |
| `VAPID_PRIVATE_KEY` | 위와 같은 키 쌍 |
| `VAPID_SUBJECT` | 직접 정하는 연락처: `mailto:<이메일>` |

로컬 로그인에는 Supabase → Authentication → URL Configuration → Redirect URLs 에
`http://localhost:3000/auth/callback` 이 있어야 하고, 로그인할 이메일이 `mf_member` 표에 있어야 합니다.

## 데이터 모델

운영 DB 는 매출 앱 [sales-tracker](https://github.com/tree0327/sales-tracker)(`sale`, `sales_member` 등)와 같이 씁니다.
이 앱의 표·public 함수는 모두 `mf_` 로 시작합니다. 접두사 없는 표는 이 앱 것이 아닙니다.

- **mf_member** — 로그인할 수 있는 구글 이메일, `is_admin`(관리자 한 명)
- **mf_farm_setting** — 농장 설정 한 줄(이름·품종·분석 기본 기간·하루 목표·경고 기준)
- **mf_field** · **mf_field_option** — 입력 항목(농장/호실, 정수·소수·선택·글, 범위·경고·분석 표시)과 선택형 보기. 기본 7항목은 `role` 이 붙어 지울 수 없음
- **mf_room** — 수확 호실. 기록이 있으면 지우지 못하고 `is_active=false` 로 둡니다
- **mf_value** — 값 한 칸(날짜·항목·호실). 값이 없으면 행이 없음(0 과 다름)
- **mf_day** — 하루 메모
- **mf_push_subscription** · **mf_if_push_subscription** · **mf_push_log** — 푸시 구독·발송 기록
- DB 함수: `mf_save_day`, `mf_delete_day`, `mf_farm_days`, `mf_room_totals`, `app.current_member_id()`, `app.is_admin()`, 트리거 `app.mf_field_guard`·`app.mf_value_check`

정의: `supabase/migrations/20261105100000_mushroom_core.sql`, `20261107120000_mf_prefix.sql`, `20261107130000_mf_fields.sql`
