"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { useAction } from "@/shared/hooks/use-action";
import { messageOf } from "@/shared/messages";
import { addDays, formatDayLabel } from "@/shared/lib/date";
import { deleteDay, saveDay } from "@/features/farm-log/actions";
import type { DayEntry, Room } from "@/features/farm-log/queries";

type Kind = "count" | "kg" | "temperature" | "humidity";
// 빈칸 = 안 적음(null). 틀린 글자는 undefined 로 돌려 저장을 막는다.
const PATTERN: Record<Kind, RegExp> = {
  count: /^\d+$/,
  kg: /^\d+(\.\d+)?$/,
  temperature: /^-?\d+(\.\d+)?$/,
  humidity: /^\d+$/,
};
function parse(text: string, kind: Kind): number | null | undefined {
  const t = text.trim().replace(/,/g, "");
  if (t === "") return null;
  return PATTERN[kind].test(t) ? Number(t) : undefined;
}
const show = (n: number | null) => (n === null ? "" : String(n));

type RoomText = { good: string; defect: string; temperature: string; humidity: string };

function Field({
  id,
  label,
  unit,
  kind,
  value,
  onChange,
}: {
  id: string;
  label: string;
  unit: string;
  kind: Kind;
  value: string;
  onChange: (v: string) => void;
}) {
  const invalid = parse(value, kind) === undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          className="h-11 pr-10 text-right text-base tabular-nums"
          inputMode={kind === "count" || kind === "humidity" ? "numeric" : "decimal"}
          autoComplete="off"
          value={value}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  );
}

export function LogEditor({ date, today, rooms, entry }: { date: string; today: string; rooms: Room[]; entry: DayEntry }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [bottled, setBottled] = useState(show(entry.bottled));
  const [inoculated, setInoculated] = useState(show(entry.inoculated));
  const [contaminated, setContaminated] = useState(show(entry.contaminated));
  const [memo, setMemo] = useState(entry.memo);
  const [roomText, setRoomText] = useState<Record<number, RoomText>>(() =>
    Object.fromEntries(
      rooms.map((r) => {
        const v = entry.rooms[r.id];
        return [
          r.id,
          { good: show(v?.good ?? null), defect: show(v?.defect ?? null), temperature: show(v?.temperature ?? null), humidity: show(v?.humidity ?? null) },
        ];
      }),
    ),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const hasSaved =
    entry.bottled !== null || entry.inoculated !== null || entry.contaminated !== null || entry.memo !== "" ||
    Object.keys(entry.rooms).length > 0;

  const setRoom = (id: number, key: keyof RoomText) => (v: string) =>
    setRoomText((prev) => ({ ...prev, [id]: { ...prev[id], [key]: v } }));

  function save() {
    const values = {
      bottled: parse(bottled, "count"),
      inoculated: parse(inoculated, "count"),
      contaminated: parse(contaminated, "count"),
    };
    const roomValues = rooms.map((r) => {
      const t = roomText[r.id];
      return {
        roomId: r.id,
        good: parse(t.good, "kg"),
        defect: parse(t.defect, "kg"),
        temperature: parse(t.temperature, "temperature"),
        humidity: parse(t.humidity, "humidity"),
      };
    });
    const all = [...Object.values(values), ...roomValues.flatMap((r) => [r.good, r.defect, r.temperature, r.humidity])];
    if (all.some((v) => v === undefined)) {
      toast.error(messageOf("LOG_INVALID"));
      return;
    }
    run(
      () =>
        saveDay({
          date,
          bottled: values.bottled ?? null,
          inoculated: values.inoculated ?? null,
          contaminated: values.contaminated ?? null,
          memo,
          rooms: roomValues.map((r) => ({
            roomId: r.roomId,
            good: r.good ?? null,
            defect: r.defect ?? null,
            temperature: r.temperature ?? null,
            humidity: r.humidity ?? null,
          })),
        }),
      { success: "저장했어요", onSuccess: () => router.refresh() },
    );
  }

  const go = (d: string) => router.push(d === today ? "/log" : `/log?date=${d}`);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" className="size-11" aria-label="전날" onClick={() => go(addDays(date, -1))}>
          <ChevronLeft className="size-6" aria-hidden />
        </Button>
        <label className="relative flex flex-col items-center">
          <span className="text-lg font-semibold">{formatDayLabel(date)}</span>
          <span className="text-sm text-muted-foreground">{date === today ? "오늘" : "날짜를 눌러 바꾸기"}</span>
          {/* 글자 위에 투명한 날짜 칸을 덮어, 누르면 폰 달력이 열린다 */}
          <input
            type="date"
            aria-label="날짜 고르기"
            className="absolute inset-0 opacity-0"
            value={date}
            max={today}
            onChange={(e) => e.target.value && go(e.target.value)}
          />
        </label>
        <Button
          variant="ghost"
          className="size-11"
          aria-label="다음날"
          disabled={date >= today}
          onClick={() => go(addDays(date, 1))}
        >
          <ChevronRight className="size-6" aria-hidden />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">배양</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          <Field id="bottled" label="입병" unit="병" kind="count" value={bottled} onChange={setBottled} />
          <Field id="inoculated" label="접종" unit="병" kind="count" value={inoculated} onChange={setInoculated} />
          <Field id="contaminated" label="오염" unit="병" kind="count" value={contaminated} onChange={setContaminated} />
        </CardContent>
      </Card>

      {rooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-2">
            <p className="text-base">아직 호실이 없어요.</p>
            <Link href="/more/rooms" className="text-base font-medium text-primary">
              더보기 › 호실에서 더해 주세요
            </Link>
          </CardContent>
        </Card>
      ) : (
        rooms.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle className="text-lg">
                {r.name}
                {!r.isActive && <span className="ml-2 text-sm font-normal text-muted-foreground">안 씀</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Field id={`good-${r.id}`} label="정품 수확" unit="kg" kind="kg" value={roomText[r.id].good} onChange={setRoom(r.id, "good")} />
              <Field id={`defect-${r.id}`} label="불량 수확" unit="kg" kind="kg" value={roomText[r.id].defect} onChange={setRoom(r.id, "defect")} />
              <Field
                id={`temp-${r.id}`}
                label="온도"
                unit="℃"
                kind="temperature"
                value={roomText[r.id].temperature}
                onChange={setRoom(r.id, "temperature")}
              />
              <Field id={`hum-${r.id}`} label="습도" unit="%" kind="humidity" value={roomText[r.id].humidity} onChange={setRoom(r.id, "humidity")} />
            </CardContent>
          </Card>
        ))
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            <Label htmlFor="memo" className="text-lg">
              메모
            </Label>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            id="memo"
            className="min-h-24 text-base"
            maxLength={1000}
            placeholder="그날 특이사항"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </CardContent>
      </Card>

      <Button className="h-12 text-base" disabled={pending} onClick={save}>
        {pending ? "저장 중…" : "저장"}
      </Button>
      {hasSaved && (
        <Button variant="ghost" className="h-11 text-base text-destructive" disabled={pending} onClick={() => setConfirmDelete(true)}>
          이 날 기록 지우기
        </Button>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{formatDayLabel(date)} 기록을 지울까요?</AlertDialogTitle>
            <AlertDialogDescription>배양·호실·메모가 모두 지워지고 되돌릴 수 없어요.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">그만두기</AlertDialogCancel>
            <AlertDialogAction
              className="h-11"
              variant="destructive"
              onClick={() =>
                run(() => deleteDay(date), {
                  success: "지웠어요",
                  onSuccess: () => {
                    // 화면 칸도 비운다(같은 날짜라 편집기가 새로 만들어지지 않는다)
                    setBottled("");
                    setInoculated("");
                    setContaminated("");
                    setMemo("");
                    setRoomText((prev) =>
                      Object.fromEntries(Object.keys(prev).map((id) => [id, { good: "", defect: "", temperature: "", humidity: "" }])),
                    );
                    router.refresh();
                  },
                })
              }
            >
              지우기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
