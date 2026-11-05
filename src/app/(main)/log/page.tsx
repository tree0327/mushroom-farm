import { z } from "zod";
import { PageBody, PageHeader } from "@/shared/components/page-header";
import { getMemberOrRedirect } from "@/shared/lib/member";
import { kstYmd } from "@/shared/lib/date";
import { getDay, getRooms } from "@/features/farm-log/queries";
import { LogEditor } from "@/features/farm-log/components/log-editor";

export default async function LogPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const ctx = await getMemberOrRedirect();
  const today = kstYmd();
  const { date: raw } = await searchParams;
  // 주소의 날짜가 틀리거나 앞날이면 오늘
  const date = z.iso.date().safeParse(raw).success && raw! <= today ? raw! : today;

  const [rooms, entry] = await Promise.all([getRooms(ctx), getDay(ctx, date)]);
  // 「안 씀」 호실은 빼되, 그날 기록이 있으면 보여 준다(고치거나 지울 수 있게)
  const shown = rooms.filter((r) => r.isActive || entry.rooms[r.id]);

  return (
    <>
      <PageHeader title="기록" />
      <PageBody>
        <LogEditor key={date} date={date} today={today} rooms={shown} entry={entry} />
      </PageBody>
    </>
  );
}
