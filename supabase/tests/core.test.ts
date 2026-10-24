// 마이그레이션을 내 PC 안의 Postgres(PGlite)에 그대로 돌려 판정 함수·RLS 를 검사한다. 운영 DB 는 건드리지 않는다.
// Supabase 의 auth 스키마·역할은 최소한으로 흉내 낸다(auth.uid() 는 request.jwt.claim.sub 를 읽는다).
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const WIFE = "00000000-0000-0000-0000-00000000000a";
const HUSBAND = "00000000-0000-0000-0000-00000000000b";

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to authenticated, anon, service_role;
  grant execute on function auth.uid() to authenticated, anon, service_role;
  grant usage on schema public to authenticated, anon, service_role;
`;

let db: PGlite;
let wifeId: number;
let husbandId: number;

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

async function one<T>(sql: string, params: unknown[] = []): Promise<T> {
  const r = await db.query<T>(sql, params);
  return r.rows[0];
}

const kstHour = Number(
  new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", hour: "numeric", hourCycle: "h23" }).format(new Date()),
);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const sql of appMigrations()) await db.exec(sql);
  await db.exec(`
    insert into auth.users values ('${WIFE}', 'wife@home.local'), ('${HUSBAND}', 'husband@home.local');
    insert into public.member (user_id, role, display_name, is_admin) values
      ('${WIFE}', 'wife', '아내', false), ('${HUSBAND}', 'husband', '남편', true);
    -- RLS 시험이 요일에 따라 갈리지 않게 주말 쉬기를 끈다(쉬는 날 판정은 아래 함수 시험에서 따로 본다)
    update public.app_setting set is_weekend_rest = false where id = 1;
  `);
  wifeId = (await one<{ id: number }>(`select id from public.member where role = 'wife'`)).id;
  husbandId = (await one<{ id: number }>(`select id from public.member where role = 'husband'`)).id;
}, 60_000);

describe("판정 함수 — 한국 시각", () => {
  const f = async (expr: string) => (await one<{ v: unknown }>(`select ${expr} as v`)).v;

  it("한국 날짜: UTC 15:00 은 다음날", async () => {
    expect(await f(`app.kst_date('2026-10-22 15:00+00')::text`)).toBe("2026-10-23");
    expect(await f(`app.kst_date('2026-10-22 14:59+00')::text`)).toBe("2026-10-22");
  });

  it("공개: 다음날 9시부터", async () => {
    expect(await f(`app.is_diary_revealed('2026-10-22', '2026-10-23 08:59:59+09')`)).toBe(false);
    expect(await f(`app.is_diary_revealed('2026-10-22', '2026-10-23 09:00+09')`)).toBe(true);
  });

  it("금요일 일기는 토요일 9시에 공개되고 토요일 자정까지 답장", async () => {
    // 2026-10-23 은 금요일
    expect(await f(`app.is_diary_revealed('2026-10-23', '2026-10-24 09:00+09')`)).toBe(true);
    expect(await f(`app.can_reply('2026-10-23', '2026-10-24 23:59:59+09')`)).toBe(true);
    expect(await f(`app.can_reply('2026-10-23', '2026-10-25 00:00+09')`)).toBe(false);
  });

  it("답장: 공개일 9시 전·다음날은 안 됨", async () => {
    expect(await f(`app.can_reply('2026-10-22', '2026-10-23 08:59+09')`)).toBe(false);
    expect(await f(`app.can_reply('2026-10-22', '2026-10-23 09:00+09')`)).toBe(true);
    expect(await f(`app.can_reply('2026-10-22', '2026-10-24 10:00+09')`)).toBe(false);
  });

  it("일기 쓰기: 그날 자정까지", async () => {
    expect(await f(`app.can_write_diary('2026-10-22', '2026-10-22 00:00+09')`)).toBe(true);
    expect(await f(`app.can_write_diary('2026-10-22', '2026-10-22 23:59:59+09')`)).toBe(true);
    expect(await f(`app.can_write_diary('2026-10-22', '2026-10-23 00:00+09')`)).toBe(false);
    expect(await f(`app.can_write_diary('2026-10-23', '2026-10-22 12:00+09')`)).toBe(false); // 미리 쓰기 안 됨
  });

  it("쉬는 날: 주말 설정과 관리자가 더한 날", async () => {
    await db.exec(`update public.app_setting set is_weekend_rest = true where id = 1`);
    expect(await f(`app.is_rest_day('2026-10-24')`)).toBe(true); // 토
    expect(await f(`app.is_rest_day('2026-10-25')`)).toBe(true); // 일
    expect(await f(`app.is_rest_day('2026-10-26')`)).toBe(false); // 월
    expect(await f(`app.can_write_diary('2026-10-24', '2026-10-24 12:00+09')`)).toBe(false);
    await db.exec(`update public.app_setting set is_weekend_rest = false where id = 1`);
    expect(await f(`app.can_write_diary('2026-10-24', '2026-10-24 12:00+09')`)).toBe(true);
    await db.exec(`insert into public.rest_day (rest_date, memo) values ('2026-10-21', '시험')`);
    expect(await f(`app.is_rest_day('2026-10-21')`)).toBe(true);
    await db.exec(`delete from public.rest_day where rest_date = '2026-10-21'`);
  });
});

describe("RLS — 일기", () => {
  it("오늘 내 일기는 쓰고, 상대는 공개 전이라 못 읽지만 「썼어요」는 안다", async () => {
    await asUser(WIFE, (tx) =>
      tx.query(`insert into public.diary_entry (entry_date, member_id, body) values (app.kst_date(), $1, '오늘 일기')`, [
        wifeId,
      ]),
    );
    const seen = await asUser(HUSBAND, (tx) => tx.query(`select body from public.diary_entry where member_id = $1`, [wifeId]));
    expect(seen.rows).toHaveLength(0);
    const writers = await asUser(HUSBAND, (tx) =>
      tx.query<{ member_id: number }>(`select member_id from public.diary_writers(app.kst_date())`),
    );
    expect(writers.rows.map((r) => Number(r.member_id))).toEqual([wifeId]);
  });

  it("공통 4칸이 자동으로 채워진다", async () => {
    const r = await one<{ created_by: string; updated_by: string }>(
      `select created_by, updated_by from public.diary_entry where member_id = $1`,
      [wifeId],
    );
    expect(r.created_by).toBe(WIFE);
    expect(r.updated_by).toBe(WIFE);
  });

  it("어제 날짜·남의 이름으로는 못 쓴다", async () => {
    await expect(
      asUser(WIFE, (tx) =>
        tx.query(`insert into public.diary_entry (entry_date, member_id, body) values (app.kst_date() - 1, $1, 'x')`, [wifeId]),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asUser(WIFE, (tx) =>
        tx.query(`insert into public.diary_entry (entry_date, member_id, body) values (app.kst_date(), $1, 'x')`, [husbandId]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("같은 날 두 번 쓰면 고유키가 막는다", async () => {
    await expect(
      asUser(WIFE, (tx) =>
        tx.query(`insert into public.diary_entry (entry_date, member_id, body) values (app.kst_date(), $1, '또')`, [wifeId]),
      ),
    ).rejects.toThrow(/diary_entry_entry_date_member_id_uk/);
  });

  it("지우기는 안 된다", async () => {
    await expect(asUser(WIFE, (tx) => tx.query(`delete from public.diary_entry where member_id = $1`, [wifeId]))).rejects.toThrow(
      /permission denied/,
    );
  });

  it.runIf(kstHour >= 9)("어제 일기: 상대는 읽고 답장한다, 내 일기에는 답장 못 한다 (한국 9시 이후에만 도는 시험)", async () => {
    const entry = await one<{ id: number }>(
      `insert into public.diary_entry (entry_date, member_id, body) values (app.kst_date() - 1, $1, '어제 일기') returning id`,
      [wifeId],
    );
    const seen = await asUser(HUSBAND, (tx) => tx.query(`select body from public.diary_entry where id = $1`, [entry.id]));
    expect(seen.rows).toHaveLength(1);
    await expect(
      asUser(WIFE, (tx) =>
        tx.query(`insert into public.diary_reply (diary_entry_id, member_id, body) values ($1, $2, '셀프')`, [entry.id, wifeId]),
      ),
    ).rejects.toThrow(/row-level security/);
    await asUser(HUSBAND, (tx) =>
      tx.query(`insert into public.diary_reply (diary_entry_id, member_id, body) values ($1, $2, '답장')`, [entry.id, husbandId]),
    );
    const reply = await asUser(WIFE, (tx) => tx.query(`select body from public.diary_reply where diary_entry_id = $1`, [entry.id]));
    expect(reply.rows).toEqual([{ body: "답장" }]);
  });

  it("그저께 일기에는 답장 못 한다(공개일 자정 지남)", async () => {
    const entry = await one<{ id: number }>(
      `insert into public.diary_entry (entry_date, member_id, body) values (app.kst_date() - 2, $1, '그저께') returning id`,
      [wifeId],
    );
    await expect(
      asUser(HUSBAND, (tx) =>
        tx.query(`insert into public.diary_reply (diary_entry_id, member_id, body) values ($1, $2, '늦은 답장')`, [entry.id, husbandId]),
      ),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("RLS — 관리자·쿠폰·해답·발송 기록", () => {
  it("쉬는 날은 관리자(남편)만 바꾼다", async () => {
    await expect(
      asUser(WIFE, (tx) => tx.query(`insert into public.rest_day (rest_date) values ('2027-01-01')`)),
    ).rejects.toThrow(/row-level security/);
    await asUser(HUSBAND, (tx) => tx.query(`insert into public.rest_day (rest_date) values ('2027-01-01')`));
    const r = await asUser(WIFE, (tx) => tx.query(`update public.app_setting set is_weekend_rest = true returning id`));
    expect(r.rows).toHaveLength(0); // 아내는 바꿔도 0행
  });

  it("쿠폰: 받은 사람만 사용, 준 사람만 완료, 두 번은 안 됨", async () => {
    const c = await asUser(WIFE, (tx) =>
      tx.query<{ id: number }>(
        `insert into public.wish_coupon (giver_id, receiver_id, title) values ($1, $2, '설거지 대신') returning id`,
        [wifeId, husbandId],
      ),
    );
    const id = c.rows[0].id;
    const setStatus = (uid: string, status: string) =>
      asUser(uid, (tx) => tx.query(`update public.wish_coupon set status = $1 where id = $2`, [status, id]));
    await expect(setStatus(WIFE, "used")).rejects.toThrow(/COUPON_NOT_RECEIVER/);
    await setStatus(HUSBAND, "used");
    await expect(setStatus(HUSBAND, "used")).rejects.toThrow(/COUPON_ALREADY_CHANGED/);
    await expect(setStatus(HUSBAND, "done")).rejects.toThrow(/COUPON_NOT_GIVER/);
    await setStatus(WIFE, "done");
    const row = await one<{ status: string; used_at: unknown; done_at: unknown }>(
      `select status, used_at, done_at from public.wish_coupon where id = $1`,
      [id],
    );
    expect(row.status).toBe("done");
    expect(row.used_at).not.toBeNull();
    expect(row.done_at).not.toBeNull();
  });

  it("쿠폰: 기간이 지나면 못 쓴다, 남 이름으로 못 만든다", async () => {
    const c = await one<{ id: number }>(
      `insert into public.wish_coupon (giver_id, receiver_id, title, expires_on) values ($1, $2, '지난 쿠폰', app.kst_date() - 1) returning id`,
      [wifeId, husbandId],
    );
    await expect(
      asUser(HUSBAND, (tx) => tx.query(`update public.wish_coupon set status = 'used' where id = $1`, [c.id])),
    ).rejects.toThrow(/COUPON_EXPIRED/);
    await expect(
      asUser(WIFE, (tx) =>
        tx.query(`insert into public.wish_coupon (giver_id, receiver_id, title) values ($1, $2, '사칭')`, [husbandId, wifeId]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("쿠폰: 사용·완료 시각은 DB 가 정하고 앱 밖에서 넣은 값은 버린다", async () => {
    const c = await one<{ id: number }>(
      `insert into public.wish_coupon (giver_id, receiver_id, title) values ($1, $2, '시각 시험') returning id`,
      [wifeId, husbandId],
    );
    await asUser(HUSBAND, (tx) =>
      tx.query(`update public.wish_coupon set status = 'used', done_at = '2000-01-01' where id = $1`, [c.id]),
    );
    const used = await one<{ used_at: Date; done_at: unknown }>(`select used_at, done_at from public.wish_coupon where id = $1`, [c.id]);
    expect(used.done_at).toBeNull();
    await asUser(WIFE, (tx) =>
      tx.query(`update public.wish_coupon set status = 'done', used_at = '2000-01-01' where id = $1`, [c.id]),
    );
    const done = await one<{ used_at: Date }>(`select used_at from public.wish_coupon where id = $1`, [c.id]);
    expect(done.used_at).toEqual(used.used_at);
  });

  it("해답: 펼친 기록은 공유 여부만 고칠 수 있다", async () => {
    const r = await asUser(HUSBAND, (tx) => tx.query<{ draw_id: number }>(`select * from public.draw_answer('')`));
    const id = r.rows[0].draw_id;
    await asUser(HUSBAND, (tx) => tx.query(`update public.answer_draw set is_shared = false where id = $1`, [id]));
    await expect(
      asUser(HUSBAND, (tx) => tx.query(`update public.answer_draw set phrase_id = phrase_id where id = $1`, [id])),
    ).rejects.toThrow(/permission denied/);
  });

  it("기본 문구 1000개가 들어 있다", async () => {
    const n = await one<{ n: number }>(`select count(*)::int as n from public.answer_phrase where is_default`);
    expect(n.n).toBeGreaterThanOrEqual(1000);
  });

  it("해답: 공유 안 한 기록은 상대에게 안 보이고, 직접 더한 문구는 기본 문구가 될 수 없다", async () => {
    const p = await one<{ id: number }>(`insert into public.answer_phrase (body, is_default) values ('기다려 봐요', true) returning id`);
    await asUser(HUSBAND, (tx) =>
      tx.query(`insert into public.answer_draw (member_id, phrase_id, worry, is_shared) values ($1, $2, '비밀 고민', false)`, [
        husbandId,
        p.id,
      ]),
    );
    const seen = await asUser(WIFE, (tx) => tx.query(`select worry from public.answer_draw where member_id = $1`, [husbandId]));
    expect(seen.rows).toHaveLength(0);
    await expect(
      asUser(WIFE, (tx) => tx.query(`insert into public.answer_phrase (body, is_default) values ('몰래 기본', true)`)),
    ).rejects.toThrow(/row-level security/);
  });

  it("발송 기록은 로그인한 사용자가 못 읽는다", async () => {
    await expect(asUser(WIFE, (tx) => tx.query(`select * from public.push_log`))).rejects.toThrow(/permission denied/);
  });

  it("발송 기록 고유키: 같은 알림은 한 번만 들어간다(대상 없음 포함)", async () => {
    const ins = () =>
      db.query(
        `insert into public.push_log (kind, ref_date, recipient_id, ref_id) values ('evening_reminder', '2026-10-22', $1, null)
         on conflict do nothing returning id`,
        [wifeId],
      );
    expect((await ins()).rows).toHaveLength(1);
    expect((await ins()).rows).toHaveLength(0);
  });

  it("회원이 아닌 로그인 사용자는 아무것도 못 본다", async () => {
    const stranger = "00000000-0000-0000-0000-0000000000ff";
    await db.query(`insert into auth.users values ($1, 'x@y.z')`, [stranger]);
    const r = await asUser(stranger, (tx) => tx.query(`select * from public.sales_record union all select * from public.sales_record`));
    expect(r.rows).toHaveLength(0);
    const m = await asUser(stranger, (tx) => tx.query(`select * from public.member`));
    expect(m.rows).toHaveLength(0);
  });
});

describe("화면용 함수", () => {
  it("해답 펼치기: 문구 하나를 돌려주고 내 이름으로 기록이 남는다", async () => {
    const r = await asUser(WIFE, (tx) =>
      tx.query<{ draw_id: number; body: string }>(`select * from public.draw_answer('이사 갈까?')`),
    );
    expect(r.rows).toHaveLength(1);
    const d = await one<{ member_id: number; worry: string }>(`select member_id, worry from public.answer_draw where id = $1`, [
      r.rows[0].draw_id,
    ]);
    expect(Number(d.member_id)).toBe(wifeId);
    expect(d.worry).toBe("이사 갈까?");
  });

  it("일기 판정 묶음: 쉬는 날 여부가 함께 온다", async () => {
    await db.exec(`update public.app_setting set is_weekend_rest = true where id = 1`);
    const r = await asUser(WIFE, (tx) => tx.query<{ is_rest: boolean }>(`select is_rest from public.diary_flags('2026-10-24')`));
    expect(r.rows[0].is_rest).toBe(true);
    await db.exec(`update public.app_setting set is_weekend_rest = false where id = 1`);
  });

  it("로그인 안 한 사람(anon)은 화면용 함수를 못 부른다", async () => {
    await expect(
      db.transaction(async (tx) => {
        await tx.exec(`set local role anon`);
        return tx.query(`select * from public.app_today()`);
      }),
    ).rejects.toThrow(/permission denied/);
  });
});
