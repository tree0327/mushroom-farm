"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMember } from "@/shared/lib/member";
import { codeFromDbError, fail, okVoid, type Result } from "@/shared/lib/result";

const nameInput = z.string().trim().min(1).max(20);
const idInput = z.number().int().positive();

function roomError(error: { code?: string }) {
  if (error.code === "23505") return fail("ROOM_DUPLICATE");
  if (error.code === "23503") return fail("ROOM_IN_USE");
  return fail(codeFromDbError(error));
}

function done(): Result {
  revalidatePath("/", "layout");
  return okVoid();
}

export async function addRoom(name: string): Promise<Result> {
  const auth = await requireMember();
  if (!auth.ok) return auth;
  const parsed = nameInput.safeParse(name);
  if (!parsed.success) return fail("ROOM_NAME");

  // 새 호실은 맨 뒤
  const { data: last } = await auth.supabase
    .from("room")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const { error } = await auth.supabase
    .from("room")
    .insert({ name: parsed.data, sort_order: (last?.[0]?.sort_order ?? 0) + 1 });
  if (error) return roomError(error);
  return done();
}

export async function renameRoom(id: number, name: string): Promise<Result> {
  const auth = await requireMember();
  if (!auth.ok) return auth;
  const parsed = nameInput.safeParse(name);
  if (!parsed.success || !idInput.safeParse(id).success) return fail("ROOM_NAME");
  const { data, error } = await auth.supabase.from("room").update({ name: parsed.data }).eq("id", id).select("id");
  if (error) return roomError(error);
  if (!data?.length) return fail("NOT_FOUND");
  return done();
}

export async function setRoomActive(id: number, isActive: boolean): Promise<Result> {
  const auth = await requireMember();
  if (!auth.ok) return auth;
  if (!idInput.safeParse(id).success) return fail("INVALID_INPUT");
  const { data, error } = await auth.supabase.from("room").update({ is_active: isActive }).eq("id", id).select("id");
  if (error) return roomError(error);
  if (!data?.length) return fail("NOT_FOUND");
  return done();
}

// 위·아래 호실과 순서를 바꾼다
export async function moveRoom(id: number, direction: "up" | "down"): Promise<Result> {
  const auth = await requireMember();
  if (!auth.ok) return auth;
  const { data: rooms, error } = await auth.supabase.from("room").select("id, sort_order").order("sort_order").order("id");
  if (error) return roomError(error);
  const i = (rooms ?? []).findIndex((r) => Number(r.id) === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || !rooms || j < 0 || j >= rooms.length) return okVoid();

  // 순서 값이 같은 호실이 있어도 바뀌게 목록 위치로 다시 매긴다
  const order = rooms.map((r) => Number(r.id));
  [order[i], order[j]] = [order[j], order[i]];
  for (const [k, roomId] of order.entries()) {
    const { error: e } = await auth.supabase.from("room").update({ sort_order: k + 1 }).eq("id", roomId);
    if (e) return roomError(e);
  }
  return done();
}

export async function deleteRoom(id: number): Promise<Result> {
  const auth = await requireMember();
  if (!auth.ok) return auth;
  if (!idInput.safeParse(id).success) return fail("INVALID_INPUT");
  const { data, error } = await auth.supabase.from("room").delete().eq("id", id).select("id");
  if (error) return roomError(error);
  if (!data?.length) return fail("NOT_FOUND");
  return done();
}
