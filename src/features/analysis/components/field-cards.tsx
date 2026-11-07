import Link from "next/link";
import { cn } from "cn";
import { Card, CardContent } from "@/shared/ui/card";
import { fmtNum } from "@/shared/lib/format";
import { isNumeric, SUMMARIES, type Field } from "@/features/field/types";
import type { FieldSummaryValue } from "@/features/analysis/lib/field-summary";

// 항목별 요약 카드. 숫자 항목은 누르면 아래에 추이 그래프(?f=<id>).
export function FieldCards({
  items,
  selected,
  hrefOf,
}: {
  items: { field: Field; summary: FieldSummaryValue }[];
  selected: number | null;
  hrefOf: (fieldId: number | null) => string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(({ field, summary }) => {
        const on = selected === field.id;
        const body = (
          <CardContent className="flex flex-col gap-0.5 px-4">
            <span className="text-sm text-muted-foreground">{field.name}</span>
            <Value field={field} summary={summary} />
          </CardContent>
        );
        return (
          <Card key={field.id} className={cn("gap-1 py-4", on && "ring-2 ring-primary", summary.kind === "choice" && "col-span-2")}>
            {isNumeric(field.valueType) ? (
              <Link href={hrefOf(on ? null : field.id)} aria-pressed={on} aria-label={`${field.name} 추이 ${on ? "닫기" : "보기"}`}>
                {body}
              </Link>
            ) : (
              body
            )}
          </Card>
        );
      })}
    </div>
  );
}

function Value({ field, summary }: { field: Field; summary: FieldSummaryValue }) {
  if (summary.kind === "number") {
    const how = SUMMARIES.find((s) => s.key === field.summary)?.label;
    return (
      <>
        <span className="text-xl font-semibold tabular-nums">{fmtNum(summary.value, field.unit)}</span>
        <span className="text-xs text-muted-foreground">기간 {how}</span>
        {summary.warnDays > 0 && <span className="text-xs text-warning">경고 범위 밖 {summary.warnDays}일</span>}
      </>
    );
  }
  if (summary.kind === "choice") {
    return summary.total === 0 ? (
      <span className="text-base text-muted-foreground">기록 없음</span>
    ) : (
      <ul className="mt-1 flex flex-col gap-1 text-base tabular-nums">
        {summary.counts.map((c) => (
          <li key={c.id} className="flex justify-between">
            <span>{c.label}</span>
            <span>
              {c.count}번 · {Math.round((c.count / summary.total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <>
      <span className="text-xl font-semibold tabular-nums">{summary.days}일</span>
      <span className="text-xs text-muted-foreground">적은 날</span>
    </>
  );
}
