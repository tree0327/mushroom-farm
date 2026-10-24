"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { createClient } from "@/shared/lib/supabase/server";
import { fail, okVoid, type Result } from "@/shared/lib/result";

// 아이디만 쓰면 기본 도메인을 붙인다(옛 앱과 같은 계정을 그대로 쓴다).
const DEFAULT_DOMAIN = "@home.local";
const toEmail = (id: string) => (id.includes("@") ? id : id + DEFAULT_DOMAIN);

const loginInput = z.object({ id: z.string().trim().min(1).max(100), password: z.string().min(1).max(200) });

export async function signIn(id: string, password: string): Promise<Result> {
  const input = loginInput.safeParse({ id, password });
  if (!input.success) return fail("LOGIN_FAILED");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: toEmail(input.data.id), password: input.data.password });
  if (error) return fail("LOGIN_FAILED");

  // 계정은 있어도 회원 표에 없으면 들이지 않는다
  const { data: me } = await supabase.from("member").select("id").limit(1);
  if (!me || me.length === 0) {
    await supabase.auth.signOut();
    return fail("NOT_MEMBER");
  }
  return okVoid();
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// 비밀번호 바꾸기: 지금 비밀번호를 한 번 더 확인한 뒤 바꾼다(열어 둔 폰을 남이 집어도 못 바꾸게).
// Supabase 가 6자 미만을 거절한다(weak_password) — 화면도 같은 하한을 쓴다.
const PASSWORD_MIN = 6;

export async function changePassword(current: string, next: string, confirm: string): Promise<Result> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email;
  if (!email) return fail("UNAUTHENTICATED");

  if (next.length < PASSWORD_MIN || next.length > 200) return fail("PASSWORD_SHORT");
  if (next !== confirm) return fail("PASSWORD_MISMATCH");
  if (next === current) return fail("PASSWORD_SAME");

  // 확인용은 쿠키를 건드리지 않는 따로 된 연결로 — 지금 로그인 상태를 바꾸지 않는다.
  const check = createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: wrong } = await check.auth.signInWithPassword({ email, password: current });
  if (wrong) return fail("PASSWORD_WRONG");
  await check.auth.signOut({ scope: "local" });

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    if (error.code === "weak_password") return fail("PASSWORD_SHORT");
    if (error.code === "same_password") return fail("PASSWORD_SAME");
    return fail("UNKNOWN");
  }
  return okVoid();
}
