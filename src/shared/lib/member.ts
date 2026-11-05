import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { fail, type Failure } from "@/shared/lib/result";

export type Member = {
  id: number;
  email: string;
  isAdmin: boolean;
};

type Supabase = Awaited<ReturnType<typeof createClient>>;
export type MemberContext = { supabase: Supabase; me: Member };

// 한 요청 안에서 한 번만 읽는다(React cache).
const loadContext = cache(async (): Promise<{ supabase: Supabase; uid: string | null; ctx: MemberContext | null }> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub ?? null;
  const email = (data?.claims?.email as string | undefined)?.toLowerCase();
  if (!uid) return { supabase, uid: null, ctx: null };

  // 회원이 아니면 RLS 가 member 를 0행으로 돌려준다. 회원 판정의 기준은 DB(app.current_member_id)다.
  const { data: rows } = await supabase.from("member").select("id, email, is_admin");
  const row = (rows ?? []).find((m) => m.email === email);
  if (!row) return { supabase, uid, ctx: null };
  return { supabase, uid, ctx: { supabase, me: { id: Number(row.id), email: row.email, isAdmin: row.is_admin } } };
});

// 서버 액션 첫 줄: const auth = await requireMember(); if (!auth.ok) return auth;
export async function requireMember(): Promise<Failure | ({ ok: true } & MemberContext)> {
  const { uid, ctx } = await loadContext();
  if (!uid) return fail("UNAUTHENTICATED");
  if (!ctx) return fail("NOT_MEMBER");
  return { ok: true, ...ctx };
}

// 화면(서버 컴포넌트)용: 로그인 안 했거나 회원이 아니면 로그인 화면으로.
export async function getMemberOrRedirect(): Promise<MemberContext> {
  const { uid, ctx } = await loadContext();
  if (!uid) redirect("/login");
  if (!ctx) redirect("/login?e=NOT_MEMBER");
  return ctx;
}
