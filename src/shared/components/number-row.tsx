import { Input } from "@/shared/ui/input";
import { FormRow } from "@/shared/components/form-row";

// 설정 화면 숫자 칸(오른쪽에 단위)
export function NumberRow({
  id,
  label,
  unit,
  hint,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  unit: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <FormRow id={id} label={label} hint={hint}>
      <div className="relative">
        <Input
          id={id}
          className="h-11 pr-12 text-right text-base tabular-nums"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">{unit}</span>
      </div>
    </FormRow>
  );
}
