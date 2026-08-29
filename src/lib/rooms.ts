import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getCollection } from "@/lib/db";
import { giftById } from "@/lib/gifts";
import { newId } from "@/lib/ids";
import { ensureProfileRow } from "@/lib/profile-core";
import { loadRoomDetail, type RoomDoc, type RoomMemberDoc } from "@/lib/room-core";
import type { ChatMessage, RoomDetail, RoomSummary } from "@/lib/types";

type MessageDoc = {
  _id: string;
  roomId: string;
  userId: string;
  body: string;
  kind: "chat" | "gift";
  giftId: string | null;
  createdAt: Date;
};

type GiftSendDoc = {
  _id: string;
  roomId: string;
  fromId: string;
  toId: string;
  giftId: string;
  cost: number;
  createdAt: Date;
};

const SEED = [
  { id: "rose", title: "Rose Lounge", topic: "Late night talks · রাতের গল্প" },
  { id: "party", title: "GF BF Party", topic: "Flirty party room · পার্টি রুম" },
  { id: "music", title: "Music Night", topic: "Sing & vibe · গান আর আড্ডা" },
];

async function seedRooms() {
  const rooms = await getCollection<RoomDoc>("rooms");
  const existing = await rooms.find({}).limit(1).toArray();
  if (existing.length) return;
  const now = new Date();
  for (const r of SEED) {
    const found = await rooms.findOne({ _id: r.id });
    if (found) continue;
    await rooms.insertOne({
      _id: r.id,
      title: r.title,
      topic: r.topic,
      hostId: null,
      isLive: true,
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function memberCount(roomId: string) {
  const members = await getCollection<RoomMemberDoc>("roomMembers");
  const rows = await members.find({ roomId }).toArray();
  return {
    people: rows.length,
    speakers: rows.filter((m) => m.role !== "listener").length,
  };
}

export const listRooms = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<RoomSummary[]> => {
    await seedRooms();
    const rooms = await getCollection<RoomDoc>("rooms");
    const live = await rooms.find({ isLive: true }).sort({ updatedAt: -1 }).limit(50).toArray();
    const out: RoomSummary[] = [];
    for (const r of live) {
      const c = await memberCount(r._id);
      out.push({
        id: r._id,
        title: r.title,
        topic: r.topic,
        hostId: r.hostId,
        people: c.people,
        speakers: c.speakers,
        isLive: Boolean(r.isLive),
      });
    }
    return out;
  });

export const createRoom = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { title: string; topic?: string }) => d)
  .handler(async ({ context, data }): Promise<RoomSummary> => {
    await ensureProfileRow(context.userId);
    const title = String(data.title || "").trim().slice(0, 48);
    const topic = String(data.topic || "").trim().slice(0, 80);
    if (title.length < 2) throw new Error("Title required");
    const id = newId("r");
    const now = new Date();
    const rooms = await getCollection<RoomDoc>("rooms");
    await rooms.insertOne({
      _id: id,
      title,
      topic,
      hostId: context.userId,
      isLive: true,
      createdAt: now,
      updatedAt: now,
    });
    const members = await getCollection<RoomMemberDoc>("roomMembers");
    await members.insertOne({
      _id: `${id}:${context.userId}`,
      roomId: id,
      userId: context.userId,
      role: "host",
      seat: 0,
      muted: false,
      joinedAt: now,
    });
    return { id, title, topic, hostId: context.userId, people: 1, speakers: 1, isLive: true };
  });

export const getRoom = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<RoomDetail> => {
    return loadRoomDetail(data.id);
  });

export const joinRoom = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }): Promise<RoomDetail> => {
    await ensureProfileRow(context.userId);
    const rooms = await getCollection<RoomDoc>("rooms");
    const room = await rooms.findOne({ _id: data.id });
    if (!room || !room.isLive) throw new Error("Room not found");
    const members = await getCollection<RoomMemberDoc>("roomMembers");
    await members.updateOne(
      { _id: `${room._id}:${context.userId}` },
      {
        $setOnInsert: {
          roomId: room._id,
          userId: context.userId,
          role: "listener",
          seat: null,
          muted: true,
          joinedAt: new Date(),
        },
      },
      { upsert: true },
    );
    await rooms.updateOne({ _id: room._id }, { $set: { updatedAt: new Date() } });
    return loadRoomDetail(room._id);
  });

export const leaveRoom = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const members = await getCollection<RoomMemberDoc>("roomMembers");
    await members.deleteOne({ _id: `${data.id}:${context.userId}` });
    const remaining = await members.find({ roomId: data.id }).toArray();
    const rooms = await getCollection<RoomDoc>("rooms");
    if (remaining.length === 0) {
      await rooms.updateOne({ _id: data.id }, { $set: { isLive: false, updatedAt: new Date() } });
    } else {
      await rooms.updateOne({ _id: data.id }, { $set: { updatedAt: new Date() } });
    }
    return { ok: true };
  });

export const takeSeat = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; seat: number }) => d)
  .handler(async ({ context, data }): Promise<RoomDetail> => {
    const seat = Number(data.seat);
    if (!Number.isInteger(seat) || seat < 0 || seat > 7) throw new Error("Invalid seat");
    const members = await getCollection<RoomMemberDoc>("roomMembers");
    const taken = await members.findOne({ roomId: data.id, seat });
    if (taken && taken.userId !== context.userId) throw new Error("Seat taken");
    const me = await members.findOne({ _id: `${data.id}:${context.userId}` });
    if (!me) throw new Error("Join room first");
    await members.updateOne(
      { _id: `${data.id}:${context.userId}` },
      [
        {
          $set: {
            role: { $cond: [{ $eq: ["$role", "host"] }, "host", "speaker"] },
            seat,
            muted: false,
          },
        },
      ],
    );
    return loadRoomDetail(data.id);
  });

export const setMuted = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; muted: boolean }) => d)
  .handler(async ({ context, data }): Promise<{ muted: boolean }> => {
    const members = await getCollection<RoomMemberDoc>("roomMembers");
    await members.updateOne(
      { _id: `${data.id}:${context.userId}` },
      { $set: { muted: Boolean(data.muted) } },
    );
    return { muted: Boolean(data.muted) };
  });

export const kickMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; userId: string }) => d)
  .handler(async ({ context, data }): Promise<RoomDetail> => {
    const rooms = await getCollection<RoomDoc>("rooms");
    const room = await rooms.findOne({ _id: data.id });
    if (!room) throw new Error("Room not found");
    if (room.hostId !== context.userId) throw new Error("Host only");
    const members = await getCollection<RoomMemberDoc>("roomMembers");
    await members.deleteOne({ _id: `${data.id}:${data.userId}` });
    return loadRoomDetail(data.id);
  });

export const listMessages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<ChatMessage[]> => {
    const messages = await getCollection<MessageDoc>("messages");
    const rows = await messages.find({ roomId: data.id }).sort({ createdAt: -1 }).limit(50).toArray();
    const { loadProfileRow } = await import("@/lib/profile-core");
    const out: ChatMessage[] = [];
    for (const r of rows.slice().reverse()) {
      const p = await loadProfileRow(r.userId);
      out.push({
        id: r._id,
        userId: r.userId,
        displayName: p?.displayName || "Star",
        body: r.body,
        kind: r.kind === "gift" ? "gift" : "chat",
        giftId: r.giftId,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      });
    }
    return out;
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; body: string }) => d)
  .handler(async ({ context, data }): Promise<ChatMessage> => {
    const body = String(data.body || "").trim().slice(0, 280);
    if (!body) throw new Error("Empty message");
    const id = newId("m");
    const messages = await getCollection<MessageDoc>("messages");
    const createdAt = new Date();
    await messages.insertOne({
      _id: id,
      roomId: data.id,
      userId: context.userId,
      body,
      kind: "chat",
      giftId: null,
      createdAt,
    });
    const { loadProfileRow } = await import("@/lib/profile-core");
    const p = await loadProfileRow(context.userId);
    return {
      id,
      userId: context.userId,
      displayName: p?.displayName || "Star",
      body,
      kind: "chat",
      giftId: null,
      createdAt: createdAt.toISOString(),
    };
  });

export const sendGift = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; giftId: string; toUser: string }) => d)
  .handler(async ({ context, data }): Promise<{ coins: number; message: ChatMessage }> => {
    const gift = giftById(data.giftId);
    if (!gift) throw new Error("Unknown gift");
    if (!data.toUser || data.toUser === context.userId) throw new Error("Pick someone else");
    const { loadProfileRow } = await import("@/lib/profile-core");
    const profiles = await getCollection<import("@/lib/profile-core").ProfileDoc>("profiles");
    const me = await loadProfileRow(context.userId);
    if (!me) throw new Error("Profile missing");
    if (Number(me.coins) < gift.cost) throw new Error("Not enough coins");
    const target = await loadProfileRow(data.toUser);
    if (!target) throw new Error("User not found");
    const charm = Math.floor(gift.cost * 0.4);
    const debited = await profiles.updateOne(
      { _id: context.userId, coins: { $gte: gift.cost } },
      { $inc: { coins: -gift.cost, xp: 5 } },
    );
    if (debited.matchedCount === 0) throw new Error("Not enough coins");
    await profiles.updateOne({ _id: data.toUser }, { $inc: { charm, coins: charm } });
    const myCoins = Number(me.coins) - gift.cost;
    const gid = newId("g");
    const mid = newId("m");
    const createdAt = new Date();
    const giftSends = await getCollection<GiftSendDoc>("giftSends");
    await giftSends.insertOne({
      _id: gid,
      roomId: data.id,
      fromId: context.userId,
      toId: data.toUser,
      giftId: gift.id,
      cost: gift.cost,
      createdAt,
    });
    const messages = await getCollection<MessageDoc>("messages");
    await messages.insertOne({
      _id: mid,
      roomId: data.id,
      userId: context.userId,
      body: gift.id,
      kind: "gift",
      giftId: gift.id,
      createdAt,
    });
    return {
      coins: myCoins,
      message: {
        id: mid,
        userId: context.userId,
        displayName: me.displayName,
        body: gift.id,
        kind: "gift",
        giftId: gift.id,
        emoji: gift.emoji,
        toUser: data.toUser,
        toName: target.displayName,
        createdAt: createdAt.toISOString(),
      },
    };
  });
