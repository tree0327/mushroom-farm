import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

export function MemoCard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          <Label htmlFor="memo" className="text-lg">
            메모
          </Label>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          id="memo"
          className="min-h-24 text-base"
          maxLength={1000}
          placeholder="그날 특이사항"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </CardContent>
    </Card>
  );
}
