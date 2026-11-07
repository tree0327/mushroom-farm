import { Card, CardContent } from "@/shared/ui/card";
import { PageBody, PageHeader } from "@/shared/components/page-header";
import { getMemberOrRedirect } from "@/shared/lib/member";
import { kstYmd } from "@/shared/lib/date";
import { isNumeric } from "@/features/field/types";
import { getFields, roleIds } from "@/features/field/queries";
import { getRooms } from "@/features/room/queries";
import { getFarmSetting } from "@/features/farm-setting/queries";
import { getFarmDays, getRoomTotals } from "@/features/farm-log/queries";
import { dayCount, inRange, isPeriod, periodRange, previousRange } from "@/features/analysis/lib/period";
import { rankRooms, summarize, toDayRow, toRoomTotals } from "@/features/analysis/lib/metrics";
import { buckets } from "@/features/analysis/lib/buckets";
import { fieldTrend, summarizeField } from "@/features/analysis/lib/field-summary";
import { TrendChart } from "@/features/analysis/components/trend-chart";
import { PeriodNav, statsHref } from "@/features/analysis/components/period-nav";
import { SummaryCards } from "@/features/analysis/components/summary-cards";
import { FieldCards } from "@/features/analysis/components/field-cards";
import { RoomRanking } from "@/features/analysis/components/room-ranking";

const short = (ymd: string) => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`;

// 기본 지표 카드에 이미 나오는 항목 — 항목 카드에서는 뺀다
const IN_SUMMARY = new Set(["bottled", "inoculated", "contaminated", "good", "defect"]);

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ p?: string; f?: string }> }) {
  const ctx = await getMemberOrRedirect();
  const [{ p, f }, fields, rooms, setting] = await Promise.all([searchParams, getFields(ctx), getRooms(ctx), getFarmSetting(ctx)]);
  const period = isPeriod(p) ? p : setting.defaultPeriod;
  const today = kstYmd();
  const range = periodRange(period, today);
  const prev = previousRange(range);

  // 직전 기간까지 한 번에(1년이면 최대 731행 — Data API 한 번에 들어온다)
  const [days, roomRows] = await Promise.all([getFarmDays(ctx, prev.from, range.to), getRoomTotals(ctx, range.from, range.to)]);
  const roles = roleIds(fields);
  const rows = days.map((d) => toDayRow(d, roles));
  const curDays = inRange(days, range);
  const cur = summarize(inRange(rows, range));
  const before = summarize(inRange(rows, prev));
  const series = buckets(rows, period, range);
  const ranked = rankRooms(toRoomTotals(roomRows, rooms, roles));
  const activeRoles = fields.flatMap((x) => (x.role && x.isActive ? [x.role] : []));

  const cardFields = fields.filter((x) => x.isActive && !(x.role && IN_SUMMARY.has(x.role)) && (x.summary !== "none" || !isNumeric(x.valueType)));
  const items = cardFields.map((field) => ({ field, summary: summarizeField(field, curDays) }));
  const selected = cardFields.find((x) => String(x.id) === f && isNumeric(x.valueType)) ?? null;
  const hrefOf = (id: number | null) => statsHref(period, setting.defaultPeriod, id);

  return (
    <>
      <PageHeader title="분석" />
      <PageBody>
        <PeriodNav period={period} defaultPeriod={setting.defaultPeriod} field={selected?.id ?? null} />
        <p className="-mt-3 text-sm text-muted-foreground">
          {short(range.from)} ~ {short(range.to)} · 비교: 직전 {short(prev.from)} ~ {short(prev.to)}
        </p>

        {curDays.length === 0 ? (
          <Card>
            <CardContent>
              <p className="text-base">이 기간에는 기록이 없어요.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <SummaryCards cur={cur} before={before} activeRoles={activeRoles} setting={setting} days={dayCount(range)} />

            {(activeRoles.includes("good") || activeRoles.includes("defect")) && (
              <Card>
                <CardContent className="flex flex-col gap-6">
                  <TrendChart title="수확량" points={series.map((b) => ({ key: b.key, label: b.label, value: b.harvest }))} format={{ kind: "kg" }} />
                  <TrendChart
                    title="불량률"
                    points={series.map((b) => ({ key: b.key, label: b.label, value: b.defectRate }))}
                    format={{ kind: "pct" }}
                  />
                </CardContent>
              </Card>
            )}

            {items.length > 0 && (
              <section className="flex flex-col gap-3" aria-label="항목별">
                <h2 className="text-lg font-semibold">항목별</h2>
                <FieldCards items={items} selected={selected?.id ?? null} hrefOf={hrefOf} />
                {selected && (
                  <Card>
                    <CardContent>
                      <TrendChart
                        title={`${selected.name} 추이`}
                        points={fieldTrend(selected, curDays, period, range)}
                        format={{ kind: "num", unit: selected.unit }}
                      />
                    </CardContent>
                  </Card>
                )}
              </section>
            )}

            <RoomRanking ranked={ranked} />
          </>
        )}
      </PageBody>
    </>
  );
}
