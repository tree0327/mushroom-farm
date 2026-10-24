"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { LockedNote } from "@/shared/components/locked-note";
import { useAction } from "@/shared/hooks/use-action";
import { formatDayLabel } from "@/shared/lib/date";
import { addRestDay, removeRestDay, setWeekendRest } from "@/features/rest-day/actions";

type RestDay = { id: number; date: string; memo: string };

export function RestDayManager({
  isAdmin,
  isWeekendRest,
  restDays,
  today,
}: {
  isAdmin: boolean;
  isWeekendRest: boolean;
  restDays: RestDay[];
  today: string;
}) {
  const { pending, run } = useAction();
  const [date, setDate] = useState("");
  const [memo, setMemo] = useState("");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">주말 쉬기</CardTitle>
          <CardDescription>켜 두면 토·일에는 새 일기를 쓰지 않아요. 전날 일기 공개와 답장은 그대로 가요.</CardDescription>
        </CardHeader>
        <CardContent>
          {isAdmin ? (
            <label className="flex min-h-11 items-center justify-between">
              <span className="text-base">토·일은 쉬어요</span>
              <Switch
                checked={isWeekendRest}
                disabled={pending}
                onCheckedChange={(v) =>
                  run(() => setWeekendRest(v), { success: v ? "주말을 쉬는 날로 했어요" : "주말에도 일기를 써요" })
                }
              />
            </label>
          ) : (
            <p className="text-base">{isWeekendRest ? "토·일은 쉬어요" : "주말에도 일기를 써요"}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">따로 쉬는 날</CardTitle>
          <CardDescription>여행·명절처럼 일기를 쉬는 날이에요.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {restDays.length === 0 && <p className="text-muted-foreground">앞으로 정한 쉬는 날이 없어요.</p>}
          <ul className="flex flex-col divide-y">
            {restDays.map((d) => (
              <li key={d.id} className="flex min-h-11 items-center gap-2 py-2">
                <div className="flex-1">
                  <p className="text-base">{formatDayLabel(d.date)}</p>
                  {d.memo && <p className="text-sm text-muted-foreground">{d.memo}</p>}
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`${formatDayLabel(d.date)} 빼기`}
                    disabled={pending}
                    onClick={() => run(() => removeRestDay(d.id), { success: "쉬는 날에서 뺐어요" })}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                )}
              </li>
            ))}
          </ul>

          {isAdmin ? (
            <form
              className="flex flex-col gap-3 border-t pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => addRestDay(date, memo), {
                  success: "쉬는 날을 더했어요",
                  onSuccess: () => {
                    setDate("");
                    setMemo("");
                  },
                });
              }}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="rest-date">날짜</Label>
                <Input id="rest-date" type="date" className="h-11" min={today} value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="rest-memo">메모 (선택)</Label>
                <Input id="rest-memo" className="h-11" maxLength={50} placeholder="예: 제주 여행" value={memo} onChange={(e) => setMemo(e.target.value)} />
              </div>
              <Button type="submit" className="h-11 text-base" disabled={pending || !date}>
                쉬는 날 더하기
              </Button>
            </form>
          ) : (
            <LockedNote label="쉬는 날은 관리자가 정해요" reason="ADMIN_ONLY" />
          )}
        </CardContent>
      </Card>
    </>
  );
}
