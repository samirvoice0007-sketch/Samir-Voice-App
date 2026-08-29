import { getCollection } from "@/lib/db";
import type { ProfileDoc } from "@/lib/profile-core";
import type { RoomDetail, RoomMember } from "@/lib/types";

export type RoomDoc = {
  _id: string;
  title: string;
  topic: string;
  hostId: string | null;
  isLive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type RoomMemberDoc = {
  _id: string;
  roomId: string;
  userId: string;
  role: "host" | "speaker" | "listener";
  seat: number | null;
  muted: boolean;
  joinedAt: Date;
};

export async function loadMembers(roomId: string): Promise<RoomMember[]> {
  const members = await getCollection<RoomMemberDoc>("roomMembers");
  const profiles = await getCollection<ProfileDoc>("profiles");
  const rows = await members.find({ roomId }).sort({ joinedAt: 1 }).toArray();
  const profileById = new Map(
    (await profiles.find({ _id: { $in: rows.map((m) => m.userId) } }).toArray()).map((p) => [p._id, p]),
  );
  return rows.map((r) => {
    const p = profileById.get(r.userId);
    return {
      userId: r.userId,
      displayName: p?.displayName || "Star",
      avatarHue: Number(p?.avatarHue ?? 320),
      role: r.role || "listener",
      seat: r.seat === null || r.seat === undefined ? null : Number(r.seat),
      muted: Boolean(r.muted),
    };
  });
}

export async function loadRoomDetail(id: string): Promise<RoomDetail> {
  const rooms = await getCollection<RoomDoc>("rooms");
  const room = await rooms.findOne({ _id: id });
  if (!room) throw new Error("Room not found");
  return {
    id: room._id,
    title: room.title,
    topic: room.topic,
    hostId: room.hostId,
    isLive: Boolean(room.isLive),
    members: await loadMembers(room._id),
  };
}
