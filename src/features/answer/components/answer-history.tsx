"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import { useAction } from "@/shared/hooks/use-action";
import { formatKstMdHm } from "@/shared/lib/date";
import { addPhrase, setDrawShared } from "@/features/answer/actions";
import type { DrawView } from "@/features/answer/queries";

// 펼친 기록. 내 기록은 「상대에게 보여 주기」를 켜고 끈다.
export function AnswerHistory({ draws }: { draws: DrawView[] }) {
  const { pending, run } = useAction();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">펼친 기록</CardTitle>
        <CardDescription>내 기록과, 상대가 보여 준 기록이에요.</CardDescription>
      </CardHeader>
      <CardContent>
        {draws.length === 0 && <p className="text-muted-foreground">아직 펼친 기록이 없어요.</p>}
        <ul className="flex flex-col divide-y">
          {draws.map((d) => (
            <li key={d.id} className="flex flex-col gap-1 py-3">
              <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>
                  {d.ownerName} · {formatKstMdHm(d.createdAt)}
                </span>
                {d.isMine && (
                  <label className="flex items-center gap-2">
                    보여 주기
                    <Switch
                      checked={d.isShared}
                      disabled={pending}
                      aria-label="상대에게 보여 주기"
                      onCheckedChange={(v) =>
                        run(() => setDrawShared(d.id, v), { success: v ? "상대에게 보여 줘요" : "나만 봐요" })
                      }
                    />
                  </label>
                )}
              </div>
              {d.worry && <p className="text-base text-muted-foreground">「{d.worry}」</p>}
              <p className="text-base font-medium">{d.phrase}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// 둘이 직접 문구 더하기
export function AddPhrase({ ourPhraseCount }: { ourPhraseCount: number }) {
  const { pending, run } = useAction();
  const [body, setBody] = useState("");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">문구 더하기</CardTitle>
        <CardDescription>둘이 더한 문구 {ourPhraseCount.toLocaleString()}개가 책에 섞여 있어요.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => addPhrase(body), { success: "책에 문구를 더했어요", onSuccess: () => setBody("") });
          }}
        >
          <Textarea
            aria-label="더할 문구"
            maxLength={200}
            placeholder="예: 오늘은 맛있는 걸 먹고 다시 생각해 봐요"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button type="submit" variant="outline" className="h-11 text-base" disabled={pending || !body.trim()}>
            더하기
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
