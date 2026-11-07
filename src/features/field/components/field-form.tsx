"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
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
import { FormRow } from "@/shared/components/form-row";
import { Segmented } from "@/shared/components/segmented";
import { useAction } from "@/shared/hooks/use-action";
import { messageOf } from "@/shared/messages";
import { parseNumber } from "@/features/farm-log/lib/value-input";
import { NumberRow } from "@/shared/components/number-row";
import { createField, deleteField, updateField, type FieldInput } from "@/features/field/actions";
import { isNumeric, SUMMARIES, VALUE_TYPES, valueTypeLabel, type Field, type FieldScope, type FieldSummary, type ValueType } from "@/features/field/types";

const show = (n: number | null) => (n === null ? "" : String(n));
const anyNumber: Parameters<typeof parseNumber>[1] = { valueType: "decimal", min: null, max: null };

// 항목 만들기·고치기. 종류와 농장/호실은 만들 때만 고른다(값이 쌓이면 바꿀 수 없다).
export function FieldForm({ scope, field, canEdit }: { scope: FieldScope; field: Field | null; canEdit: boolean }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [name, setName] = useState(field?.name ?? "");
  const [valueType, setValueType] = useState<ValueType>(field?.valueType ?? "int");
  const [unit, setUnit] = useState(field?.unit ?? "");
  const [min, setMin] = useState(show(field?.min ?? null));
  const [max, setMax] = useState(show(field?.max ?? null));
  const [warnMin, setWarnMin] = useState(show(field?.warnMin ?? null));
  const [warnMax, setWarnMax] = useState(show(field?.warnMax ?? null));
  const [summary, setSummary] = useState<FieldSummary>(field?.summary ?? "sum");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const numeric = isNumeric(valueType);
  const disabled = !canEdit || pending;

  function save() {
    const bounds = [min, max, warnMin, warnMax].map((t) => parseNumber(t, anyNumber));
    const [nMin, nMax, nWarnMin, nWarnMax] = bounds;
    if (nMin === undefined || nMax === undefined || nWarnMin === undefined || nWarnMax === undefined) {
      toast.error(messageOf("FIELD_INVALID"));
      return;
    }
    const input: FieldInput = { name, unit, min: nMin, max: nMax, warnMin: nWarnMin, warnMax: nWarnMax, summary: numeric ? summary : "none" };
    if (field) {
      run(() => updateField(field.id, input), { success: "저장했어요", onSuccess: () => router.refresh() });
    } else {
      run(() => createField(scope, valueType, input), {
        success: valueType === "choice" ? "만들었어요. 이제 보기를 더해 주세요" : "만들었어요",
        onSuccess: (id) => router.replace(valueType === "choice" ? `/more/fields/${id}` : "/more/fields"),
      });
    }
  }

  return (
    <>
      {!canEdit && <p className="text-sm text-muted-foreground">관리자만 바꿀 수 있어요. 지금 설정을 보여 드려요.</p>}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <FormRow id="field-name" label="이름" hint="1~20자. 같은 묶음에 같은 이름은 안 돼요">
            <Input id="field-name" className="h-11 text-base" maxLength={20} value={name} disabled={disabled} onChange={(e) => setName(e.target.value)} />
          </FormRow>
          <FormRow label="종류" hint={field ? "종류는 만든 뒤 바꿀 수 없어요" : "숫자(정수·소수)는 합계·평균·경고, 선택은 횟수, 글은 기록만"}>
            {field ? (
              <p className="text-base">{valueTypeLabel(field.valueType)}</p>
            ) : (
              <Segmented label="종류" options={VALUE_TYPES} value={valueType} onChange={setValueType} disabled={disabled} />
            )}
          </FormRow>
          {valueType !== "choice" && (
            <FormRow id="field-unit" label="단위" hint="예: kg, ℃, 병 (비워도 돼요)">
              <Input id="field-unit" className="h-11 text-base" maxLength={10} value={unit} disabled={disabled} onChange={(e) => setUnit(e.target.value)} />
            </FormRow>
          )}
        </CardContent>
      </Card>

      {numeric && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <NumberRow id="min" label="입력 최솟값" unit={unit} value={min} onChange={setMin} disabled={disabled} />
              <NumberRow id="max" label="입력 최댓값" unit={unit} value={max} onChange={setMax} disabled={disabled} />
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">이 범위 밖 값은 저장되지 않아요. 비우면 제한 없음.</p>
            <div className="grid grid-cols-2 gap-3">
              <NumberRow id="warn-min" label="경고 아래 기준" unit={unit} value={warnMin} onChange={setWarnMin} disabled={disabled} />
              <NumberRow id="warn-max" label="경고 위 기준" unit={unit} value={warnMax} onChange={setWarnMax} disabled={disabled} />
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">이 범위를 벗어나면 기록·목록·분석에 경고 색으로 보여요. 저장은 돼요.</p>
            <FormRow label="분석 카드">
              <Segmented label="분석 카드" options={SUMMARIES} value={summary} onChange={setSummary} disabled={disabled} />
            </FormRow>
          </CardContent>
        </Card>
      )}

      {canEdit && (
        <Button className="h-12 text-base" disabled={pending} onClick={save}>
          {pending ? "저장 중…" : field ? "저장" : "만들기"}
        </Button>
      )}
      {canEdit && field && !field.role && (
        <Button variant="ghost" className="h-11 text-base text-destructive" disabled={pending} onClick={() => setConfirmDelete(true)}>
          이 항목 지우기
        </Button>
      )}

      {field && (
        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>「{field.name}」 항목을 지울까요?</AlertDialogTitle>
              <AlertDialogDescription>기록이 있는 항목은 지울 수 없어요. 그럴 때는 목록에서 스위치를 꺼 주세요.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="h-11">그만두기</AlertDialogCancel>
              <AlertDialogAction
                className="h-11"
                variant="destructive"
                onClick={() => run(() => deleteField(field.id), { success: "지웠어요", onSuccess: () => router.replace("/more/fields") })}
              >
                지우기
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
