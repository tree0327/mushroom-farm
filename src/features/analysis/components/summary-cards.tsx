import { cn } from "cn";
import { Card, CardContent } from "@/shared/ui/card";
import { fmtCount, fmtGrams, fmtKg, fmtPct } from "@/shared/lib/format";
import type { FieldRole } from "@/features/field/types";
import type { FarmSetting } from "@/features/farm-setting/types";
import type { Summary } from "@/features/analysis/lib/metrics";

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

type CardDef = {
  key: keyof Summary;
  label: string;
  fmt: (n: number | null) => string;
  kind: "total" | "rate";
  note?: string;
  roles: FieldRole[]; // 이 기본 항목이 모두 켜져 있어야 보인다
};

const CARDS: CardDef[] = [
  { key: "harvest", label: "총 수확", fmt: fmtKg, kind: "total", note: "정품+불량", roles: ["good"] },
  { key: "defectRate", label: "불량률", fmt: fmtPct, kind: "rate", note: "불량 kg ÷ 전체 kg", roles: ["good", "defect"] },
  { key: "bottled", label: "총 입병", fmt: fmtCount, kind: "total", roles: ["bottled"] },
  { key: "inoculated", label: "총 접종", fmt: fmtCount, kind: "total", roles: ["inoculated"] },
  { key: "contaminationRate", label: "오염률", fmt: fmtPct, kind: "rate", note: "오염 병 ÷ 접종 병", roles: ["contaminated", "inoculated"] },
  { key: "gramsPerBottle", label: "병당 수확", fmt: fmtGrams, kind: "total", note: "어림 · 수확 g ÷ 입병", roles: ["bottled", "good"] },
];

// 기본 지표 카드. 경고 기준(농장 설정)을 넘으면 경고 색, 하루 목표가 있으면 하루 평균과 비교.
export function SummaryCards({
  cur,
  before,
  activeRoles,
  setting,
  days,
}: {
  cur: Summary;
  before: Summary;
  activeRoles: FieldRole[];
  setting: FarmSetting;
  days: number;
}) {
  const warnOf = (key: keyof Summary): string | null => {
    const v = cur[key];
    const limit = key === "defectRate" ? setting.defectRateWarnPct : key === "contaminationRate" ? setting.contaminationRateWarnPct : null;
    return v !== null && limit !== null && v * 100 > limit ? `경고 기준 ${limit}% 넘음` : null;
  };
  const target = (key: keyof Summary): string | null => {
    const v = cur[key];
    if (key !== "harvest" || setting.targetDailyKg === null || v === null) return null;
    return `하루 평균 ${fmtKg(Math.round((v / days) * 10) / 10)} · 목표 ${fmtKg(setting.targetDailyKg)}`;
  };
  const shown = CARDS.filter((c) => c.roles.every((r) => activeRoles.includes(r)));
  return (
    <div className="grid grid-cols-2 gap-3">
      {shown.map((c) => {
        const diff = change(cur[c.key], before[c.key], c.kind);
        const warn = warnOf(c.key);
        const goal = target(c.key);
        return (
          <Card key={c.key} className="gap-1 py-4">
            <CardContent className="flex flex-col gap-0.5 px-4">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <span className={cn("text-xl font-semibold tabular-nums", warn && "text-warning")}>{c.fmt(cur[c.key])}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{diff ? `직전 대비 ${diff}` : "직전 비교 없음"}</span>
              {warn && <span className="text-xs text-warning">{warn}</span>}
              {goal && <span className="text-xs tabular-nums text-muted-foreground">{goal}</span>}
              {c.note && <span className="text-xs text-muted-foreground">{c.note}</span>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
