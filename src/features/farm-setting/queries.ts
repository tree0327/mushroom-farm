import "server-only";
import type { MemberContext } from "@/shared/lib/member";
import { num } from "@/shared/lib/db-value";
import type { FarmSetting } from "@/features/farm-setting/types";

export async function getFarmSetting({ supabase }: MemberContext): Promise<FarmSetting> {
  const { data, error } = await supabase
    .from("mf_farm_setting")
    .select("farm_name, crop, default_period, target_daily_kg, defect_rate_warn_pct, contamination_rate_warn_pct")
    .single();
  if (error) throw error;
  return {
    farmName: data.farm_name,
    crop: data.crop,
    defaultPeriod: data.default_period,
    targetDailyKg: num(data.target_daily_kg),
    defectRateWarnPct: num(data.defect_rate_warn_pct),
    contaminationRateWarnPct: num(data.contamination_rate_warn_pct),
  };
}
