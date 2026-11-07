import type { Period } from "@/features/analysis/lib/period";

// 농장 설정 한 줄(DB mf_farm_setting). null = 안 정함.
export type FarmSetting = {
  farmName: string;
  crop: string;
  defaultPeriod: Period;
  targetDailyKg: number | null; // 하루 목표 수확(정품+불량)
  defectRateWarnPct: number | null; // 불량률이 이 %를 넘으면 경고
  contaminationRateWarnPct: number | null;
};
