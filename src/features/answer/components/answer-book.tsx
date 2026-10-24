"use client";

import { useState } from "react";
import { BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { useAction } from "@/shared/hooks/use-action";
import { withSubject } from "@/shared/lib/korean";
import { drawAnswer, type DrawResult } from "@/features/answer/actions";

// 고민을 떠올리고 [펼치기] → 책이 펼쳐지며 문구 하나.
export function AnswerBook({ phraseCount }: { phraseCount: number }) {
  const { pending, run } = useAction();
  const [worry, setWorry] = useState("");
  const [result, setResult] = useState<DrawResult | null>(null);

  return (
    <Card className="bg-accent/60">
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="worry" className="text-base font-medium">
            고민을 떠올려 주세요
          </label>
          <Input
            id="worry"
            className="h-11 bg-card"
            maxLength={200}
            placeholder="적지 않고 마음속으로만 떠올려도 돼요"
            value={worry}
            onChange={(e) => setWorry(e.target.value)}
          />
        </div>

        <div className="flex min-h-48 items-center justify-center rounded-xl bg-card p-6 [perspective:800px]">
          {result ? (
            <div key={result.drawId} className="flex flex-col items-center gap-3 text-center animate-in fade-in zoom-in-95 duration-700">
              <Sparkles className="size-5 text-primary" aria-hidden />
              <p className="text-2xl leading-snug font-bold break-keep">{result.body}</p>
              {result.authorName && <p className="text-sm text-muted-foreground">{withSubject(result.authorName)} 쓴 문구</p>}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <BookOpen className="size-12" aria-hidden />
              <p>책장 {phraseCount.toLocaleString()}쪽이 기다리고 있어요</p>
            </div>
          )}
        </div>

        <Button
          className="h-12 text-lg"
          disabled={pending}
          onClick={() => run(() => drawAnswer(worry), { onSuccess: (r) => setResult(r) })}
        >
          {pending ? "펼치는 중…" : result ? "다시 펼치기" : "펼치기"}
        </Button>
      </CardContent>
    </Card>
  );
}
