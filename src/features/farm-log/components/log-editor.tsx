"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { useAction } from "@/shared/hooks/use-action";
import { messageOf } from "@/shared/messages";
import type { Field } from "@/features/field/types";
import type { Room } from "@/features/room/types";
import { deleteDay, saveDay } from "@/features/farm-log/actions";
import { cellKey, type DayEntry } from "@/features/farm-log/types";
import { toCell, toDraft } from "@/features/farm-log/lib/value-input";
import { DayNav } from "@/features/farm-log/components/day-nav";
import { FieldsCard } from "@/features/farm-log/components/fields-card";
import { MemoCard } from "@/features/farm-log/components/memo-card";
import { DeleteDayDialog } from "@/features/farm-log/components/delete-day-dialog";

// 하루 기록 화면: 날짜 → 농장 항목 → 호실마다 호실 항목 → 메모 → 저장
export function LogEditor({
  date,
  today,
  farmFields,
  roomFields,
  rooms,
  entry,
}: {
  date: string;
  today: string;
  farmFields: Field[];
  roomFields: Field[];
  rooms: Room[];
  entry: DayEntry;
}) {
  const router = useRouter();
  const { pending, run } = useAction();
  // 화면에 그리는 모든 칸(항목 × 호실)
  const slots = [
    ...farmFields.map((field) => ({ field, roomId: null })),
    ...rooms.flatMap((r) => roomFields.map((field) => ({ field, roomId: r.id }))),
  ];
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(slots.map((s) => [cellKey(s.field.id, s.roomId), toDraft(entry.cells[cellKey(s.field.id, s.roomId)])])),
  );
  const [memo, setMemo] = useState(entry.memo);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasSaved = entry.memo !== "" || Object.keys(entry.cells).length > 0;
  const setDraft = (key: string, value: string) => setDrafts((prev) => ({ ...prev, [key]: value }));

  function save() {
    const cells = slots.map((s) => ({ ...s, cell: toCell(s.field, drafts[cellKey(s.field.id, s.roomId)] ?? "") }));
    if (cells.some((c) => c.cell === undefined)) {
      toast.error(messageOf("LOG_INVALID"));
      return;
    }
    run(
      () =>
        saveDay({
          date,
          memo,
          cells: cells.map(({ field, roomId, cell }) => ({
            fieldId: field.id,
            roomId,
            num: cell?.num ?? null,
            optionId: cell?.optionId ?? null,
            text: cell?.text ?? null,
          })),
        }),
      { success: "저장했어요", onSuccess: () => router.refresh() },
    );
  }

  const go = (d: string) => router.push(d === today ? "/log" : `/log?date=${d}`);

  return (
    <>
      <DayNav date={date} today={today} go={go} />

      {farmFields.length > 0 && <FieldsCard title="농장" fields={farmFields} roomId={null} drafts={drafts} onChange={setDraft} />}

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
        roomFields.length > 0 &&
        rooms.map((r) => (
          <FieldsCard
            key={r.id}
            title={r.name}
            note={r.isActive ? undefined : "안 씀"}
            fields={roomFields}
            roomId={r.id}
            drafts={drafts}
            onChange={setDraft}
          />
        ))
      )}

      <MemoCard value={memo} onChange={setMemo} />

      <Button className="h-12 text-base" disabled={pending} onClick={save}>
        {pending ? "저장 중…" : "저장"}
      </Button>
      {hasSaved && (
        <Button variant="ghost" className="h-11 text-base text-destructive" disabled={pending} onClick={() => setConfirmDelete(true)}>
          이 날 기록 지우기
        </Button>
      )}

      <DeleteDayDialog
        date={date}
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onConfirm={() =>
          run(() => deleteDay(date), {
            success: "지웠어요",
            onSuccess: () => {
              // 화면 칸도 비운다(같은 날짜라 편집기가 새로 만들어지지 않는다)
              setDrafts((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, ""])));
              setMemo("");
              router.refresh();
            },
          })
        }
      />
    </>
  );
}
