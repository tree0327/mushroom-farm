"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { useAction } from "@/shared/hooks/use-action";
import type { Result } from "@/shared/lib/result";

// 일기·답장 공통 글쓰기 칸. 저장하면 서버가 화면을 새로 그린다.
export function DiaryEditor({
  initial,
  placeholder,
  maxLength,
  saveAction,
  label,
}: {
  initial: string;
  placeholder: string;
  maxLength: number;
  saveAction: (body: string) => Promise<Result>;
  label: string;
}) {
  const { pending, run } = useAction();
  const [body, setBody] = useState(initial);
  const changed = body.trim() !== initial.trim();

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveAction(body), { success: "저장했어요" });
      }}
    >
      <Textarea
        aria-label={label}
        className="min-h-40 text-base leading-relaxed"
        placeholder={placeholder}
        maxLength={maxLength}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {body.length.toLocaleString()} / {maxLength.toLocaleString()}
        </span>
        <Button type="submit" className="h-11 px-6 text-base" disabled={pending || !changed || !body.trim()}>
          {pending ? "저장 중…" : initial ? "고치기" : "저장"}
        </Button>
      </div>
    </form>
  );
}
