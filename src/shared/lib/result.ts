import type { MessageCode } from "@/shared/messages";

// 서버 액션이 돌려주는 단 하나의 모양. 문구는 화면이 code 로 messages.ts 에서 찾는다.
export type Failure = { ok: false; code: MessageCode };
export type Result<T = void> = { ok: true; data: T } | Failure;

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const okVoid = (): Result => ({ ok: true, data: undefined });
export const fail = (code: MessageCode): Failure => ({ ok: false, code });

// DB 오류를 code 로 바꾼다. RLS 거절은 FORBIDDEN.
export function codeFromDbError(error: { code?: string; message?: string } | null): MessageCode {
  if (!error) return "UNKNOWN";
  if (error.code === "42501") return "FORBIDDEN"; // RLS·권한
  if (error.code === "23505") return "DUPLICATE"; // 고유키
  if (error.code === "23514") return "INVALID_INPUT"; // CHECK 제약
  if (error.code === "23503") return "IN_USE"; // 다른 표가 쓰고 있음(FK)
  return "UNKNOWN";
}
