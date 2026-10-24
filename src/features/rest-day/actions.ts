"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMember } from "@/shared/lib/member";
import { codeFromDbError, fail, okVoid, type Result } from "@/shared/lib/result";

// 화면에서 먼저 막고(관리자만), DB RLS 가 한 번 더 막는다.
async function requireAdmin() {
  const auth = await requireMember();
  if (!auth.ok) return auth;
  if (!auth.me.isAdmin) return fail("ADMIN_ONLY");
  return auth;
}

function refresh() {
  revalidatePath("/more/rest-days");
  revalidatePath("/diary");
}

export async function setWeekendRest(isWeekendRest: boolean): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const { error } = await auth.supabase
    .from("app_setting")
    .update({ is_weekend_rest: z.boolean().parse(isWeekendRest) })
    .eq("id", 1);
  if (error) return fail(codeFromDbError(error));
  refresh();
  return okVoid();
}

const restInput = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), memo: z.string().trim().max(50) });

export async function addRestDay(date: string, memo: string): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const input = restInput.safeParse({ date, memo });
  if (!input.success) return fail("INVALID_INPUT");
  const { error } = await auth.supabase.from("rest_day").insert({ rest_date: input.data.date, memo: input.data.memo });
  if (error) return fail(codeFromDbError(error));
  refresh();
  return okVoid();
}

export async function removeRestDay(id: number): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const { error } = await auth.supabase.from("rest_day").delete().eq("id", z.number().int().positive().parse(id));
  if (error) return fail(codeFromDbError(error));
  refresh();
  return okVoid();
}
