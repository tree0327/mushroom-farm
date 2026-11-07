import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { Field } from "@/features/field/types";
import { cellKey } from "@/features/farm-log/types";
import { FieldInput } from "@/features/farm-log/components/field-input";

// 항목 묶음 카드(농장 항목 하나 또는 호실 하나). roomId 가 null 이면 농장 항목.
export function FieldsCard({
  title,
  note,
  fields,
  roomId,
  drafts,
  onChange,
}: {
  title: string;
  note?: string;
  fields: Field[];
  roomId: number | null;
  drafts: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {title}
          {note && <span className="ml-2 text-sm font-normal text-muted-foreground">{note}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {fields.map((f) => {
          const key = cellKey(f.id, roomId);
          return <FieldInput key={key} id={`f-${key}`} field={f} value={drafts[key] ?? ""} onChange={(v) => onChange(key, v)} />;
        })}
      </CardContent>
    </Card>
  );
}
