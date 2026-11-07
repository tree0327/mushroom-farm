"use client";

import { cn } from "cn";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { isNumeric, isWarn, type Field } from "@/features/field/types";
import { parseNumber } from "@/features/farm-log/lib/value-input";

// 항목 종류별 입력 칸. 숫자: 키패드 + 단위, 선택: 보기 버튼(다시 누르면 지움), 글: 한 줄.
export function FieldInput({ id, field, value, onChange }: { id: string; field: Field; value: string; onChange: (v: string) => void }) {
  if (field.valueType === "choice") {
    const shown = field.options.filter((o) => o.isActive || String(o.id) === value);
    return (
      <fieldset className="col-span-2 flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm text-muted-foreground">{field.name}</legend>
        <div className="flex flex-wrap gap-2">
          {shown.length === 0 && <span className="text-sm text-muted-foreground">보기가 없어요. 더보기 › 입력 항목에서 더해 주세요.</span>}
          {shown.map((o) => {
            const on = String(o.id) === value;
            return (
              <Button
                key={o.id}
                type="button"
                variant={on ? "default" : "outline"}
                className="h-11 px-4 text-base"
                aria-pressed={on}
                onClick={() => onChange(on ? "" : String(o.id))}
              >
                {o.label}
              </Button>
            );
          })}
        </div>
      </fieldset>
    );
  }

  const numeric = isNumeric(field.valueType);
  const parsed = numeric ? parseNumber(value, field) : null;
  const invalid = parsed === undefined;
  const warn = !invalid && isWarn(field, parsed ?? null);
  return (
    <div className={cn("flex flex-col gap-1.5", !numeric && "col-span-2")}>
      <Label htmlFor={id} className="text-sm text-muted-foreground">
        {field.name}
      </Label>
      <div className="relative">
        <Input
          id={id}
          className={cn(
            "h-11 text-base",
            numeric && "text-right tabular-nums",
            field.unit && "pr-10",
            warn && "border-warning text-warning",
          )}
          inputMode={numeric ? (field.valueType === "int" && (field.min ?? 0) >= 0 ? "numeric" : "decimal") : undefined}
          maxLength={numeric ? undefined : 500}
          autoComplete="off"
          value={value}
          aria-invalid={invalid || undefined}
          aria-describedby={warn ? `${id}-warn` : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {field.unit && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">{field.unit}</span>
        )}
      </div>
      {warn && (
        <span id={`${id}-warn`} className="text-xs text-warning">
          경고 범위 밖({rangeText(field.warnMin, field.warnMax)})
        </span>
      )}
    </div>
  );
}

const rangeText = (min: number | null, max: number | null) =>
  min !== null && max !== null ? `${min}~${max}` : min !== null ? `${min} 이상` : max !== null ? `${max} 이하` : "";
