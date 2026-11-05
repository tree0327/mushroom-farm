"use client";

import { useState } from "react";
import { cn } from "cn";
import { fmtKg, fmtPct } from "@/shared/lib/format";
import type { Bucket } from "@/features/analysis/stats";

// 막대 하나짜리 추이 그래프. 단위가 다른 두 값(수확 kg·불량률)은 축 하나에 겹치지 않고 그래프를 둘로 나눈다.
// 막대를 누르거나 올리면 위 줄에 그 칸 값이 나온다. 같은 값은 아래 「표로 보기」에도 있다.
export function TrendChart({
  title,
  buckets,
  metric,
}: {
  title: string;
  buckets: Bucket[];
  metric: "harvest" | "defectRate";
}) {
  const format = metric === "harvest" ? fmtKg : fmtPct;
  const [active, setActive] = useState<number | null>(null);
  const values = buckets.map((b) => b[metric]);
  const max = Math.max(0, ...values.map((v) => v ?? 0));
  const W = 320;
  const H = 120;
  const gap = buckets.length > 20 ? 1 : 2; // 막대 사이 바탕색 틈
  const bw = (W - gap * (buckets.length - 1)) / buckets.length;
  const shown = active ?? lastWithValue(values);

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-base font-semibold">{title}</span>
        <span className="text-sm tabular-nums text-muted-foreground">
          {shown === null ? "기록이 없어요" : `${buckets[shown].label} · ${format(values[shown])}`}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H + 18}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={`${title} 그래프`}
        onPointerLeave={() => setActive(null)}
      >
        {/* 바닥선 */}
        <line x1={0} x2={W} y1={H} y2={H} className="stroke-border" strokeWidth={1} />
        {buckets.map((b, i) => {
          const v = values[i];
          const h = v === null || max === 0 ? 0 : Math.max(2, (v / max) * (H - 8));
          const x = i * (bw + gap);
          return (
            <g key={b.key} onPointerEnter={() => setActive(i)} onPointerDown={() => setActive(i)}>
              {/* 누르는 자리는 막대보다 크게(칸 전체 높이) */}
              <rect x={x} y={0} width={bw + gap} height={H} fill="transparent" />
              {h > 0 && (
                <path
                  d={roundedTop(x, H - h, bw, h, Math.min(4, bw / 2))}
                  className={cn("fill-primary", shown !== null && shown !== i && "opacity-45")}
                />
              )}
            </g>
          );
        })}
        {/* 양 끝 칸 이름만 */}
        <text x={0} y={H + 14} className="fill-muted-foreground text-[11px]">
          {buckets[0]?.label}
        </text>
        <text x={W} y={H + 14} textAnchor="end" className="fill-muted-foreground text-[11px]">
          {buckets[buckets.length - 1]?.label}
        </text>
      </svg>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">표로 보기</summary>
        <table className="mt-2 w-full tabular-nums">
          <tbody>
            {buckets.map((b, i) => (
              <tr key={b.key} className="border-b border-border/60">
                <td className="py-1">{b.label}</td>
                <td className="py-1 text-right">{format(values[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function lastWithValue(values: (number | null)[]): number | null {
  for (let i = values.length - 1; i >= 0; i--) if (values[i] !== null) return i;
  return null;
}

// 위 두 모서리만 둥근 막대(바닥에 붙는다)
function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}
