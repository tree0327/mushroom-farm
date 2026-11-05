import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";
import { Card, CardContent } from "@/shared/ui/card";
import { PageBody, PageHeader } from "@/shared/components/page-header";
import { getMemberOrRedirect } from "@/shared/lib/member";
import { addDays, kstYmd } from "@/shared/lib/date";
import { fmtCount, fmtKg, fmtPct } from "@/shared/lib/format";
import { getFarmDays } from "@/features/farm-log/queries";
import { summarize } from "@/features/analysis/stats";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// YYYY-MM 을 n달 옮긴다
function shiftMonth(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export default async function ListPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const ctx = await getMemberOrRedirect();
  const today = kstYmd();
  const thisMonth = today.slice(0, 7);
  const { month: raw } = await searchParams;
  const month = raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) && raw <= thisMonth ? raw : thisMonth;

  const first = `${month}-01`;
  const last = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const days = await getFarmDays(ctx, first, last);
  const byDate = new Map(days.map((d) => [d.date, d]));
  const total = summarize(days);

  // 달력 칸: 첫 주 앞을 비우고 1일부터
  const lead = new Date(`${first}T00:00:00Z`).getUTCDay();
  const cells: (string | null)[] = [...Array(lead).fill(null)];
  for (let d = first; d <= last; d = addDays(d, 1)) cells.push(d);

  const [y, m] = month.split("-").map(Number);
  const monthHref = (ym: string) => (ym === thisMonth ? "/list" : `/list?month=${ym}`);

  return (
    <>
      <PageHeader title="목록" />
      <PageBody>
        <div className="flex items-center justify-between">
          <Link href={monthHref(shiftMonth(month, -1))} aria-label="지난달" className="flex size-11 items-center justify-center">
            <ChevronLeft className="size-6" aria-hidden />
          </Link>
          <h2 className="text-lg font-semibold">
            {y}년 {m}월
          </h2>
          {month < thisMonth ? (
            <Link href={monthHref(shiftMonth(month, 1))} aria-label="다음달" className="flex size-11 items-center justify-center">
              <ChevronRight className="size-6" aria-hidden />
            </Link>
          ) : (
            <span className="size-11" aria-hidden />
          )}
        </div>

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
                const row = byDate.get(d);
                const harvest = row ? summarize([row]).harvest : null;
                const future = d > today;
                const label = `${Number(d.slice(8))}`;
                const body = (
                  <>
                    <span className={cn("text-sm", d === today && "rounded-full bg-primary px-1.5 font-semibold text-primary-foreground")}>
                      {label}
                    </span>
                    <span className="h-4 text-[11px] leading-4 tabular-nums text-foreground">
                      {harvest !== null ? harvest.toFixed(1) : row ? "•" : ""}
                    </span>
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
                    aria-label={`${Number(d.slice(5, 7))}월 ${label}일${row ? " 기록 있음" : ""}`}
                    className={cn("flex h-14 flex-col items-center gap-0.5 rounded-lg pt-1 active:bg-muted", row && "bg-accent")}
                  >
                    {body}
                  </Link>
                );
              })}
            </div>
            <p className="px-2 pt-3 text-xs text-muted-foreground">칸의 숫자는 그날 수확(정품+불량) kg, 점은 수확 없이 기록만 있는 날이에요.</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3">
            <p className="col-span-2 text-base font-semibold">{m}월 합계</p>
            <Stat label="입병" value={fmtCount(total.bottled)} />
            <Stat label="접종" value={fmtCount(total.inoculated)} />
            <Stat label="수확" value={fmtKg(total.harvest)} />
            <Stat label="불량률" value={fmtPct(total.defectRate)} />
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  );
}
