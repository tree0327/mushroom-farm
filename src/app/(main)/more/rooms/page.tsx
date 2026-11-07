import { PageBody, PageHeader } from "@/shared/components/page-header";
import { getMemberOrRedirect } from "@/shared/lib/member";
import { getRooms } from "@/features/room/queries";
import { RoomManager } from "@/features/room/components/room-manager";

export default async function RoomsPage() {
  const ctx = await getMemberOrRedirect();
  const rooms = await getRooms(ctx);
  return (
    <>
      <PageHeader title="호실" back="/more" />
      <PageBody>
        <RoomManager rooms={rooms} />
      </PageBody>
    </>
  );
}
