// 매출 합계 — 옛 앱(src/utils/analytics.js, salesPeriod.js, recordDate.js)의 계산을 그대로 옮겼다.
// 브라우저(휴대폰) 시간대로 계산한다. 두 사람 다 한국에 있어서 한국 시각과 같다.
// ponytail: 해외에서 열면 그 나라 날짜로 묶인다. 키우려면 Intl 의 Asia/Seoul 기준으로 바꾼다.

export type SalesRecord = {
  id: number;
  type: "현금" | "카드";
  original: number; // 원금
  final: number; // 실수령(수수료 폐지 뒤로는 원금과 같다. 옛 카드 행만 다르다)
  name: string;
  date: string; // ISO
};

const sum = (arr: SalesRecord[]) => arr.reduce((s, r) => s + (Number(r.final) || 0), 0);
const fmtMD = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

function bucket(records: SalesRecord[], start: Date, end: Date) {
  const items = records.filter((r) => {
    const t = new Date(r.date).getTime();
    return t >= start.getTime() && t < end.getTime();
  });
  return {
    items,
    total: sum(items),
    cash: sum(items.filter((r) => r.type === "현금")),
    card: sum(items.filter((r) => r.type === "카드")),
  };
}

// 주: 월요일 시작
export function isoWeekStart(date: Date | string): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

export function todayTotal(records: SalesRecord[], now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return bucket(records, start, end).total;
}

export function thisWeekTotal(records: SalesRecord[], now = new Date()) {
  const start = isoWeekStart(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const last = new Date(start);
  last.setDate(last.getDate() + 6);
  return { total: bucket(records, start, end).total, rangeLabel: `${fmtMD(start)}~${fmtMD(last)}` };
}

// 정산월 = 달력월(1일 ~ 말일)
export function monthPeriod(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end, label: `${fmtMD(start)} ~ ${fmtMD(lastDay)}` };
}

export function monthTotals(records: SalesRecord[], now = new Date()) {
  const p = monthPeriod(now);
  const b = bucket(records, p.start, p.end);
  return { ...b, label: p.label, items: [...b.items].sort((a, z) => +new Date(z.date) - +new Date(a.date)) };
}

export function groupByMonth(records: SalesRecord[]) {
  const map = new Map<string, SalesRecord[]>();
  for (const r of records) {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, [...(map.get(key) ?? []), r]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([key, items]) => {
      const [y, m] = key.split("-");
      const sorted = [...items].sort((a, z) => +new Date(z.date) - +new Date(a.date));
      return {
        key,
        label: `${y}년 ${parseInt(m, 10)}월`,
        total: sum(sorted),
        cash: sum(sorted.filter((r) => r.type === "현금")),
        card: sum(sorted.filter((r) => r.type === "카드")),
        items: sorted,
      };
    });
}

// 로컬 YYYY-MM-DD (날짜 칸 값). toISOString().slice(0,10) 은 UTC 라 한국 0~9시에 하루 밀린다.
export function localYMD(dateLike: Date | string): string {
  const d = new Date(dateLike);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 고른 날짜 + 실제 시각. 새로 넣을 때는 지금 시각, 고칠 때는 원래 시각을 지키고 날짜만 바꾼다.
export function buildRecordDateISO(selectedDate: string, timeSourceISO: string | null = null, now = new Date()): string {
  const src = timeSourceISO ? new Date(timeSourceISO) : now;
  const [y, m, d] = selectedDate.split("-").map(Number);
  return new Date(y, m - 1, d, src.getHours(), src.getMinutes(), src.getSeconds()).toISOString();
}
