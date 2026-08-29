import { getSql } from "@/lib/db";
import type { RoomDetail, RoomMember } from "@/lib/types";

type DbRoom = {
  id: string;
  title: string;
  topic: string;
  host_id: string | null;
  is_live: boolean;
};

export async function loadMembers(roomId: string): Promise<RoomMember[]> {
  const sql = await getSql();
  const rows = await sql<{
    user_id: string;
    role: string;
    seat: number | null;
    muted: boolean;
    display_name: string | null;
    avatar_hue: number | null;
  }>`
    select m.user_id, m.role, m.seat, m.muted, p.display_name, p.avatar_hue
    from room_members m
    left join profiles p on p.user_id = m.user_id
    where m.room_id = ${roomId}
    order by m.joined_at
  `;
  return rows.map((r) => ({
    userId: r.user_id,
    displayName: r.display_name || "Star",
    avatarHue: Number(r.avatar_hue ?? 320),
    role: (r.role as RoomMember["role"]) || "listener",
    seat: r.seat === null || r.seat === undefined ? null : Number(r.seat),
    muted: Boolean(r.muted),
  }));
}

export async function loadRoomDetail(id: string): Promise<RoomDetail> {
  const sql = await getSql();
  const rows = await sql<DbRoom>`
    select id, title, topic, host_id, is_live from rooms where id = ${id} limit 1
  `;
  const room = rows[0];
  if (!room) throw new Error("Room not found");
  return {
    id: room.id,
    title: room.title,
    topic: room.topic,
    hostId: room.host_id,
    isLive: Boolean(room.is_live),
    members: await loadMembers(room.id),
  };
}
