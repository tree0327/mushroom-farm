"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { useAction } from "@/shared/hooks/use-action";
import { addMember, removeMember } from "@/features/member/actions";

type Row = { id: number; email: string; isAdmin: boolean };

export function MemberManager({ members }: { members: Row[] }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [email, setEmail] = useState("");

  return (
    <>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addMember(email), {
            success: "계정을 더했어요",
            onSuccess: () => {
              setEmail("");
              router.refresh();
            },
          });
        }}
      >
        <Input
          aria-label="더할 구글 이메일"
          type="email"
          className="h-11 flex-1 text-base"
          placeholder="name@gmail.com"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" className="h-11 px-4 text-base" disabled={pending}>
          더하기
        </Button>
      </form>

      <Card className="py-0">
        <CardContent className="px-0">
          <ul className="divide-y">
            {members.map((m) => (
              <li key={m.id} className="flex min-h-14 items-center gap-2 px-4 py-2">
                <span className="flex-1 text-base break-all">{m.email}</span>
                {m.isAdmin ? (
                  <span className="text-sm text-muted-foreground">관리자</span>
                ) : (
                  <Button
                    variant="ghost"
                    className="h-11 text-base text-destructive"
                    disabled={pending}
                    onClick={() => run(() => removeMember(m.id), { success: "뺐어요", onSuccess: () => router.refresh() })}
                  >
                    빼기
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        여기 있는 구글 계정만 로그인할 수 있어요. 뺀 계정은 다음 화면부터 쓸 수 없어요.
      </p>
    </>
  );
}
