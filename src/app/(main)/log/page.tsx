import { z } from "zod";
import { PageBody, PageHeader } from "@/shared/components/page-header";
import { getMemberOrRedirect } from "@/shared/lib/member";
import { kstYmd } from "@/shared/lib/date";
import { getFields } from "@/features/field/queries";
import { getRooms } from "@/features/room/queries";
import { getFarmSetting } from "@/features/farm-setting/queries";
import { getDay } from "@/features/farm-log/queries";
import { LogEditor } from "@/features/farm-log/components/log-editor";

export default async function LogPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const ctx = await getMemberOrRedirect();
  const today = kstYmd();
  const { date: raw } = await searchParams;
  // 주소의 날짜가 틀리거나 앞날이면 오늘
  const parsed = z.iso.date().safeParse(raw);
  const date = parsed.success && parsed.data <= today ? parsed.data : today;

  const [fields, rooms, entry, setting] = await Promise.all([getFields(ctx), getRooms(ctx), getDay(ctx, date), getFarmSetting(ctx)]);
  // 꺼진 항목·「안 씀」 호실은 빼되, 그날 값이 있으면 보여 준다(고치거나 지울 수 있게)
  const saved = Object.keys(entry.cells); // cellKey = "<항목 id>:<호실 id | farm>"
  const fieldHasValue = (id: number) => saved.some((k) => k.startsWith(`${id}:`));
  const roomHasValue = (id: number) => saved.some((k) => k.endsWith(`:${id}`));
  const shown = fields.filter((f) => f.isActive || fieldHasValue(f.id));

  return (
    <>
      <PageHeader title="기록">
        {setting.farmName && <span className="text-sm text-muted-foreground">{setting.farmName}</span>}
      </PageHeader>
      <PageBody>
        <LogEditor
          key={date}
          date={date}
          today={today}
          farmFields={shown.filter((f) => f.scope === "farm")}
          roomFields={shown.filter((f) => f.scope === "room")}
          rooms={rooms.filter((r) => r.isActive || roomHasValue(r.id))}
          entry={entry}
        />
      </PageBody>
    </>
  );
}
