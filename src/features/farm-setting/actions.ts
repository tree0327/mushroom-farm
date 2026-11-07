"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/shared/lib/member";
import { codeFromDbError, fail, okVoid, type Result } from "@/shared/lib/result";
import type { FarmSetting } from "@/features/farm-setting/types";

const pct = z.number().min(0).max(100).nullable();
const settingInput = z.object({
  farmName: z.string().trim().max(30),
  crop: z.string().trim().max(30),
  defaultPeriod: z.enum(["1w", "1m", "3m", "6m", "1y"]),
  targetDailyKg: z.number().min(0).max(99_999_999.9).nullable(),
  defectRateWarnPct: pct,
  contaminationRateWarnPct: pct,
});

export async function updateFarmSetting(input: FarmSetting): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const parsed = settingInput.safeParse(input);
  if (!parsed.success) return fail("SETTING_INVALID");
  const s = parsed.data;
  const { data, error } = await auth.supabase
    .from("mf_farm_setting")
    .update({
      farm_name: s.farmName,
      crop: s.crop,
      default_period: s.defaultPeriod,
      target_daily_kg: s.targetDailyKg,
      defect_rate_warn_pct: s.defectRateWarnPct,
      contamination_rate_warn_pct: s.contaminationRateWarnPct,
    })
    .eq("id", 1)
    .select("id");
  if (error) return fail(error.code === "23514" ? "SETTING_INVALID" : codeFromDbError(error));
  if (!data?.length) return fail("FORBIDDEN");
  revalidatePath("/", "layout");
  return okVoid();
}
