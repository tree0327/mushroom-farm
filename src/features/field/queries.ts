import "server-only";
import type { MemberContext } from "@/shared/lib/member";
import { num } from "@/shared/lib/db-value";
import type { Field, FieldRole } from "@/features/field/types";

// 모든 항목(꺼진 것 포함)과 보기. 순서: sort_order, id.
export async function getFields({ supabase }: MemberContext): Promise<Field[]> {
  const [fields, options] = await Promise.all([
    supabase
      .from("mf_field")
      .select("id, scope, role, name, value_type, unit, min_value, max_value, warn_min, warn_max, summary, sort_order, is_active")
      .order("sort_order")
      .order("id"),
    supabase.from("mf_field_option").select("id, field_id, label, sort_order, is_active").order("sort_order").order("id"),
  ]);
  if (fields.error) throw fields.error;
  if (options.error) throw options.error;
  return fields.data.map((f) => ({
    id: Number(f.id),
    scope: f.scope,
    role: f.role,
    name: f.name,
    valueType: f.value_type,
    unit: f.unit,
    min: num(f.min_value),
    max: num(f.max_value),
    warnMin: num(f.warn_min),
    warnMax: num(f.warn_max),
    summary: f.summary,
    sortOrder: f.sort_order,
    isActive: f.is_active,
    options: options.data
      .filter((o) => Number(o.field_id) === Number(f.id))
      .map((o) => ({ id: Number(o.id), label: o.label, sortOrder: o.sort_order, isActive: o.is_active })),
  }));
}

// 기본 항목 role → id
export const roleIds = (fields: Field[]): Partial<Record<FieldRole, number>> =>
  Object.fromEntries(fields.flatMap((f) => (f.role ? [[f.role, f.id]] : [])));
