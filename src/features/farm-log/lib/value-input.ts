// 기록 화면 글자 ↔ 칸 값. 빈칸 = null(안 적음, 0 과 다르다). 형식·범위가 틀리면 undefined(저장을 막는다).
import { isNumeric, type Field } from "@/features/field/types";
import type { Cell } from "@/features/farm-log/types";

type NumberRule = Pick<Field, "valueType" | "min" | "max">;

export function parseNumber(text: string, field: NumberRule): number | null | undefined {
  const t = text.trim().replace(/,/g, "");
  if (t === "") return null;
  const pattern = field.valueType === "int" ? /^-?\d+$/ : /^-?\d+(\.\d+)?$/;
  if (!pattern.test(t)) return undefined;
  const n = Number(t);
  if ((field.min !== null && n < field.min) || (field.max !== null && n > field.max)) return undefined;
  return n;
}

// 편집 칸 글자(선택형은 보기 id 글자) → 칸 값
export function toCell(field: Pick<Field, "valueType" | "min" | "max" | "options">, draft: string): Cell | null | undefined {
  if (isNumeric(field.valueType)) {
    const n = parseNumber(draft, field);
    return n === undefined || n === null ? n : { num: n, optionId: null, text: null };
  }
  if (field.valueType === "choice") {
    if (draft === "") return null;
    const id = Number(draft);
    return field.options.some((o) => o.id === id) ? { num: null, optionId: id, text: null } : undefined;
  }
  const t = draft.trim();
  if (t === "") return null;
  return t.length > 500 ? undefined : { num: null, optionId: null, text: t };
}

export function toDraft(cell: Cell | undefined): string {
  if (!cell) return "";
  if (cell.num !== null) return String(cell.num);
  if (cell.optionId !== null) return String(cell.optionId);
  return cell.text ?? "";
}
