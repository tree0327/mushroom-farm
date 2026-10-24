import type { MessageCode } from "@/shared/messages";

// 서버 액션이 돌려주는 단 하나의 모양. 문구는 화면이 code 로 messages.ts 에서 찾는다.
export type Failure = { ok: false; code: MessageCode };
export type Result<T = void> = { ok: true; data: T } | Failure;

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const okVoid = (): Result => ({ ok: true, data: undefined });
export const fail = (code: MessageCode): Failure => ({ ok: false, code });

// DB 오류를 code 로 바꾼다. 트리거가 던진 이름(COUPON_* 등)은 그대로, RLS 거절은 FORBIDDEN.
const DB_CODES = [
  "COUPON_NOT_RECEIVER",
  "COUPON_NOT_GIVER",
  "COUPON_EXPIRED",
  "COUPON_ALREADY_CHANGED",
  "COUPON_LOCKED_FIELDS",
  "ANSWER_EMPTY",
] as const satisfies readonly MessageCode[];

export function codeFromDbError(error: { code?: string; message?: string } | null): MessageCode {
  if (!error) return "UNKNOWN";
  const named = DB_CODES.find((c) => error.message?.includes(c));
  if (named) return named;
  if (error.code === "42501") return "FORBIDDEN"; // RLS·권한
  if (error.code === "23505") return "DUPLICATE"; // 고유키
  if (error.code === "23514") return "INVALID_INPUT"; // CHECK 제약
  return "UNKNOWN";
}
