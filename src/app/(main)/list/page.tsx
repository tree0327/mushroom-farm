import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { PageBody, PageHeader } from "@/shared/components/page-header";
import { getMemberOrRedirect } from "@/shared/lib/member";
import { addDays, kstYmd } from "@/shared/lib/date";
import { fmtCount, fmtKg, fmtPct } from "@/shared/lib/format";
import { getFields, roleIds } from "@/features/field/queries";
import { getFarmDays } from "@/features/farm-log/queries";
import { summarize, toDayRow } from "@/features/analysis/lib/metrics";
import { warnDates } from "@/features/analysis/lib/field-summary";
import { MonthCalendar } from "@/features/calendar/components/month-calendar";

// YYYY-MM 을 n달 옮긴다
function shiftMonth(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

export default async function ListPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const ctx = await getMemberOrRedirect();
  const today = kstYmd();
  const thisMonth = today.slice(0, 7);
  const { month: raw } = await searchParams;
  const month = raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) && raw <= thisMonth ? raw : thisMonth;

  const first = `${month}-01`;
  const last = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const [fields, days] = await Promise.all([getFields(ctx), getFarmDays(ctx, first, last)]);
  const roles = roleIds(fields);
  const rows = days.map((d) => toDayRow(d, roles));
  const warns = warnDates(fields, days);
  const calendar = new Map(rows.map((r) => [r.date, { harvest: summarize([r]).harvest, warn: warns.has(r.date) }]));
  const total = summarize(rows);

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

        <MonthCalendar month={month} today={today} days={calendar} />

        <Card>
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3">
            <p className="col-span-2 text-base font-semibold">{m}월 합계</p>
            <Stat label="입병" value={fmtCount(total.bottled)} />
            <Stat label="접종" value={fmtCount(total.inoculated)} />
            <Stat label="수확" value={fmtKg(total.harvest)} />
            <Stat label="불량률" value={fmtPct(total.defectRate)} />
            {warns.size > 0 && <p className="col-span-2 text-sm text-warning">경고 범위를 벗어난 날 {warns.size}일</p>}
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
