// 문구 대장 — 화면에 보이는 거절·안내 문구는 모두 여기 있다. 서버는 code 만 준다.
// 말투: 「~했어요 / ~해 주세요」 (docs/design.md 5절)
export const MESSAGES = {
  UNKNOWN: "잠시 문제가 생겼어요. 다시 해 주세요.",
  UNAUTHENTICATED: "로그인이 풀렸어요. 다시 로그인해 주세요.",
  NOT_MEMBER: "등록된 계정이 아니에요. 관리자에게 이메일 등록을 부탁해 주세요.",
  FORBIDDEN: "할 수 없는 동작이에요.",
  INVALID_INPUT: "입력한 내용을 다시 확인해 주세요.",
  DUPLICATE: "이미 저장돼 있어요.",
  NOT_FOUND: "이미 지워졌어요.",
  IN_USE: "기록이 있어서 지울 수 없어요.",
  ADMIN_ONLY: "관리자만 바꿀 수 있어요.",

  EMAIL_INVALID: "이메일 주소를 다시 확인해 주세요.",
  EMAIL_DUPLICATE: "이미 등록된 이메일이에요.",
  MEMBER_SELF: "관리자 계정은 뺄 수 없어요.",

  ROOM_NAME: "호실 이름을 1~20자로 써 주세요.",
  ROOM_DUPLICATE: "같은 이름의 호실이 있어요.",
  ROOM_IN_USE: "기록이 있는 호실은 지울 수 없어요. 「안 씀」으로 바꿔 주세요.",

  ROOM_GONE: "지워진 호실이 있어요. 화면을 새로고침해 주세요.",
  LOG_INVALID: "숫자를 다시 확인해 주세요. 병 수는 0 이상 정수, 습도는 0~100이에요.",

  // 매출(앱에서 들어가는 길은 없앴다 — src/features/sales 를 다시 붙일 때 쓴다)
  SALES_AMOUNT: "금액을 입력해 주세요.",
  SALES_FUTURE: "오늘 이후 날짜는 고를 수 없어요.",
  SALES_NOT_FOUND: "이미 지워진 기록이에요.",

  PUSH_UNSUPPORTED: "이 기기에서는 알림을 켤 수 없어요. 홈 화면에 추가한 앱에서 켜 주세요.",
  PUSH_DENIED: "알림이 꺼져 있어요. 아이폰 설정 › 알림에서 이 앱을 켜 주세요.",
} as const;

export type MessageCode = keyof typeof MESSAGES;

export const messageOf = (code: MessageCode) => MESSAGES[code] ?? MESSAGES.UNKNOWN;
