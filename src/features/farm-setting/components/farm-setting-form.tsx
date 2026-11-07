"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { FormRow } from "@/shared/components/form-row";
import { NumberRow } from "@/shared/components/number-row";
import { Segmented } from "@/shared/components/segmented";
import { useAction } from "@/shared/hooks/use-action";
import { messageOf } from "@/shared/messages";
import { PERIODS, type Period } from "@/features/analysis/lib/period";
import { parseNumber } from "@/features/farm-log/lib/value-input";
import { updateFarmSetting } from "@/features/farm-setting/actions";
import type { FarmSetting } from "@/features/farm-setting/types";

const show = (n: number | null) => (n === null ? "" : String(n));
const pctRule: Parameters<typeof parseNumber>[1] = { valueType: "decimal", min: 0, max: 100 };

// 농장 정보·분석 기본값. 관리자만 저장(회원은 보기만).
export function FarmSettingForm({ setting, canEdit }: { setting: FarmSetting; canEdit: boolean }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [farmName, setFarmName] = useState(setting.farmName);
  const [crop, setCrop] = useState(setting.crop);
  const [period, setPeriod] = useState<Period>(setting.defaultPeriod);
  const [target, setTarget] = useState(show(setting.targetDailyKg));
  const [defectWarn, setDefectWarn] = useState(show(setting.defectRateWarnPct));
  const [contamWarn, setContamWarn] = useState(show(setting.contaminationRateWarnPct));

  function save() {
    const targetDailyKg = parseNumber(target, { valueType: "decimal", min: 0, max: null });
    const defectRateWarnPct = parseNumber(defectWarn, pctRule);
    const contaminationRateWarnPct = parseNumber(contamWarn, pctRule);
    if (targetDailyKg === undefined || defectRateWarnPct === undefined || contaminationRateWarnPct === undefined) {
      toast.error(messageOf("SETTING_INVALID"));
      return;
    }
    run(
      () => updateFarmSetting({ farmName, crop, defaultPeriod: period, targetDailyKg, defectRateWarnPct, contaminationRateWarnPct }),
      { success: "저장했어요", onSuccess: () => router.refresh() },
    );
  }

  const disabled = !canEdit || pending;
  return (
    <>
      {!canEdit && <p className="text-sm text-muted-foreground">관리자만 바꿀 수 있어요. 지금 값을 보여 드려요.</p>}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <FormRow id="farm-name" label="농장 이름" hint="기록 화면 위에 보여요">
            <Input id="farm-name" className="h-11 text-base" maxLength={30} value={farmName} disabled={disabled} onChange={(e) => setFarmName(e.target.value)} />
          </FormRow>
          <FormRow id="crop" label="품종">
            <Input id="crop" className="h-11 text-base" maxLength={30} placeholder="예: 새송이" value={crop} disabled={disabled} onChange={(e) => setCrop(e.target.value)} />
          </FormRow>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <FormRow label="분석 기본 기간" hint="분석 화면을 열면 먼저 보이는 기간">
            <Segmented label="분석 기본 기간" options={PERIODS} value={period} onChange={setPeriod} disabled={disabled} />
          </FormRow>
          <NumberRow id="target" label="하루 목표 수확" unit="kg" hint="비우면 목표 비교를 안 보여요" value={target} onChange={setTarget} disabled={disabled} />
          <NumberRow id="defect-warn" label="불량률 경고 기준" unit="%" hint="이 값을 넘으면 분석 화면에 경고 색" value={defectWarn} onChange={setDefectWarn} disabled={disabled} />
          <NumberRow id="contam-warn" label="오염률 경고 기준" unit="%" value={contamWarn} onChange={setContamWarn} disabled={disabled} />
        </CardContent>
      </Card>
      {canEdit && (
        <Button className="h-12 text-base" disabled={pending} onClick={save}>
          {pending ? "저장 중…" : "저장"}
        </Button>
      )}
    </>
  );
}
