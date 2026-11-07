import Link from "next/link";
import { cn } from "cn";
import { Card, CardContent } from "@/shared/ui/card";
import { addDays } from "@/shared/lib/date";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export type CalendarDay = { harvest: number | null; warn: boolean };

// 한 달 달력. 칸에는 그날 수확 kg(없으면 점), 경고가 있는 날은 경고 색 점. 누르면 그날 기록 화면.
export function MonthCalendar({ month, today, days }: { month: string; today: string; days: Map<string, CalendarDay> }) {
  const first = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  // 달력 칸: 첫 주 앞을 비우고 1일부터
  const lead = new Date(`${first}T00:00:00Z`).getUTCDay();
  const cells: (string | null)[] = [...Array<null>(lead).fill(null)];
  for (let d = first; d <= last; d = addDays(d, 1)) cells.push(d);

  return (
    <Card className="py-3">
      <CardContent className="px-2">
        <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((w) => (
            <div key={w} className="pb-2">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((d, i) => {
            if (!d) return <div key={`blank-${i}`} />;
            const row = days.get(d);
            const future = d > today;
            const label = `${Number(d.slice(8))}`;
            const body = (
              <>
                <span className={cn("text-sm", d === today && "rounded-full bg-primary px-1.5 font-semibold text-primary-foreground")}>
                  {label}
                </span>
                <span className="h-4 text-[11px] leading-4 tabular-nums text-foreground">
                  {row?.harvest != null ? row.harvest.toFixed(1) : row ? "•" : ""}
                </span>
                {row?.warn && <span className="size-1.5 rounded-full bg-warning" aria-hidden />}
              </>
            );
            return future ? (
              <div key={d} className="flex h-14 flex-col items-center gap-0.5 pt-1 text-muted-foreground/60">
                {body}
              </div>
            ) : (
              <Link
                key={d}
                href={d === today ? "/log" : `/log?date=${d}`}
                aria-label={`${m}월 ${label}일${row ? " 기록 있음" : ""}${row?.warn ? " 경고" : ""}`}
                className={cn("flex h-14 flex-col items-center gap-0.5 rounded-lg pt-1 active:bg-muted", row && "bg-accent")}
              >
                {body}
              </Link>
            );
          })}
        </div>
        <p className="px-2 pt-3 text-xs text-muted-foreground">
          칸의 숫자는 그날 수확(정품+불량) kg, 검은 점은 수확 없이 기록만 있는 날, 경고 색 점은 경고 범위를 벗어난 값이 있는 날이에요.
        </p>
      </CardContent>
    </Card>
  );
}
