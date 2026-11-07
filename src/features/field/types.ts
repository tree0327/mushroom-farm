// 입력 항목 정의(DB mf_field·mf_field_option). 화면·서버 모두 쓴다.
export type FieldScope = "farm" | "room";
export type ValueType = "int" | "decimal" | "choice" | "text";
export type FieldRole = "bottled" | "inoculated" | "contaminated" | "good" | "defect" | "temperature" | "humidity";
export type FieldSummary = "sum" | "avg" | "none";

export type FieldOption = { id: number; label: string; sortOrder: number; isActive: boolean };

export type Field = {
  id: number;
  scope: FieldScope;
  role: FieldRole | null; // 기본 항목(분석 계산용). 지우거나 종류를 바꿀 수 없다
  name: string;
  valueType: ValueType;
  unit: string;
  min: number | null; // 입력 허용 범위
  max: number | null;
  warnMin: number | null; // 벗어나면 경고 표시
  warnMax: number | null;
  summary: FieldSummary; // 분석 카드: 기간 합계 / 평균
  sortOrder: number;
  isActive: boolean;
  options: FieldOption[];
};

export const SCOPES: { key: FieldScope; label: string; note: string }[] = [
  { key: "farm", label: "농장 항목", note: "하루에 한 번 적어요" },
  { key: "room", label: "호실 항목", note: "호실마다 적어요" },
];
export const VALUE_TYPES: { key: ValueType; label: string }[] = [
  { key: "int", label: "정수" },
  { key: "decimal", label: "소수" },
  { key: "choice", label: "선택" },
  { key: "text", label: "글" },
];
export const SUMMARIES: { key: FieldSummary; label: string }[] = [
  { key: "sum", label: "합계" },
  { key: "avg", label: "평균" },
  { key: "none", label: "안 보임" },
];
export const valueTypeLabel = (t: ValueType) => VALUE_TYPES.find((x) => x.key === t)?.label ?? t;
export const isNumeric = (t: ValueType) => t === "int" || t === "decimal";

// 범위를 벗어났는지(경고). 기준이 없으면 false.
export const isWarn = (f: Pick<Field, "warnMin" | "warnMax">, v: number | null) =>
  v !== null && ((f.warnMin !== null && v < f.warnMin) || (f.warnMax !== null && v > f.warnMax));
