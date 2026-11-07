// 목록에서 id 를 위·아래 칸과 바꾼 새 순서. 맨 끝이라 못 옮기거나 없는 id 면 null.
export function swapOrder(ids: number[], id: number, direction: "up" | "down"): number[] | null {
  const i = ids.indexOf(id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return null;
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
