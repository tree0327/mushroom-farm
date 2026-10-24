// 옛 가계부 마이그레이션(0001~0010)을 실제로 돌린 DB 에서 매출 이관·옛 표 삭제를 검사한다.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DIR = join(__dirname, "..", "migrations");
const read = (f: string) => readFileSync(join(DIR, f), "utf8");
const files = readdirSync(DIR).sort();
const legacyFiles = files.filter((f) => /^00\d\d_/.test(f));
const coreFile = files.find((f) => f.endsWith("_couple_app_core.sql"))!;
const moveFile = files.find((f) => f.endsWith("_legacy_move_sales.sql"))!;
const dropFile = files.find((f) => f.endsWith("_legacy_drop_ledger.sql"))!;

const STUB = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as $$ select 'service_role' $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
  grant usage on schema auth to authenticated, anon, service_role;
  grant usage on schema public to authenticated, anon, service_role;
  create publication supabase_realtime;
`;

async function legacyDb(rows: string) {
  const db = new PGlite();
  await db.exec(STUB);
  for (const f of legacyFiles) await db.exec(read(f));
  await db.exec(rows);
  await db.exec(read(coreFile));
  return db;
}

const SALES_ROWS = `
  insert into public.transactions (flow, amount, final, category, owner, method, memo, date) values
    ('income', 50000, 50000, '매출', 'wife', '현금', '홍길동', '2026-09-01 10:00+09'),
    ('income', 30000, 27000, '매출', 'wife', '카드', '', '2026-09-02 11:00+09'),   -- 수수료 시절
    ('income', 1000000, 1000000, '급여', 'husband', '계좌', '', '2026-09-25 09:00+09'), -- 매출 아님
    ('expense', 12000, 12000, '식비', 'joint', '카드', '', '2026-09-03 12:00+09');
`;

describe("매출 이관", () => {
  it("매출 행만 옮기고 원금·실수령·시각·메모가 같다", async () => {
    const db = await legacyDb(SALES_ROWS);
    await db.exec(read(moveFile));
    const r = await db.query<{ pay_type: string; amount: number; final_amount: number; name: string; sold_at: Date }>(
      `select pay_type, amount, final_amount, name, sold_at from public.sales_record order by sold_at`,
    );
    expect(r.rows.map((x) => [x.pay_type, x.amount, x.final_amount, x.name])).toEqual([
      ["현금", 50000, 50000, "홍길동"],
      ["카드", 30000, 27000, ""],
    ]);
    expect(r.rows[0].sold_at.toISOString()).toBe("2026-09-01T01:00:00.000Z");
  }, 60_000);

  it("두 번 돌리면 멈춘다", async () => {
    const db = await legacyDb(SALES_ROWS);
    await db.exec(read(moveFile));
    await expect(db.exec(read(moveFile))).rejects.toThrow(/비어 있지 않다/);
  }, 60_000);

  it("소수 금액이 있으면 아무것도 옮기지 않고 멈춘다", async () => {
    const db = await legacyDb(`
      insert into public.transactions (flow, amount, final, category, owner, method, memo, date)
      values ('income', 1000.5, 1000.5, '매출', 'wife', '현금', '', now());
    `);
    await expect(db.exec(read(moveFile))).rejects.toThrow(/소수 금액/);
    expect((await db.query(`select 1 from public.sales_record`)).rows).toHaveLength(0);
  }, 60_000);

  it("결제수단이 현금·카드가 아니면 DB 제약이 막는다", async () => {
    const db = await legacyDb(`
      insert into public.transactions (flow, amount, final, category, owner, method, memo, date)
      values ('income', 1000, 1000, '매출', 'wife', '계좌', '', now());
    `);
    await expect(db.exec(read(moveFile))).rejects.toThrow(/sales_record_pay_type_ck/);
  }, 60_000);
});

describe("옛 표 삭제", () => {
  it("이관 전에는 지우지 않는다", async () => {
    const db = await legacyDb(SALES_ROWS);
    await expect(db.exec(read(dropFile))).rejects.toThrow(/덤프 확인 표시/); // 설정 없이 돌리면(db push 한 번에) 거부
    await db.exec(`set app.allow_ledger_drop = 'on'`);
    await expect(db.exec(read(dropFile))).rejects.toThrow(/이관이 덜 됐다/);
    expect((await db.query(`select to_regclass('public.transactions') as t`)).rows[0]).toEqual({ t: "transactions" });
  }, 60_000);

  it("이관 뒤에는 옛 표 다섯 개가 사라지고 매출은 남는다", async () => {
    const db = await legacyDb(SALES_ROWS);
    await db.exec(read(moveFile));
    await db.exec(`set app.allow_ledger_drop = 'on'`);
    await db.exec(read(dropFile));
    const left = await db.query<{ t: string | null }>(
      `select to_regclass('public.' || n) as t from unnest(array['transactions','fixed_expenses','expense_categories','budgets','sales_records']) n`,
    );
    expect(left.rows.every((x) => x.t === null)).toBe(true);
    expect((await db.query(`select 1 from public.sales_record`)).rows).toHaveLength(2);
  }, 60_000);
});
