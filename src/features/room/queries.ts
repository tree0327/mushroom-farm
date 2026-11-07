import "server-only";
import type { MemberContext } from "@/shared/lib/member";
import type { Room } from "@/features/room/types";

export async function getRooms({ supabase }: MemberContext): Promise<Room[]> {
  const { data, error } = await supabase.from("mf_room").select("id, name, sort_order, is_active").order("sort_order").order("id");
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: Number(r.id), name: r.name, sortOrder: r.sort_order, isActive: r.is_active }));
}
