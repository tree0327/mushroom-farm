// 문구 대장 — 화면에 보이는 거절·안내 문구는 모두 여기 있다. 서버는 code 만 준다.
// 말투: 「~했어요 / ~해 주세요」 (docs/design.md 5절)
const MESSAGES = {
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

  ROOM_GONE: "지워진 호실·항목이 있어요. 화면을 새로고침해 주세요.",
  LOG_INVALID: "빨간 칸을 다시 확인해 주세요. 항목마다 정해진 범위와 형식이 있어요.",

  FIELD_NAME: "항목 이름을 1~20자로 써 주세요.",
  FIELD_DUPLICATE: "같은 이름의 항목이 있어요.",
  FIELD_INVALID: "항목 설정을 다시 확인해 주세요. 최솟값이 최댓값보다 클 수 없어요.",
  FIELD_LOCKED: "기본 항목이나 기록이 있는 항목은 지우거나 종류를 바꿀 수 없어요. 「끄기」로 숨겨 주세요.",
  FIELD_IN_USE: "기록이 있는 항목은 지울 수 없어요. 「끄기」로 숨겨 주세요.",
  OPTION_NAME: "보기 이름을 1~20자로 써 주세요.",
  OPTION_DUPLICATE: "같은 이름의 보기가 있어요.",
  OPTION_IN_USE: "기록에 쓰인 보기는 지울 수 없어요. 「끄기」로 숨겨 주세요.",
  SETTING_INVALID: "설정 값을 다시 확인해 주세요. 경고 기준은 0~100%예요.",

  PUSH_UNSUPPORTED: "이 기기에서는 알림을 켤 수 없어요. 홈 화면에 추가한 앱에서 켜 주세요.",
  PUSH_DENIED: "알림이 꺼져 있어요. 아이폰 설정 › 알림에서 이 앱을 켜 주세요.",
} as const;

export type MessageCode = keyof typeof MESSAGES;

export const messageOf = (code: MessageCode) => MESSAGES[code] ?? MESSAGES.UNKNOWN;
