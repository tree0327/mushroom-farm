"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Pencil, Trash } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { useAction } from "@/shared/hooks/use-action";
import { addRoom, deleteRoom, moveRoom, renameRoom, setRoomActive } from "@/features/room/actions";
import type { Room } from "@/features/room/types";

export function RoomManager({ rooms }: { rooms: Room[] }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const refresh = () => router.refresh();

  return (
    <>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addRoom(name), {
            success: "호실을 더했어요",
            onSuccess: () => {
              setName("");
              refresh();
            },
          });
        }}
      >
        <Input
          aria-label="새 호실 이름"
          className="h-11 flex-1 text-base"
          placeholder="예: 1호실"
          maxLength={20}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" className="h-11 px-4 text-base" disabled={pending}>
          더하기
        </Button>
      </form>

      {rooms.length === 0 ? (
        <p className="text-base text-muted-foreground">아직 호실이 없어요. 위에서 이름을 써서 더해 주세요.</p>
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <ul className="divide-y">
              {rooms.map((r, i) => (
                <li key={r.id} className="flex flex-col gap-2 px-4 py-3">
                  {editing?.id === r.id ? (
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        run(() => renameRoom(r.id, editing.name), {
                          success: "이름을 바꿨어요",
                          onSuccess: () => {
                            setEditing(null);
                            refresh();
                          },
                        });
                      }}
                    >
                      <Input
                        aria-label={`${r.name} 새 이름`}
                        className="h-11 flex-1 text-base"
                        maxLength={20}
                        autoFocus
                        value={editing.name}
                        onChange={(e) => setEditing({ id: r.id, name: e.target.value })}
                      />
                      <Button type="submit" className="h-11 text-base" disabled={pending}>
                        저장
                      </Button>
                      <Button type="button" variant="ghost" className="h-11 text-base" onClick={() => setEditing(null)}>
                        취소
                      </Button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className={r.isActive ? "flex-1 text-base" : "flex-1 text-base text-muted-foreground"}>
                        {r.name}
                        {!r.isActive && <span className="ml-2 text-sm">안 씀</span>}
                      </span>
                      <Button variant="ghost" className="size-11" aria-label={`${r.name} 위로`} disabled={pending || i === 0}
                        onClick={() => run(() => moveRoom(r.id, "up"), { onSuccess: refresh })}>
                        <ArrowUp className="size-5" aria-hidden />
                      </Button>
                      <Button variant="ghost" className="size-11" aria-label={`${r.name} 아래로`} disabled={pending || i === rooms.length - 1}
                        onClick={() => run(() => moveRoom(r.id, "down"), { onSuccess: refresh })}>
                        <ArrowDown className="size-5" aria-hidden />
                      </Button>
                      <Button variant="ghost" className="size-11" aria-label={`${r.name} 이름 바꾸기`}
                        onClick={() => setEditing({ id: r.id, name: r.name })}>
                        <Pencil className="size-5" aria-hidden />
                      </Button>
                      <Button variant="ghost" className="size-11 text-destructive" aria-label={`${r.name} 지우기`} disabled={pending}
                        onClick={() => run(() => deleteRoom(r.id), { success: "지웠어요", onSuccess: refresh })}>
                        <Trash className="size-5" aria-hidden />
                      </Button>
                    </div>
                  )}
                  <label className="flex items-center justify-between text-sm text-muted-foreground">
                    기록 화면에 보이기
                    <Switch
                      checked={r.isActive}
                      disabled={pending}
                      onCheckedChange={(v) => run(() => setRoomActive(r.id, v), { onSuccess: refresh })}
                    />
                  </label>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <p className="text-sm text-muted-foreground">
        기록이 있는 호실은 지울 수 없어요. 더 쓰지 않는 호실은 「기록 화면에 보이기」를 꺼 주세요. 지난 기록은 분석에 남아요.
      </p>
    </>
  );
}
