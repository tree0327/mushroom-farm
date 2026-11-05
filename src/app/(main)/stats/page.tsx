import Link from "next/link";
import { cn } from "cn";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageBody, PageHeader } from "@/shared/components/page-header";
import { getMemberOrRedirect } from "@/shared/lib/member";
import { kstYmd } from "@/shared/lib/date";
import { fmtCount, fmtGrams, fmtKg, fmtPct } from "@/shared/lib/format";
import { getFarmDays, getRoomTotals } from "@/features/farm-log/queries";
import {
  PERIODS,
  buckets,
  inRange,
  isPeriod,
  periodRange,
  previousRange,
  rankRooms,
  summarize,
  type Summary,
} from "@/features/analysis/stats";
import { TrendChart } from "@/features/analysis/components/trend-chart";

const short = (ymd: string) => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`;

// 직전 기간 대비. 합계는 몇 % 늘고 줄었나, 비율은 몇 %p.
function change(cur: number | null, prev: number | null, kind: "total" | "rate"): string | null {
  if (cur === null || prev === null) return null;
  if (kind === "rate") {
    const d = (cur - prev) * 100;
    return `${d >= 0 ? "+" : ""}${d.toFixed(1)}%p`;
  }
  if (prev === 0) return null;
  const d = ((cur - prev) / prev) * 100;
  return `${d >= 0 ? "+" : ""}${d.toFixed(0)}%`;
}

const CARDS: { key: keyof Summary; label: string; fmt: (n: number | null) => string; kind: "total" | "rate"; note?: string }[] = [
  { key: "harvest", label: "총 수확", fmt: fmtKg, kind: "total", note: "정품+불량" },
  { key: "defectRate", label: "불량률", fmt: fmtPct, kind: "rate", note: "불량 kg ÷ 전체 kg" },
  { key: "bottled", label: "총 입병", fmt: fmtCount, kind: "total" },
  { key: "inoculated", label: "총 접종", fmt: fmtCount, kind: "total" },
  { key: "contaminationRate", label: "오염률", fmt: fmtPct, kind: "rate", note: "오염 병 ÷ 접종 병" },
  { key: "gramsPerBottle", label: "병당 수확", fmt: fmtGrams, kind: "total", note: "어림 · 수확 g ÷ 입병" },
];

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const ctx = await getMemberOrRedirect();
  const { p } = await searchParams;
  const period = isPeriod(p) ? p : "1m";
  const today = kstYmd();
  const range = periodRange(period, today);
  const prev = previousRange(range);

  // 직전 기간까지 한 번에(1년이면 최대 731행 — Data API 한 번에 들어온다)
  const [days, rooms] = await Promise.all([getFarmDays(ctx, prev.from, range.to), getRoomTotals(ctx, range.from, range.to)]);
  const cur = summarize(inRange(days, range));
  const before = summarize(inRange(days, prev));
  const empty = inRange(days, range).length === 0;
  const series = buckets(days, period, range);
  const ranked = rankRooms(rooms);

  return (
    <>
      <PageHeader title="분석" />
      <PageBody>
        <nav aria-label="기간" className="grid grid-cols-5 gap-1 rounded-xl bg-muted p-1">
          {PERIODS.map((x) => (
            <Link
              key={x.key}
              href={x.key === "1m" ? "/stats" : `/stats?p=${x.key}`}
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
        <p className="-mt-3 text-sm text-muted-foreground">
          {short(range.from)} ~ {short(range.to)} · 비교: 직전 {short(prev.from)} ~ {short(prev.to)}
        </p>

        {empty ? (
          <Card>
            <CardContent>
              <p className="text-base">이 기간에는 기록이 없어요.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {CARDS.map((c) => {
                const diff = change(cur[c.key], before[c.key], c.kind);
                return (
                  <Card key={c.key} className="gap-1 py-4">
                    <CardContent className="flex flex-col gap-0.5 px-4">
                      <span className="text-sm text-muted-foreground">{c.label}</span>
                      <span className="text-xl font-semibold tabular-nums">{c.fmt(cur[c.key])}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {diff ? `직전 대비 ${diff}` : "직전 비교 없음"}
                      </span>
                      {c.note && <span className="text-xs text-muted-foreground">{c.note}</span>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardContent className="flex flex-col gap-6">
                <TrendChart title="수확량" buckets={series} metric="harvest" />
                <TrendChart title="불량률" buckets={series} metric="defectRate" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">호실별</CardTitle>
              </CardHeader>
              <CardContent>
                {ranked.length === 0 ? (
                  <p className="text-base text-muted-foreground">이 기간에 호실 수확 기록이 없어요.</p>
                ) : (
                  <table className="w-full text-base tabular-nums">
                    <thead>
                      <tr className="text-left text-sm text-muted-foreground">
                        <th className="pb-2 font-normal">호실</th>
                        <th className="pb-2 text-right font-normal">수확</th>
                        <th className="pb-2 text-right font-normal">불량률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranked.map((r) => (
                        <tr key={r.roomId} className="border-t border-border/60">
                          <td className="py-2">
                            {r.name}
                            {!r.isActive && <span className="ml-1 text-sm text-muted-foreground">(안 씀)</span>}
                          </td>
                          <td className="py-2 text-right">{fmtKg(r.harvest)}</td>
                          <td className="py-2 text-right">{fmtPct(r.defectRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </PageBody>
    </>
  );
}
