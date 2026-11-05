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
    insert into public.room (name, sort_order) values ('1호실', 1), ('2호실', 2);
  `);
  const rooms = await db.query<{ id: number }>(`select id from public.room order by sort_order`);
  room1 = Number(rooms.rows[0].id);
  room2 = Number(rooms.rows[1].id);
}, 60_000);

describe("부부 일기 지우기 · 매출 남기기", () => {
  it("일기·해답·쿠폰·쉬는 날 표가 없다", async () => {
    const r = await db.query<{ t: string }>(
      `select table_name as t from information_schema.tables where table_schema = 'public' order by 1`,
    );
    expect(r.rows.map((x) => x.t)).toEqual([
      "daily_log", "if_push_subscription", "member", "push_log", "push_subscription", "room", "room_log", "sales_record",
    ]);
  });

  it("매출 행은 그대로", async () => {
    expect((await db.query<{ n: number }>(`select count(*)::int as n from public.sales_record`)).rows[0].n).toBe(2);
  });

  it("첫 관리자는 app@bibimble.com 하나", async () => {
    const r = await db.query<{ email: string; is_admin: boolean }>(`select email, is_admin from public.member`);
    expect(r.rows).toEqual([{ email: "app@bibimble.com", is_admin: true }]);
  });
});

describe("회원 판정 — 구글 계정 이메일", () => {
  it("대소문자가 달라도 같은 이메일이면 회원", async () => {
    const id = await asUser(ADMIN, async (tx) => (await tx.query<{ v: number | null }>(`select app.current_member_id() as v`)).rows[0].v);
    expect(id).not.toBeNull();
  });

  it("등록된 이메일이어도 구글 로그인이 아니면 회원이 아니다", async () => {
    expect(await count(IMPOSTOR, "member")).toBe(0);
    expect(await errorCode(IMPOSTOR, `insert into public.member (email) values ('evil@x.kr')`)).toBe("42501");
  });

  it("등록 안 된 계정은 아무것도 못 본다", async () => {
    expect(await count(STRANGER, "member")).toBe(0);
    expect(await count(STRANGER, "room")).toBe(0);
    expect(await count(STRANGER, "sales_record")).toBe(0);
  });

  it("등록 안 된 계정은 기록을 못 쓴다", async () => {
    expect(await errorCode(STRANGER, `insert into public.daily_log (log_date, bottled_count) values ('2026-11-01', 1)`)).toBe("42501");
    expect(await errorCode(STRANGER, `select public.save_day('2026-11-01', 1, null, null, '', '[]')`)).toBe("42501");
  });

  it("관리자가 계정을 더하면 그 계정이 들어온다", async () => {
    expect(await errorCode(ADMIN, `insert into public.member (email) values ('worker@farm.kr')`)).toBeNull();
    expect(await count(WORKER, "room")).toBe(2);
  });

  it("관리자가 아니면 계정을 더하거나 빼지 못한다", async () => {
    await asUser(WORKER, (tx) => tx.exec(`insert into public.member (email) values ('x@farm.kr')`)).catch(() => {});
    expect(await count(ADMIN, "member")).toBe(2);
    await asUser(WORKER, (tx) => tx.exec(`delete from public.member where email = 'worker@farm.kr'`));
    expect(await count(ADMIN, "member")).toBe(2);
  });

  it("관리자는 자기(관리자 행)를 빼지 못하고, 관리자를 새로 만들지 못한다", async () => {
    await asUser(ADMIN, (tx) => tx.exec(`delete from public.member where is_admin`));
    expect(await count(ADMIN, "member")).toBe(2);
    expect(await errorCode(ADMIN, `insert into public.member (email, is_admin) values ('boss@farm.kr', true)`)).toBe("42501");
  });

  it("이메일은 소문자·형식 검사", async () => {
    expect(await errorCode(ADMIN, `insert into public.member (email) values ('Boss@farm.kr')`)).toBe("23514");
    expect(await errorCode(ADMIN, `insert into public.member (email) values ('not-an-email')`)).toBe("23514");
  });
});

describe("하루 저장 — save_day", () => {
  const rooms = (good: string, defect: string, temp = "null", hum = "null") =>
    `'[{"room_id":${room1},"good_kg":${good},"defect_kg":${defect},"temperature_c":${temp},"humidity_pct":${hum}}]'`;

  it("저장하고 다시 저장하면 덮어쓴다(같은 날 두 줄이 안 생긴다)", async () => {
    await asUser(ADMIN, (tx) => tx.exec(`select public.save_day('2026-11-05', 1200, 1100, 5, '메모', ${rooms("120.5", "8", "17.5", "90")})`));
    await asUser(ADMIN, (tx) => tx.exec(`select public.save_day('2026-11-05', 1300, 1100, 5, '메모', ${rooms("121", "8")})`));
    const d = await db.query(`select bottled_count, memo from public.daily_log where log_date = '2026-11-05'`);
    expect(d.rows).toEqual([{ bottled_count: 1300, memo: "메모" }]);
    const r = await db.query<{ good_kg: string; temperature_c: string | null }>(
      `select good_kg::text, temperature_c::text from public.room_log where log_date = '2026-11-05'`,
    );
    expect(r.rows).toEqual([{ good_kg: "121.0", temperature_c: null }]);
  });

  it("빈칸은 null, 0 은 0 으로 남는다", async () => {
    await asUser(ADMIN, (tx) => tx.exec(`select public.save_day('2026-11-04', 0, null, null, '', '[]')`));
    const d = await db.query(`select bottled_count, inoculated_count from public.daily_log where log_date = '2026-11-04'`);
    expect(d.rows).toEqual([{ bottled_count: 0, inoculated_count: null }]);
  });

  it("칸이 모두 비면 그 날 행을 지운다", async () => {
    await asUser(ADMIN, (tx) => tx.exec(`select public.save_day('2026-11-05', null, null, null, '  ', ${rooms("null", "null")})`));
    expect((await db.query(`select 1 from public.daily_log where log_date = '2026-11-05'`)).rows).toHaveLength(0);
    expect((await db.query(`select 1 from public.room_log where log_date = '2026-11-05'`)).rows).toHaveLength(0);
  });

  it("음수·습도 101·영하 21도는 거절하고, 거절되면 아무것도 저장되지 않는다", async () => {
    expect(await errorCode(ADMIN, `select public.save_day('2026-11-03', -1, null, null, '', '[]')`)).toBe("23514");
    expect(await errorCode(ADMIN, `select public.save_day('2026-11-03', 10, null, null, '', ${rooms("1", "-0.1")})`)).toBe("23514");
    expect(await errorCode(ADMIN, `select public.save_day('2026-11-03', 10, null, null, '', ${rooms("1", "0", "null", "101")})`)).toBe("23514");
    expect(await errorCode(ADMIN, `select public.save_day('2026-11-03', 10, null, null, '', ${rooms("1", "0", "-21")})`)).toBe("23514");
    expect((await db.query(`select 1 from public.daily_log where log_date = '2026-11-03'`)).rows).toHaveLength(0);
  });

  it("하루 지우기", async () => {
    await asUser(ADMIN, (tx) => tx.exec(`select public.save_day('2026-11-02', 10, null, null, '', ${rooms("3", "1")})`));
    await asUser(ADMIN, (tx) => tx.exec(`select public.delete_day('2026-11-02')`));
    expect((await db.query(`select 1 from public.room_log where log_date = '2026-11-02'`)).rows).toHaveLength(0);
    expect((await db.query(`select 1 from public.daily_log where log_date = '2026-11-02'`)).rows).toHaveLength(0);
  });
});

describe("합계 함수 — farm_days · room_totals", () => {
  beforeAll(async () => {
    await db.exec(`delete from public.room_log; delete from public.daily_log;`);
    await asUser(ADMIN, (tx) =>
      tx.exec(`
        select public.save_day('2026-10-01', 1000, 900, 10, '', '[{"room_id":${room1},"good_kg":100,"defect_kg":10},{"room_id":${room2},"good_kg":50.5,"defect_kg":null}]');
        select public.save_day('2026-10-02', null, null, null, '물 줌', '[]');
        select public.save_day('2026-10-03', null, null, null, '', '[{"room_id":${room2},"good_kg":null,"defect_kg":null,"temperature_c":18}]');
      `),
    );
  });

  it("날짜별로 호실 수확을 더하고, 기록 있는 날만 나온다", async () => {
    const r = await asUser(ADMIN, (tx) =>
      tx.query(`select log_date::text, bottled_count::int, good_kg::text, defect_kg::text, has_memo from public.farm_days('2026-10-01', '2026-10-31')`),
    );
    expect(r.rows).toEqual([
      { log_date: "2026-10-01", bottled_count: 1000, good_kg: "150.5", defect_kg: "10.0", has_memo: false },
      { log_date: "2026-10-02", bottled_count: null, good_kg: null, defect_kg: null, has_memo: true },
      { log_date: "2026-10-03", bottled_count: null, good_kg: null, defect_kg: null, has_memo: false },
    ]);
  });

  it("호실별 합계", async () => {
    const r = await asUser(ADMIN, (tx) =>
      tx.query(`select name, good_kg::text, defect_kg::text from public.room_totals('2026-10-01', '2026-10-31')`),
    );
    expect(r.rows).toEqual([
      { name: "1호실", good_kg: "100.0", defect_kg: "10.0" },
      { name: "2호실", good_kg: "50.5", defect_kg: null },
    ]);
  });

  it("등록 안 된 계정에는 0행", async () => {
    const r = await asUser(STRANGER, (tx) => tx.query(`select * from public.farm_days('2026-10-01', '2026-10-31')`));
    expect(r.rows).toHaveLength(0);
  });
});

describe("호실", () => {
  it("같은 이름은 거절", async () => {
    expect(await errorCode(ADMIN, `insert into public.room (name) values ('1호실')`)).toBe("23505");
  });

  it("기록이 있는 호실은 지우지 못한다", async () => {
    expect(await errorCode(ADMIN, `delete from public.room where name = '1호실'`)).toBe("23503");
  });

  it("기록이 없는 호실은 지운다", async () => {
    await asUser(ADMIN, (tx) => tx.exec(`insert into public.room (name) values ('3호실')`));
    expect(await errorCode(ADMIN, `delete from public.room where name = '3호실'`)).toBeNull();
    expect(await count(ADMIN, "room")).toBe(2);
  });
});
