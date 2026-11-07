"use client";

import { cn } from "cn";
import { Button } from "@/shared/ui/button";

// 몇 개 중 하나 고르기(버튼 묶음). 기간·항목 종류·분석 표시 고르기에 쓴다.
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-muted p-1">
      {options.map((o) => (
        <Button
          key={o.key}
          type="button"
          variant="ghost"
          role="radio"
          aria-checked={o.key === value}
          disabled={disabled}
          onClick={() => onChange(o.key)}
          className={cn(
            "h-10 rounded-lg text-base",
            o.key === value ? "bg-card font-semibold shadow-sm hover:bg-card" : "text-muted-foreground",
          )}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
