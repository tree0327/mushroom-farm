import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { fmtKg, fmtPct } from "@/shared/lib/format";
import type { RoomRank } from "@/features/analysis/lib/metrics";

export function RoomRanking({ ranked }: { ranked: RoomRank[] }) {
  return (
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
  );
}
