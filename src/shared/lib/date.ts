// 날짜 문자열(YYYY-MM-DD) 도우미. 「오늘」은 늘 DB(app_today)가 정한다 — 여기서는 계산·표시만.

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

// 시간대와 무관한 날짜 더하기(UTC 자정 기준으로 계산하므로 서머타임·시차에 흔들리지 않는다)
export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

// 2026-10-23 → 「10월 23일 금요일」
export function formatDayLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const wd = WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일 ${wd}요일`;
}

// 한국 시각 기준 YYYY-MM-DD (화면 표시용 — 매출 날짜 칸 기본값 등)
export function kstYmd(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(at);
}

// ISO 시각 → 한국 시각 「10/23 21:05」
export function formatKstMdHm(iso: string): string {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("month")}/${get("day")} ${get("hour")}:${get("minute")}`;
}
