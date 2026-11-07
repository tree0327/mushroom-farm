"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/shared/lib/member";
import { codeFromDbError, fail, ok, okVoid, type Result } from "@/shared/lib/result";
import { swapOrder } from "@/shared/lib/reorder";
import { isNumeric, type FieldScope, type FieldSummary, type ValueType } from "@/features/field/types";

const idInput = z.number().int().positive();
const bound = z.number().finite().nullable();
const lte = (a: number | null, b: number | null) => a === null || b === null || a <= b;

const fieldInput = z
  .object({
    name: z.string().trim().min(1).max(20),
    unit: z.string().trim().max(10),
    min: bound,
    max: bound,
    warnMin: bound,
    warnMax: bound,
    summary: z.enum(["sum", "avg", "none"]),
  })
  .refine((f) => lte(f.min, f.max) && lte(f.warnMin, f.warnMax));
export type FieldInput = z.input<typeof fieldInput>;

const newFieldInput = z.object({
  scope: z.enum(["farm", "room"]),
  valueType: z.enum(["int", "decimal", "choice", "text"]),
});

const labelInput = z.string().trim().min(1).max(20);

function fieldError(error: { code?: string }) {
  if (error.code === "23505") return fail("FIELD_DUPLICATE");
  if (error.code === "23503") return fail("FIELD_IN_USE");
  if (error.code === "23514") return fail("FIELD_INVALID");
  return fail(codeFromDbError(error));
}

function optionError(error: { code?: string }) {
  if (error.code === "23505") return fail("OPTION_DUPLICATE");
  if (error.code === "23503") return fail("OPTION_IN_USE");
  return fail(codeFromDbError(error));
}

function done(): Result {
  revalidatePath("/", "layout");
  return okVoid();
}

// 숫자가 아닌 항목은 범위·경고·합계를 비운다(DB mf_field_numeric_only_ck)
function columns(f: z.output<typeof fieldInput>, valueType: ValueType) {
  const numeric = isNumeric(valueType);
  const summary: FieldSummary = numeric ? f.summary : "none";
  return {
    name: f.name,
    unit: f.unit,
    min_value: numeric ? f.min : null,
    max_value: numeric ? f.max : null,
    warn_min: numeric ? f.warnMin : null,
    warn_max: numeric ? f.warnMax : null,
    summary,
  };
}

export async function createField(scope: FieldScope, valueType: ValueType, input: FieldInput): Promise<Result<number>> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const kind = newFieldInput.safeParse({ scope, valueType });
  const parsed = fieldInput.safeParse(input);
  if (!kind.success) return fail("INVALID_INPUT");
  if (!parsed.success) return fail(parsed.error.issues.some((i) => i.path[0] === "name") ? "FIELD_NAME" : "FIELD_INVALID");

  // 새 항목은 그 묶음 맨 뒤
  const { data: last } = await auth.supabase
    .from("mf_field")
    .select("sort_order")
    .eq("scope", kind.data.scope)
    .order("sort_order", { ascending: false })
    .limit(1);
  const { data, error } = await auth.supabase
    .from("mf_field")
    .insert({
      scope: kind.data.scope,
      value_type: kind.data.valueType,
      sort_order: (last?.[0]?.sort_order ?? 0) + 1,
      ...columns(parsed.data, kind.data.valueType),
    })
    .select("id")
    .single();
  if (error) return fieldError(error);
  revalidatePath("/", "layout");
  return ok(Number(data.id));
}

export async function updateField(id: number, input: FieldInput): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const parsed = fieldInput.safeParse(input);
  if (!idInput.safeParse(id).success) return fail("INVALID_INPUT");
  if (!parsed.success) return fail(parsed.error.issues.some((i) => i.path[0] === "name") ? "FIELD_NAME" : "FIELD_INVALID");

  const { data: current, error: readError } = await auth.supabase.from("mf_field").select("value_type").eq("id", id).maybeSingle();
  if (readError) return fieldError(readError);
  if (!current) return fail("NOT_FOUND");
  const { data, error } = await auth.supabase.from("mf_field").update(columns(parsed.data, current.value_type)).eq("id", id).select("id");
  if (error) return fieldError(error);
  if (!data?.length) return fail("NOT_FOUND");
  return done();
}

export async function setFieldActive(id: number, isActive: boolean): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  if (!idInput.safeParse(id).success) return fail("INVALID_INPUT");
  const { data, error } = await auth.supabase.from("mf_field").update({ is_active: isActive }).eq("id", id).select("id");
  if (error) return fieldError(error);
  if (!data?.length) return fail("NOT_FOUND");
  return done();
}

// 같은 묶음(농장/호실) 안에서 위·아래 항목과 순서를 바꾼다
export async function moveField(id: number, direction: "up" | "down"): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const { data: me, error: meError } = await auth.supabase.from("mf_field").select("scope").eq("id", id).maybeSingle();
  if (meError) return fieldError(meError);
  if (!me) return fail("NOT_FOUND");
  const { data: rows, error } = await auth.supabase.from("mf_field").select("id").eq("scope", me.scope).order("sort_order").order("id");
  if (error) return fieldError(error);
  const order = swapOrder((rows ?? []).map((r) => Number(r.id)), id, direction);
  if (!order) return okVoid();
  for (const [k, fieldId] of order.entries()) {
    const { error: e } = await auth.supabase.from("mf_field").update({ sort_order: k + 1 }).eq("id", fieldId);
    if (e) return fieldError(e);
  }
  return done();
}

export async function deleteField(id: number): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  if (!idInput.safeParse(id).success) return fail("INVALID_INPUT");
  const { data: current } = await auth.supabase.from("mf_field").select("role").eq("id", id).maybeSingle();
  if (current?.role) return fail("FIELD_LOCKED");
  const { data, error } = await auth.supabase.from("mf_field").delete().eq("id", id).select("id");
  if (error) return fieldError(error);
  if (!data?.length) return fail("NOT_FOUND");
  return done();
}

export async function addOption(fieldId: number, label: string): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const parsed = labelInput.safeParse(label);
  if (!idInput.safeParse(fieldId).success) return fail("INVALID_INPUT");
  if (!parsed.success) return fail("OPTION_NAME");
  const { data: last } = await auth.supabase
    .from("mf_field_option")
    .select("sort_order")
    .eq("field_id", fieldId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const { error } = await auth.supabase
    .from("mf_field_option")
    .insert({ field_id: fieldId, label: parsed.data, sort_order: (last?.[0]?.sort_order ?? 0) + 1 });
  if (error) return optionError(error);
  return done();
}

export async function renameOption(id: number, label: string): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const parsed = labelInput.safeParse(label);
  if (!idInput.safeParse(id).success) return fail("INVALID_INPUT");
  if (!parsed.success) return fail("OPTION_NAME");
  const { data, error } = await auth.supabase.from("mf_field_option").update({ label: parsed.data }).eq("id", id).select("id");
  if (error) return optionError(error);
  if (!data?.length) return fail("NOT_FOUND");
  return done();
}

export async function setOptionActive(id: number, isActive: boolean): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  if (!idInput.safeParse(id).success) return fail("INVALID_INPUT");
  const { data, error } = await auth.supabase.from("mf_field_option").update({ is_active: isActive }).eq("id", id).select("id");
  if (error) return optionError(error);
  if (!data?.length) return fail("NOT_FOUND");
  return done();
}

export async function moveOption(id: number, direction: "up" | "down"): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const { data: me, error: meError } = await auth.supabase.from("mf_field_option").select("field_id").eq("id", id).maybeSingle();
  if (meError) return optionError(meError);
  if (!me) return fail("NOT_FOUND");
  const { data: rows, error } = await auth.supabase
    .from("mf_field_option")
    .select("id")
    .eq("field_id", me.field_id)
    .order("sort_order")
    .order("id");
  if (error) return optionError(error);
  const order = swapOrder((rows ?? []).map((r) => Number(r.id)), id, direction);
  if (!order) return okVoid();
  for (const [k, optionId] of order.entries()) {
    const { error: e } = await auth.supabase.from("mf_field_option").update({ sort_order: k + 1 }).eq("id", optionId);
    if (e) return optionError(e);
  }
  return done();
}

export async function deleteOption(id: number): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  if (!idInput.safeParse(id).success) return fail("INVALID_INPUT");
  const { data, error } = await auth.supabase.from("mf_field_option").delete().eq("id", id).select("id");
  if (error) return optionError(error);
  if (!data?.length) return fail("NOT_FOUND");
  return done();
}
