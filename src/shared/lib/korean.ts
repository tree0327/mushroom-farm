// 이름 뒤 조사. 마지막 글자에 받침이 있으면 앞 것(이·은), 없으면 뒤 것(가·는).
function hasFinal(name: string): boolean {
  const last = name.charCodeAt(name.length - 1);
  return last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
}

// 다빈 → 다빈이, 아내 → 아내가
export const withSubject = (name: string) => `${name}${hasFinal(name) ? "이" : "가"}`;
// 남편 → 남편은, 아내 → 아내는
export const withTopic = (name: string) => `${name}${hasFinal(name) ? "은" : "는"}`;
