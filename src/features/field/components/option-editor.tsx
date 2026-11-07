"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Pencil, Trash } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { useAction } from "@/shared/hooks/use-action";
import { addOption, deleteOption, moveOption, renameOption, setOptionActive } from "@/features/field/actions";
import type { FieldOption } from "@/features/field/types";

// 선택형 항목의 보기 편집(호실 관리와 같은 모양)
export function OptionEditor({ fieldId, options, canEdit }: { fieldId: number; options: FieldOption[]; canEdit: boolean }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [label, setLabel] = useState("");
  const [editing, setEditing] = useState<{ id: number; label: string } | null>(null);
  const refresh = () => router.refresh();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">보기</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {canEdit && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => addOption(fieldId, label), {
                success: "보기를 더했어요",
                onSuccess: () => {
                  setLabel("");
                  refresh();
                },
              });
            }}
          >
            <Input
              aria-label="새 보기 이름"
              className="h-11 flex-1 text-base"
              placeholder="예: 좋음"
              maxLength={20}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <Button type="submit" className="h-11 px-4 text-base" disabled={pending}>
              더하기
            </Button>
          </form>
        )}
        {options.length === 0 ? (
          <p className="text-base text-muted-foreground">아직 보기가 없어요.</p>
        ) : (
          <ul className="-mx-6 divide-y">
            {options.map((o, i) => (
              <li key={o.id} className="flex flex-col gap-2 px-6 py-2">
                {editing?.id === o.id ? (
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(() => renameOption(o.id, editing.label), {
                        success: "이름을 바꿨어요",
                        onSuccess: () => {
                          setEditing(null);
                          refresh();
                        },
                      });
                    }}
                  >
                    <Input
                      aria-label={`${o.label} 새 이름`}
                      className="h-11 flex-1 text-base"
                      maxLength={20}
                      autoFocus
                      value={editing.label}
                      onChange={(e) => setEditing({ id: o.id, label: e.target.value })}
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
                    <span className={o.isActive ? "flex-1 text-base" : "flex-1 text-base text-muted-foreground"}>
                      {o.label}
                      {!o.isActive && <span className="ml-2 text-sm">꺼짐</span>}
                    </span>
                    {canEdit && (
                      <>
                        <Button variant="ghost" className="size-11" aria-label={`${o.label} 위로`} disabled={pending || i === 0}
                          onClick={() => run(() => moveOption(o.id, "up"), { onSuccess: refresh })}>
                          <ArrowUp className="size-5" aria-hidden />
                        </Button>
                        <Button variant="ghost" className="size-11" aria-label={`${o.label} 아래로`} disabled={pending || i === options.length - 1}
                          onClick={() => run(() => moveOption(o.id, "down"), { onSuccess: refresh })}>
                          <ArrowDown className="size-5" aria-hidden />
                        </Button>
                        <Button variant="ghost" className="size-11" aria-label={`${o.label} 이름 바꾸기`} onClick={() => setEditing({ id: o.id, label: o.label })}>
                          <Pencil className="size-5" aria-hidden />
                        </Button>
                        <Button variant="ghost" className="size-11 text-destructive" aria-label={`${o.label} 지우기`} disabled={pending}
                          onClick={() => run(() => deleteOption(o.id), { success: "지웠어요", onSuccess: refresh })}>
                          <Trash className="size-5" aria-hidden />
                        </Button>
                      </>
                    )}
                  </div>
                )}
                {canEdit && (
                  <label className="flex items-center justify-between text-sm text-muted-foreground">
                    기록 화면에 보이기
                    <Switch checked={o.isActive} disabled={pending} onCheckedChange={(v) => run(() => setOptionActive(o.id, v), { onSuccess: refresh })} />
                  </label>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted-foreground">기록에 쓰인 보기는 지울 수 없어요. 더 쓰지 않으면 꺼 주세요.</p>
      </CardContent>
    </Card>
  );
}
