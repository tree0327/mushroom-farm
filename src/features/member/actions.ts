"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/shared/lib/supabase/server";
import { requireMember } from "@/shared/lib/member";
import { codeFromDbError, fail, okVoid, type Result } from "@/shared/lib/result";

// 구글 로그인 시작: 구글 화면으로 보낸다. 돌아오면 /auth/callback 이 등록된 계정인지 가른다.
export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient();
  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback`, queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) redirect("/login?e=UNKNOWN");
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// 계정(로그인할 수 있는 구글 이메일) 더하기·빼기 — 관리자만. DB RLS 도 같은 규칙으로 막는다.
const emailInput = z.string().trim().toLowerCase().pipe(z.email().max(200));

export async function addMember(email: string): Promise<Result> {
  const auth = await requireMember();
  if (!auth.ok) return auth;
  if (!auth.me.isAdmin) return fail("ADMIN_ONLY");
  const parsed = emailInput.safeParse(email);
  if (!parsed.success) return fail("EMAIL_INVALID");

  const { error } = await auth.supabase.from("mf_member").insert({ email: parsed.data });
  if (error) return fail(error.code === "23505" ? "EMAIL_DUPLICATE" : codeFromDbError(error));
  revalidatePath("/more/members");
  return okVoid();
}

export async function removeMember(id: number): Promise<Result> {
  const auth = await requireMember();
  if (!auth.ok) return auth;
  if (!auth.me.isAdmin) return fail("ADMIN_ONLY");
  if (id === auth.me.id) return fail("MEMBER_SELF");

  const { data, error } = await auth.supabase.from("mf_member").delete().eq("id", id).select("id");
  if (error) return fail(codeFromDbError(error));
  if (!data || data.length === 0) return fail("NOT_FOUND");
  revalidatePath("/more/members");
  return okVoid();
}
