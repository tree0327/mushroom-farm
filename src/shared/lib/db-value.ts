// Data API 는 numeric·bigint 를 숫자나 글자로 줄 수 있다 — 숫자로 맞춘다.
export const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
