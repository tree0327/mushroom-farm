"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Switch } from "@/shared/ui/switch";
import { useAction } from "@/shared/hooks/use-action";
import { moveField, setFieldActive } from "@/features/field/actions";
import { SCOPES, valueTypeLabel, type Field } from "@/features/field/types";

// 입력 항목 목록: 농장 항목 / 호실 항목. 관리자는 순서·켜기·더하기, 회원은 보기만.
export function FieldList({ fields, canEdit }: { fields: Field[]; canEdit: boolean }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const refresh = () => router.refresh();

  return (
    <>
      {!canEdit && <p className="text-sm text-muted-foreground">관리자만 바꿀 수 있어요. 항목을 눌러 설정을 볼 수 있어요.</p>}
      {SCOPES.map((scope) => {
        const list = fields.filter((f) => f.scope === scope.key);
        return (
          <Card key={scope.key} className="gap-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                {scope.label}
                <span className="ml-2 text-sm font-normal text-muted-foreground">{scope.note}</span>
              </CardTitle>
              {canEdit && (
                <Button asChild variant="ghost" className="h-11 gap-1 px-2 text-base text-primary">
                  <Link href={`/more/fields/new?scope=${scope.key}`}>
                    <Plus className="size-5" aria-hidden />
                    더하기
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent className="px-0">
              {list.length === 0 ? (
                <p className="px-6 text-base text-muted-foreground">아직 항목이 없어요.</p>
              ) : (
                <ul className="divide-y">
                  {list.map((f, i) => (
                    <li key={f.id} className="flex items-center gap-1 px-4 py-2">
                      <Link href={`/more/fields/${f.id}`} className="flex min-h-11 flex-1 items-center gap-2">
                        <span className={f.isActive ? "text-base" : "text-base text-muted-foreground"}>{f.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {valueTypeLabel(f.valueType)}
                          {f.unit && ` · ${f.unit}`}
                          {f.role && " · 기본"}
                          {!f.isActive && " · 꺼짐"}
                        </span>
                        <ChevronRight className="ml-auto size-5 text-muted-foreground" aria-hidden />
                      </Link>
                      {canEdit && (
                        <>
                          <Button variant="ghost" className="size-11" aria-label={`${f.name} 위로`} disabled={pending || i === 0}
                            onClick={() => run(() => moveField(f.id, "up"), { onSuccess: refresh })}>
                            <ArrowUp className="size-5" aria-hidden />
                          </Button>
                          <Button variant="ghost" className="size-11" aria-label={`${f.name} 아래로`} disabled={pending || i === list.length - 1}
                            onClick={() => run(() => moveField(f.id, "down"), { onSuccess: refresh })}>
                            <ArrowDown className="size-5" aria-hidden />
                          </Button>
                          <Switch
                            aria-label={`${f.name} 기록 화면에 보이기`}
                            checked={f.isActive}
                            disabled={pending}
                            onCheckedChange={(v) => run(() => setFieldActive(f.id, v), { onSuccess: refresh })}
                          />
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
      <p className="text-sm text-muted-foreground">
        스위치를 끄면 기록 화면에서 숨겨요. 지난 기록은 그대로 남고 분석에도 남아요. 기본 항목은 지울 수 없어요.
      </p>
    </>
  );
}
