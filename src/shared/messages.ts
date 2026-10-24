// 문구 대장 — 화면에 보이는 거절·안내 문구는 모두 여기 있다. 서버는 code 만 준다.
// 말투: 「~했어요 / ~해 주세요」 (docs/design.md 5절)
export const MESSAGES = {
  UNKNOWN: "잠시 문제가 생겼어요. 다시 해 주세요.",
  UNAUTHENTICATED: "로그인이 풀렸어요. 다시 로그인해 주세요.",
  NOT_MEMBER: "등록된 사람만 쓸 수 있어요.",
  FORBIDDEN: "할 수 없는 동작이에요.",
  INVALID_INPUT: "입력한 내용을 다시 확인해 주세요.",
  DUPLICATE: "이미 저장돼 있어요.",
  LOGIN_FAILED: "아이디 또는 비밀번호를 확인해 주세요.",
  PASSWORD_WRONG: "지금 비밀번호가 맞지 않아요.",
  PASSWORD_SHORT: "새 비밀번호는 6자 이상으로 해 주세요.",
  PASSWORD_MISMATCH: "새 비밀번호가 서로 달라요.",
  PASSWORD_SAME: "지금과 다른 비밀번호로 해 주세요.",

  DIARY_EMPTY: "일기 내용을 써 주세요.",
  DIARY_CLOSED: "자정이 지나 고칠 수 없어요.",
  DIARY_REST_DAY: "오늘은 쉬는 날이에요.",
  DIARY_NOT_TODAY: "오늘 일기만 쓸 수 있어요.",
  REPLY_EMPTY: "답장 내용을 써 주세요.",
  REPLY_NOT_OPEN: "9시에 열려요.",
  REPLY_CLOSED: "답장은 공개된 날 자정까지만 쓸 수 있어요.",
  REPLY_NO_DIARY: "답장할 일기가 없어요.",

  ADMIN_ONLY: "관리자만 바꿀 수 있어요.",

  ANSWER_EMPTY: "아직 문구가 없어요. 문구를 먼저 더해 주세요.",
  PHRASE_EMPTY: "문구를 써 주세요.",

  COUPON_NOT_RECEIVER: "받은 사람만 쓸 수 있어요.",
  COUPON_NOT_GIVER: "준 사람만 완료할 수 있어요.",
  COUPON_EXPIRED: "기간이 지난 쿠폰이에요.",
  COUPON_ALREADY_CHANGED: "이미 처리된 쿠폰이에요.",
  COUPON_LOCKED_FIELDS: "쿠폰 내용은 바꿀 수 없어요.",

  SALES_AMOUNT: "금액을 입력해 주세요.",
  SALES_FUTURE: "오늘 이후 날짜는 고를 수 없어요.",
  SALES_NOT_FOUND: "이미 지워진 기록이에요.",

  PUSH_UNSUPPORTED: "이 기기에서는 알림을 켤 수 없어요. 홈 화면에 추가한 앱에서 켜 주세요.",
  PUSH_DENIED: "알림이 꺼져 있어요. 아이폰 설정 › 알림에서 이 앱을 켜 주세요.",
} as const;

export type MessageCode = keyof typeof MESSAGES;

export const messageOf = (code: MessageCode) => MESSAGES[code] ?? MESSAGES.UNKNOWN;
