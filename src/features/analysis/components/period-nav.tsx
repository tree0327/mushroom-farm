import Link from "next/link";
import { cn } from "cn";
import { PERIODS, type Period } from "@/features/analysis/lib/period";

// 분석 주소. 기본 기간(농장 설정)은 주소에 안 붙인다. f = 추이를 펼친 항목 id.
export function statsHref(period: Period, defaultPeriod: Period, field: number | null): string {
  const q = new URLSearchParams();
  if (period !== defaultPeriod) q.set("p", period);
  if (field !== null) q.set("f", String(field));
  const s = q.toString();
  return s ? `/stats?${s}` : "/stats";
}

export function PeriodNav({ period, defaultPeriod, field }: { period: Period; defaultPeriod: Period; field: number | null }) {
  const href = (p: Period) => statsHref(p, defaultPeriod, field);
  return (
    <nav aria-label="기간" className="grid grid-cols-5 gap-1 rounded-xl bg-muted p-1">
      {PERIODS.map((x) => (
        <Link
          key={x.key}
          href={href(x.key)}
          aria-current={x.key === period ? "page" : undefined}
          className={cn(
            "flex h-10 items-center justify-center rounded-lg text-base",
            x.key === period ? "bg-card font-semibold shadow-sm" : "text-muted-foreground",
          )}
        >
          {x.label}
        </Link>
      ))}
    </nav>
  );
}
