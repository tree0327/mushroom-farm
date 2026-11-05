// 숫자 표시. null(안 적음·계산 불가)은 「—」.
const DASH = "—";
const int = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const one = new Intl.NumberFormat("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const fmtCount = (n: number | null) => (n === null ? DASH : `${int.format(n)}병`);
export const fmtKg = (n: number | null) => (n === null ? DASH : `${one.format(n)}kg`);
export const fmtGrams = (n: number | null) => (n === null ? DASH : `${int.format(n)}g`);
// 0~1 비율 → 「2.4%」
export const fmtPct = (r: number | null) => (r === null ? DASH : `${one.format(r * 100)}%`);
