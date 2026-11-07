// 마이그레이션을 내 PC 안의 Postgres(PGlite)에 그대로 돌려 회원 판정·RLS·저장 함수를 검사한다. 운영 DB 는 건드리지 않는다.
// Supabase 의 auth 스키마·역할은 최소한으로 흉내 낸다(auth.uid() 는 request.jwt.claim.sub 를 읽는다).
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const ADMIN = "00000000-0000-0000-0000-00000000000a"; // app@bibimble.com — 마이그레이션이 넣는 첫 관리자
const WORKER = "00000000-0000-0000-0000-00000000000b"; // 관리자가 더할 계정
const STRANGER = "00000000-0000-0000-0000-00000000000c"; // 등록 안 된 구글 계정
const IMPOSTOR = "00000000-0000-0000-0000-00000000000d"; // 관리자 이메일로 비밀번호 가입한 계정(구글 아님)

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create table auth.identities (id uuid primary key default gen_random_uuid(), user_id uuid not null, provider text not null);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to authenticated, anon, service_role;
  grant execute on function auth.uid() to authenticated, anon, service_role;
  grant usage on schema public to authenticated, anon, service_role;
`;

let db: PGlite;

// 이 앱의 마이그레이션만(옛 가계부 0001~0010 은 옛 표가 필요해서, 예약 알림은 PGlite 에 pg_cron 이 없어서 뺀다)
function appMigrations(): string[] {
  const dir = join(__dirname, "..", "migrations");
  return readdirSync(dir)
    .filter((f) => /^2\d{13}_.*\.sql$/.test(f) && !f.includes("legacy") && !f.endsWith("_cron.sql"))
    .sort()
    .map((f) => readFileSync(join(dir, f), "utf8"));
}

async function asUser<T>(uid: string, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role authenticated; set local request.jwt.claim.sub = '${uid}';`);
    return fn(tx);
  });
}

// 거절되는지: 오류 코드(SQLSTATE)를 돌려준다. 통과하면 null.
async function errorCode(uid: string, sql: string): Promise<string | null> {
  try {
    await asUser(uid, (tx) => tx.exec(sql));
    return null;
  } catch (e) {
    return (e as { code?: string }).code ?? "unknown";
  }
}

const count = async (uid: string, table: string) =>
  asUser(uid, async (tx) => Number((await tx.query<{ n: number }>(`select count(*)::int as n from public.${table}`)).rows[0].n));

let room1: number;
let room2: number;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  // 매출 표는 개편 전 행이 그대로 남는지 본다 — 마이그레이션 중간(부부 일기 core 뒤)에 행을 넣으려고 나눠 돌린다.
  const migrations = appMigrations();
  const coupleCore = migrations.findIndex((m) => m.includes("부부 일기 앱 1차"));
  for (const sql of migrations.slice(0, coupleCore + 1)) await db.exec(sql);
  await db.exec(`insert into public.sales_record (sold_at, pay_type, amount, final_amount) values
    ('2026-10-01 10:00+09', '현금', 50000, 50000), ('2026-10-02 10:00+09', '카드', 30000, 30000);`);
  for (const sql of migrations.slice(coupleCore + 1)) await db.exec(sql);

  await db.exec(`
    insert into auth.users values
      ('${ADMIN}', 'App@Bibimble.com'), ('${WORKER}', 'worker@farm.kr'), ('${STRANGER}', 'stranger@gmail.com'),
      ('${IMPOSTOR}', 'app@bibimble.com');
    insert into auth.identities (user_id, provider) values
      ('${ADMIN}', 'google'), ('${WORKER}', 'google'), ('${STRANGER}', 'google'), ('${IMPOSTOR}', 'email');
    insert into public.mf_room (name, sort_order) values ('1호실', 1), ('2호실', 2);
  `);
  const rooms = await db.query<{ id: number }>(`select id from public.mf_room order by sort_order`);
  room1 = Number(rooms.rows[0].id);
  room2 = Number(rooms.rows[1].id);
}, 60_000);

describe("부부 일기 지우기 · 매출 남기기", () => {
  it("일기·해답·쿠폰·쉬는 날 표가 없다", async () => {
    const r = await db.query<{ t: string }>(
      `select table_name as t from information_schema.tables where table_schema = 'public' order by 1`,
    );
    expect(r.rows.map((x) => x.t)).toEqual([
      "mf_day", "mf_farm_setting", "mf_field", "mf_field_option", "mf_if_push_subscription", "mf_member", "mf_push_log", "mf_push_subscription",
      "mf_room", "mf_value", "sales_record",
    ]);
  });

  it("mf_ 표의 제약·인덱스·정책·트리거·시퀀스·함수 이름도 mf_ 로 시작한다", async () => {
    const r = await db.query<{ name: string }>(`
      select conname as name from pg_constraint where conrelid::regclass::text like 'mf\\_%'
      union all select indexname from pg_indexes where schemaname = 'public' and tablename like 'mf\\_%'
      union all select policyname from pg_policies where schemaname = 'public' and tablename like 'mf\\_%'
      union all select tgname from pg_trigger where tgrelid::regclass::text like 'mf\\_%' and not tgisinternal
      union all select relname from pg_class where relkind = 'S' and relname like '%\\_id\\_seq' and relname not like 'sales\\_record%'
      union all select proname from pg_proc where pronamespace = 'public'::regnamespace`);
    expect(r.rows.length).toBeGreaterThan(30);
    expect(r.rows.filter((x) => !x.name.startsWith("mf_"))).toEqual([]);
  });

  it("매출 행은 그대로", async () => {
    expect((await db.query<{ n: number }>(`select count(*)::int as n from public.sales_record`)).rows[0].n).toBe(2);
  });

  it("첫 관리자는 app@bibimble.com 하나", async () => {
    const r = await db.query<{ email: string; is_admin: boolean }>(`select email, is_admin from public.mf_member`);
    expect(r.rows).toEqual([{ email: "app@bibimble.com", is_admin: true }]);
  });
});

describe("회원 판정 — 구글 계정 이메일", () => {
  it("대소문자가 달라도 같은 이메일이면 회원", async () => {
    const id = await asUser(ADMIN, async (tx) => (await tx.query<{ v: number | null }>(`select app.current_member_id() as v`)).rows[0].v);
    expect(id).not.toBeNull();
  });

  it("등록된 이메일이어도 구글 로그인이 아니면 회원이 아니다", async () => {
    expect(await count(IMPOSTOR, "mf_member")).toBe(0);
    expect(await errorCode(IMPOSTOR, `insert into public.mf_member (email) values ('evil@x.kr')`)).toBe("42501");
  });

  it("등록 안 된 계정은 아무것도 못 본다", async () => {
    expect(await count(STRANGER, "mf_member")).toBe(0);
    expect(await count(STRANGER, "mf_room")).toBe(0);
    expect(await count(STRANGER, "sales_record")).toBe(0);
  });

  it("관리자가 계정을 더하면 그 계정이 들어온다", async () => {
    expect(await errorCode(ADMIN, `insert into public.mf_member (email) values ('worker@farm.kr')`)).toBeNull();
    expect(await count(WORKER, "mf_room")).toBe(2);
  });

  it("관리자가 아니면 계정을 더하거나 빼지 못한다", async () => {
    await asUser(WORKER, (tx) => tx.exec(`insert into public.mf_member (email) values ('x@farm.kr')`)).catch(() => {});
    expect(await count(ADMIN, "mf_member")).toBe(2);
    await asUser(WORKER, (tx) => tx.exec(`delete from public.mf_member where email = 'worker@farm.kr'`));
    expect(await count(ADMIN, "mf_member")).toBe(2);
  });

  it("관리자는 자기(관리자 행)를 빼지 못하고, 관리자를 새로 만들지 못한다", async () => {
    await asUser(ADMIN, (tx) => tx.exec(`delete from public.mf_member where is_admin`));
    expect(await count(ADMIN, "mf_member")).toBe(2);
    expect(await errorCode(ADMIN, `insert into public.mf_member (email, is_admin) values ('boss@farm.kr', true)`)).toBe("42501");
  });

  it("이메일은 소문자·형식 검사", async () => {
    expect(await errorCode(ADMIN, `insert into public.mf_member (email) values ('Boss@farm.kr')`)).toBe("23514");
    expect(await errorCode(ADMIN, `insert into public.mf_member (email) values ('not-an-email')`)).toBe("23514");
  });
});

// 기본 항목 id(role → id)
let F: Record<string, number>;
const val = (field: number, room: number | null, v: { num?: number | string; option?: number; text?: string }) =>
  JSON.stringify({ field_id: field, room_id: room, num_value: v.num ?? null, option_id: v.option ?? null, text_value: v.text ?? null });
const save = (date: string, memo: string, values: string[]) => `select public.mf_save_day('${date}', '${memo}', '[${values.join(",")}]')`;
const numOf = async (date: string, field: number, room: number | null) =>
  (
    await db.query<{ v: string | null }>(
      `select num_value::text as v from public.mf_value where log_date = '${date}' and field_id = ${field} and room_id is not distinct from ${room ?? "null"}`,
    )
  ).rows.map((r) => r.v);

describe("기본 항목 · 농장 설정", () => {
  beforeAll(async () => {
    const r = await db.query<{ role: string; id: number }>(`select role, id from public.mf_field where role is not null`);
    F = Object.fromEntries(r.rows.map((x) => [x.role, Number(x.id)]));
  });

  it("기본 7항목과 설정 한 줄이 있다", async () => {
    expect(Object.keys(F).sort()).toEqual(["bottled", "contaminated", "defect", "good", "humidity", "inoculated", "temperature"]);
    expect(await count(WORKER, "mf_farm_setting")).toBe(1);
  });

  it("회원은 항목·설정을 읽지만 바꾸지 못한다(관리자만)", async () => {
    expect(await count(WORKER, "mf_field")).toBe(7);
    expect(await errorCode(WORKER, `insert into public.mf_field (scope, name, value_type) values ('farm', '물 준 횟수', 'int')`)).toBe("42501");
    await asUser(WORKER, (tx) => tx.exec(`update public.mf_farm_setting set farm_name = '몰래'`));
    await asUser(WORKER, (tx) => tx.exec(`update public.mf_field set name = '몰래' where id = ${F.bottled}`));
    const s = await db.query<{ farm_name: string }>(`select farm_name from public.mf_farm_setting`);
    expect(s.rows[0].farm_name).toBe("");
    const f = await db.query<{ name: string }>(`select name from public.mf_field where id = ${F.bottled}`);
    expect(f.rows[0].name).toBe("입병");
    expect(await count(STRANGER, "mf_field")).toBe(0);
  });

  it("관리자는 설정과 기본 항목 이름·범위·켜기를 바꾼다", async () => {
    expect(await errorCode(ADMIN, `update public.mf_farm_setting set farm_name = '버섯농장', default_period = '3m', defect_rate_warn_pct = 5`)).toBeNull();
    expect(await errorCode(ADMIN, `update public.mf_field set name = '입병 수', warn_max = 2000, is_active = true where id = ${F.bottled}`)).toBeNull();
    expect(await errorCode(ADMIN, `update public.mf_farm_setting set default_period = '2y'`)).toBe("23514");
  });

  it("기본 항목은 지우거나 종류·범위(scope)·역할을 바꾸지 못한다", async () => {
    expect(await count(ADMIN, "mf_field")).toBe(7);
    await asUser(ADMIN, (tx) => tx.exec(`delete from public.mf_field where id = ${F.good}`)); // RLS: role 있는 행은 안 보임 → 0행
    expect(await count(ADMIN, "mf_field")).toBe(7);
    expect(await errorCode(ADMIN, `update public.mf_field set value_type = 'int' where id = ${F.good}`)).toBe("23514");
    expect(await errorCode(ADMIN, `update public.mf_field set scope = 'farm' where id = ${F.good}`)).toBe("23514");
    expect(await errorCode(ADMIN, `update public.mf_field set role = null where id = ${F.good}`)).toBe("23514");
    expect(await errorCode(ADMIN, `insert into public.mf_field (scope, role, name, value_type) values ('farm', 'good', '가짜', 'int')`)).toBe("42501");
  });

  it("숫자가 아닌 항목에는 범위·합계를 붙이지 못한다", async () => {
    expect(await errorCode(ADMIN, `insert into public.mf_field (scope, name, value_type, min_value) values ('farm', '상태', 'choice', 0)`)).toBe("23514");
    expect(await errorCode(ADMIN, `insert into public.mf_field (scope, name, value_type, summary) values ('farm', '메모2', 'text', 'sum')`)).toBe("23514");
  });
});

describe("하루 저장 — mf_save_day", () => {
  it("저장하고 다시 저장하면 덮어쓴다(같은 날 두 줄이 안 생긴다)", async () => {
    await asUser(ADMIN, (tx) =>
      tx.exec(save("2026-11-05", "메모", [val(F.bottled, null, { num: 1200 }), val(F.good, room1, { num: 120.5 }), val(F.temperature, room1, { num: 17.5 })])),
    );
    await asUser(ADMIN, (tx) =>
      tx.exec(save("2026-11-05", "메모", [val(F.bottled, null, { num: 1300 }), val(F.good, room1, { num: 121 }), val(F.temperature, room1, {})])),
    );
    expect(await numOf("2026-11-05", F.bottled, null)).toEqual(["1300"]);
    expect(await numOf("2026-11-05", F.good, room1)).toEqual(["121"]);
    expect(await numOf("2026-11-05", F.temperature, room1)).toEqual([]);
    expect((await db.query(`select memo from public.mf_day where log_date = '2026-11-05'`)).rows).toEqual([{ memo: "메모" }]);
  });

  it("빈칸은 행이 없고, 0 은 0 으로 남는다", async () => {
    await asUser(ADMIN, (tx) => tx.exec(save("2026-11-04", "", [val(F.bottled, null, { num: 0 }), val(F.inoculated, null, {})])));
    expect(await numOf("2026-11-04", F.bottled, null)).toEqual(["0"]);
    expect(await numOf("2026-11-04", F.inoculated, null)).toEqual([]);
  });

  it("칸과 메모가 모두 비면 그 날 행을 지운다", async () => {
    await asUser(ADMIN, (tx) => tx.exec(save("2026-11-05", "  ", [val(F.bottled, null, {}), val(F.good, room1, {})])));
    expect((await db.query(`select 1 from public.mf_value where log_date = '2026-11-05'`)).rows).toHaveLength(0);
    expect((await db.query(`select 1 from public.mf_day where log_date = '2026-11-05'`)).rows).toHaveLength(0);
  });

  it("항목 정의에 안 맞는 값은 거절하고, 거절되면 아무것도 저장되지 않는다", async () => {
    const bad = [
      val(F.bottled, null, { num: -1 }), // 범위
      val(F.bottled, null, { num: 1.5 }), // 정수 항목
      val(F.humidity, room1, { num: 101 }),
      val(F.temperature, room1, { num: -21 }),
      val(F.good, null, { num: 1 }), // 호실 항목인데 호실 없음
      val(F.bottled, room1, { num: 1 }), // 농장 항목인데 호실 있음
    ];
    for (const b of bad) expect(await errorCode(ADMIN, save("2026-11-03", "남으면 안 됨", [val(F.inoculated, null, { num: 5 }), b]))).toBe("23514");
    expect((await db.query(`select 1 from public.mf_value where log_date = '2026-11-03'`)).rows).toHaveLength(0);
    expect((await db.query(`select 1 from public.mf_day where log_date = '2026-11-03'`)).rows).toHaveLength(0);
  });

  it("등록 안 된 계정은 기록을 못 쓴다", async () => {
    // 항목이 RLS 로 안 보여서 트리거가 먼저 막는다(23503). 메모만 보내면 RLS 가 막는다(42501).
    expect(await errorCode(STRANGER, save("2026-11-01", "", [val(F.bottled, null, { num: 1 })]))).toBe("23503");
    expect(await errorCode(STRANGER, save("2026-11-01", "몰래", []))).toBe("42501");
    expect((await db.query(`select 1 from public.mf_value where log_date = '2026-11-01'`)).rows).toHaveLength(0);
  });

  it("하루 지우기", async () => {
    await asUser(ADMIN, (tx) => tx.exec(save("2026-11-02", "메모", [val(F.bottled, null, { num: 10 }), val(F.good, room1, { num: 3 })])));
    await asUser(ADMIN, (tx) => tx.exec(`select public.mf_delete_day('2026-11-02')`));
    expect((await db.query(`select 1 from public.mf_value where log_date = '2026-11-02'`)).rows).toHaveLength(0);
    expect((await db.query(`select 1 from public.mf_day where log_date = '2026-11-02'`)).rows).toHaveLength(0);
  });
});

describe("사용자 항목 — 선택형·글", () => {
  let mood: number;
  let note: number;
  let good: number;
  let bad: number;

  beforeAll(async () => {
    await asUser(ADMIN, (tx) =>
      tx.exec(`
        insert into public.mf_field (scope, name, value_type) values ('room', '배지 상태', 'choice'), ('farm', '작업', 'text');
        insert into public.mf_field_option (field_id, label, sort_order)
          select id, x.label, x.n from public.mf_field, (values ('좋음', 1), ('나쁨', 2)) x (label, n) where name = '배지 상태';
      `),
    );
    const f = await db.query<{ name: string; id: number }>(`select name, id from public.mf_field where role is null`);
    mood = Number(f.rows.find((r) => r.name === "배지 상태")!.id);
    note = Number(f.rows.find((r) => r.name === "작업")!.id);
    const o = await db.query<{ label: string; id: number }>(`select label, id from public.mf_field_option`);
    good = Number(o.rows.find((r) => r.label === "좋음")!.id);
    bad = Number(o.rows.find((r) => r.label === "나쁨")!.id);
  });

  it("선택형은 그 항목의 보기만, 글은 글만 받는다", async () => {
    expect(await errorCode(ADMIN, save("2026-11-06", "", [val(mood, room1, { option: good }), val(note, null, { text: " 물 줌 " })]))).toBeNull();
    expect((await db.query(`select text_value from public.mf_value where field_id = ${note}`)).rows).toEqual([{ text_value: "물 줌" }]);
    expect(await errorCode(ADMIN, save("2026-11-06", "", [val(mood, room1, { num: 1 })]))).toBe("23514");
    expect(await errorCode(ADMIN, save("2026-11-06", "", [val(F.good, room1, { option: good })]))).toBe("23514");
    expect(await errorCode(ADMIN, save("2026-11-06", "", [val(note, null, { num: 3 })]))).toBe("23514");
  });

  it("값이 있는 항목은 종류를 못 바꾸고, 쓰인 보기·항목은 지우지 못한다", async () => {
    expect(await errorCode(ADMIN, `update public.mf_field set value_type = 'text' where id = ${mood}`)).toBe("23514");
    expect(await errorCode(ADMIN, `delete from public.mf_field_option where id = ${good}`)).toBe("23503");
    expect(await errorCode(ADMIN, `delete from public.mf_field where id = ${mood}`)).toBe("23503");
    expect(await errorCode(ADMIN, `delete from public.mf_field_option where id = ${bad}`)).toBeNull();
  });

  it("값이 없는 사용자 항목은 지운다", async () => {
    await asUser(ADMIN, (tx) => tx.exec(`insert into public.mf_field (scope, name, value_type) values ('farm', '지울 항목', 'int')`));
    expect(await errorCode(ADMIN, `delete from public.mf_field where name = '지울 항목'`)).toBeNull();
    expect((await db.query(`select 1 from public.mf_field where name = '지울 항목'`)).rows).toHaveLength(0);
  });

  it("회원은 보기를 더하지 못한다", async () => {
    expect(await errorCode(WORKER, `insert into public.mf_field_option (field_id, label) values (${mood}, '몰래')`)).toBe("42501");
  });
});

describe("합계 함수 — mf_farm_days · mf_room_totals", () => {
  beforeAll(async () => {
    await db.exec(`delete from public.mf_value; delete from public.mf_day;`);
    await asUser(ADMIN, (tx) =>
      tx.exec(
        [
          save("2026-10-01", "", [
            val(F.bottled, null, { num: 1000 }),
            val(F.good, room1, { num: 100 }),
            val(F.defect, room1, { num: 10 }),
            val(F.good, room2, { num: 50.5 }),
            val(F.temperature, room1, { num: 16 }),
            val(F.temperature, room2, { num: 18 }),
          ]),
          save("2026-10-02", "물 줌", []),
        ].join(";"),
      ),
    );
  });

  it("날짜별로 항목 합계·최소·최대·개수를 내고, 메모만 있는 날도 나온다", async () => {
    const r = await asUser(ADMIN, (tx) =>
      tx.query<{ log_date: string; has_memo: boolean; totals: Record<string, { sum: number; min: number; max: number; n: number }> }>(
        `select log_date::text, has_memo, totals from public.mf_farm_days('2026-10-01', '2026-10-31')`,
      ),
    );
    expect(r.rows.map((x) => [x.log_date, x.has_memo])).toEqual([
      ["2026-10-01", false],
      ["2026-10-02", true],
    ]);
    const t = r.rows[0].totals;
    expect(t[F.good]).toEqual({ sum: 150.5, min: 50.5, max: 100, n: 2 });
    expect(t[F.temperature]).toEqual({ sum: 34, min: 16, max: 18, n: 2 });
    expect(t[F.bottled].sum).toBe(1000);
    expect(r.rows[1].totals).toEqual({});
  });

  it("선택형은 보기별 횟수를 낸다", async () => {
    const mood = Number((await db.query<{ id: number }>(`select id from public.mf_field where name = '배지 상태'`)).rows[0].id);
    const good = Number((await db.query<{ id: number }>(`select id from public.mf_field_option where label = '좋음'`)).rows[0].id);
    await asUser(ADMIN, (tx) => tx.exec(save("2026-10-03", "", [val(mood, room1, { option: good }), val(mood, room2, { option: good })])));
    const r = await asUser(ADMIN, (tx) =>
      tx.query<{ totals: Record<string, { n: number; opts: Record<string, number> }> }>(`select totals from public.mf_farm_days('2026-10-03', '2026-10-03')`),
    );
    expect(r.rows[0].totals[mood]).toEqual({ n: 2, opts: { [good]: 2 } });
  });

  it("호실·항목별 합계(숫자만)", async () => {
    const r = await asUser(ADMIN, (tx) =>
      tx.query<{ room_id: number; field_id: number; sum_value: string; value_count: number }>(
        `select room_id, field_id, sum_value::text, value_count::int from public.mf_room_totals('2026-10-01', '2026-10-31') order by room_id, field_id`,
      ),
    );
    expect(r.rows.map((x) => [Number(x.room_id), Number(x.field_id), x.sum_value, x.value_count])).toEqual(
      [
        [room1, F.good, "100", 1],
        [room1, F.defect, "10", 1],
        [room1, F.temperature, "16", 1],
        [room2, F.good, "50.5", 1],
        [room2, F.temperature, "18", 1],
      ].sort((a, b) => Number(a[0]) - Number(b[0]) || Number(a[1]) - Number(b[1])),
    );
  });

  it("등록 안 된 계정에는 0행", async () => {
    const r = await asUser(STRANGER, (tx) => tx.query(`select * from public.mf_farm_days('2026-10-01', '2026-10-31')`));
    expect(r.rows).toHaveLength(0);
  });
});

describe("호실", () => {
  it("같은 이름은 거절", async () => {
    expect(await errorCode(ADMIN, `insert into public.mf_room (name) values ('1호실')`)).toBe("23505");
  });

  it("기록이 있는 호실은 지우지 못한다", async () => {
    expect(await errorCode(ADMIN, `delete from public.mf_room where name = '1호실'`)).toBe("23503");
  });

  it("기록이 없는 호실은 지운다", async () => {
    await asUser(ADMIN, (tx) => tx.exec(`insert into public.mf_room (name) values ('3호실')`));
    expect(await errorCode(ADMIN, `delete from public.mf_room where name = '3호실'`)).toBeNull();
    expect(await count(ADMIN, "mf_room")).toBe(2);
  });
});
