"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useAction } from "@/shared/hooks/use-action";
import { signIn } from "@/features/member/actions";

export function LoginForm() {
  const router = useRouter();
  const { pending, run } = useAction();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => signIn(id, password), { onSuccess: () => router.replace("/diary") });
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="login-id">아이디</Label>
        <Input
          id="login-id"
          className="h-11"
          placeholder="아이디 또는 이메일"
          autoComplete="username"
          autoCapitalize="none"
          value={id}
          onChange={(e) => setId(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="login-password">비밀번호</Label>
        <Input
          id="login-password"
          className="h-11"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="h-11 text-base" disabled={pending}>
        {pending ? "로그인 중…" : "로그인"}
      </Button>
    </form>
  );
}
