"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useAction } from "@/shared/hooks/use-action";
import { changePassword } from "@/features/member/actions";

const FIELDS = [
  { key: "current", label: "지금 비밀번호", autoComplete: "current-password" },
  { key: "next", label: "새 비밀번호 (6자 이상)", autoComplete: "new-password" },
  { key: "confirm", label: "새 비밀번호 확인", autoComplete: "new-password" },
] as const;

export function PasswordForm() {
  const router = useRouter();
  const { pending, run } = useAction();
  const [values, setValues] = useState({ current: "", next: "", confirm: "" });

  return (
    <Card>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => changePassword(values.current, values.next, values.confirm), {
              success: "비밀번호를 바꿨어요",
              onSuccess: () => router.push("/more"),
            });
          }}
        >
          {FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-2">
              <Label htmlFor={`pw-${f.key}`}>{f.label}</Label>
              <Input
                id={`pw-${f.key}`}
                type="password"
                className="h-11"
                autoComplete={f.autoComplete}
                maxLength={200}
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                required
              />
            </div>
          ))}
          <Button type="submit" className="h-12 text-base" disabled={pending}>
            {pending ? "바꾸는 중…" : "바꾸기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
