import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getCollection } from "@/lib/db";
import { GIFTS, giftById } from "@/lib/gifts";

export type Profile = {
  userId: string;
  displayName: string;
  avatarHue: number;
  bio: string;
  coins: number;
  charm: number;
  level: number;
  xp: number;
  lang: string;
};

export type RoomCard = {
  id: string;
  hostId: string;
  title: string;
  topic: string;
  people: number;
  speakers: number;
};

export type Member = {
  userId: string;
  displayName: string;
  avatarHue: number;
  role: string;
  seat: number | null;
  muted: boolean;
};

export type ChatMsg = {
  id: string;
  userId: string;
  displayName: string;
  body: string;
  kind: string;
  giftId: string | null;
  createdAt: string;
};

// --- Mongo document shapes (internal — routes/components use the camelCase types above) ---

type ProfileDoc = {
  _id: string; // = userId
  displayName: string;
  avatarHue: number;
  bio: string;
  coins: number;
  charm: number;
  level: number;
  xp: number;
  lang: string;
};

type RoomDoc = {
  _id: string;
  hostId: string;
  title: string;
  topic: string;
  createdAt: Date;
};

type RoomMemberDoc = {
  _id: string; // `${roomId}:${userId}` — doubles as the uniqueness key
  roomId: string;
  userId: string;
  role: "host" | "speaker" | "listener";
  seat: number | null;
  muted: boolean;
  joinedAt: Date;
};

type RoomMessageDoc = {
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
  fromUser: string;
  toUser: string;
  giftId: string;
  cost: number;
  createdAt: Date;
};

type FollowDoc = {
  _id: string; // `${followerId}:${followingId}`
  followerId: string;
  followingId: string;
};

function hueFromId(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n + id.charCodeAt(i) * 17) % 360;
  return n;
}

async function ensureProfile(userId: string, fallbackName: string): Promise<ProfileDoc> {
  const profiles = await getCollection<ProfileDoc>("profiles");
  const existing = await profiles.findOne({ _id: userId });
  if (existing) return existing;
  const doc: ProfileDoc = {
    _id: userId,
    displayName: fallbackName.slice(0, 24) || "Star",
    avatarHue: hueFromId(userId),
    bio: "",
    coins: 0,
    charm: 0,
    level: 1,
    xp: 0,
    lang: "bn",
  };
  // Two concurrent first-requests for the same brand-new user could both
  // reach here; ignore a duplicate-key error rather than crash the request.
  try {
    await profiles.insertOne(doc);
  } catch (err) {
    const existingAfterRace = await profiles.findOne({ _id: userId });
    if (existingAfterRace) return existingAfterRace;
    throw err;
  }
  return doc;
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const p = await ensureProfile(context.userId, "Star");
    const profile: Profile = {
      userId: p._id,
      displayName: p.displayName,
      avatarHue: p.avatarHue,
      bio: p.bio,
      coins: p.coins,
      charm: p.charm,
      level: p.level,
      xp: p.xp,
      lang: p.lang,
    };
    return profile;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      displayName: z.string().min(1).max(24),
      bio: z.string().max(140),
      lang: z.enum(["bn", "en"]),
    }),
  )
  .handler(async ({ context, data }) => {
    const profiles = await getCollection<ProfileDoc>("profiles");
    await profiles.updateOne(
      { _id: context.userId },
      { $set: { displayName: data.displayName, bio: data.bio, lang: data.lang } },
    );
    return { ok: true as const };
  });

export const claimDaily = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureProfile(context.userId, "Star");
    const key = `daily:${new Date().toISOString().slice(0, 10)}`;
    const gifts = await getCollection<GiftSendDoc>("giftSends");
    const already = await gifts.findOne({ fromUser: context.userId, giftId: key });
    if (already) return { ok: false as const, coins: 0 };
    await gifts.insertOne({
      _id: randomUUID(),
      roomId: "system",
      fromUser: context.userId,
      toUser: context.userId,
      giftId: key,
      cost: 0,
      createdAt: new Date(),
    });
    const profiles = await getCollection<ProfileDoc>("profiles");
    await profiles.updateOne({ _id: context.userId }, { $inc: { coins: 50, xp: 10 } });
    return { ok: true as const, coins: 50 };
  });

export const listRooms = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const rooms = await getCollection<RoomDoc>("rooms");
    const rows = await rooms
      .aggregate<{
        _id: string;
        hostId: string;
        title: string;
        topic: string;
        people: number;
        speakers: number;
      }>([
        {
          $lookup: {
            from: "roomMembers",
            localField: "_id",
            foreignField: "roomId",
            as: "members",
          },
        },
        {
          $addFields: {
            people: { $size: "$members" },
            speakers: {
              $size: { $filter: { input: "$members", cond: { $ne: ["$$this.role", "listener"] } } },
            },
          },
        },
        { $sort: { people: -1, createdAt: -1 } },
        { $project: { hostId: 1, title: 1, topic: 1, people: 1, speakers: 1 } },
      ])
      .toArray();
    return rows.map(
      (r): RoomCard => ({
        id: r._id,
        hostId: r.hostId,
        title: r.title,
        topic: r.topic,
        people: r.people,
        speakers: r.speakers,
      }),
    );
  });

export const createRoom = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ title: z.string().min(2).max(40), topic: z.string().max(80) }))
  .handler(async ({ context, data }) => {
    await ensureProfile(context.userId, "Star");
    const id = randomUUID();
    const rooms = await getCollection<RoomDoc>("rooms");
    await rooms.insertOne({ _id: id, hostId: context.userId, title: data.title, topic: data.topic, createdAt: new Date() });
    const members = await getCollection<RoomMemberDoc>("roomMembers");
    await members.insertOne({
      _id: `${id}:${context.userId}`,
      roomId: id,
      userId: context.userId,
      role: "host",
      seat: 0,
      muted: false,
      joinedAt: new Date(),
    });
    return { id };
  });

export const getRoom = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ roomId: z.string() }))
  .handler(async ({ data }) => {
    const rooms = await getCollection<RoomDoc>("rooms");
    const room = await rooms.findOne({ _id: data.roomId });
    if (!room) return null;

    const members = await getCollection<RoomMemberDoc>("roomMembers");
    const profiles = await getCollection<ProfileDoc>("profiles");
    const memberDocs = await members
      .find({ roomId: data.roomId })
      .sort({ seat: 1, joinedAt: 1 })
      .toArray();
    const profileById = new Map(
      (await profiles.find({ _id: { $in: memberDocs.map((m) => m.userId) } }).toArray()).map((p) => [p._id, p]),
    );

    return {
      id: room._id,
      hostId: room.hostId,
      title: room.title,
      topic: room.topic,
      members: memberDocs.map((m): Member => {
        const p = profileById.get(m.userId);
        return {
          userId: m.userId,
          displayName: p?.displayName ?? "Star",
          avatarHue: p?.avatarHue ?? 320,
          role: m.role,
          seat: m.seat,
          muted: m.muted,
        };
      }),
    };
  });

export const joinRoom = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ roomId: z.string() }))
  .handler(async ({ context, data }) => {
    await ensureProfile(context.userId, "Star");
    const rooms = await getCollection<RoomDoc>("rooms");
    const room = await rooms.findOne({ _id: data.roomId });
    if (!room) throw new Error("Room not found");
    const members = await getCollection<RoomMemberDoc>("roomMembers");
    await members.updateOne(
      { _id: `${data.roomId}:${context.userId}` },
      {
        $setOnInsert: {
          roomId: data.roomId,
          userId: context.userId,
          role: "listener",
          seat: null,
          muted: true,
          joinedAt: new Date(),
        },
      },
      { upsert: true },
    );
    return { ok: true as const };
  });

export const leaveRoom = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ roomId: z.string() }))
  .handler(async ({ context, data }) => {
    const members = await getCollection<RoomMemberDoc>("roomMembers");
    await members.deleteOne({ _id: `${data.roomId}:${context.userId}` });
    return { ok: true as const };
  });

export const takeSeat = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ roomId: z.string(), seat: z.number().int().min(0).max(7) }))
  .handler(async ({ context, data }) => {
    const members = await getCollection<RoomMemberDoc>("roomMembers");
    const taken = await members.findOne({ roomId: data.roomId, seat: data.seat });
    if (taken && taken.userId !== context.userId) throw new Error("Seat taken");
    await members.updateOne(
      { _id: `${data.roomId}:${context.userId}` },
      [
        {
          $set: {
            role: { $cond: [{ $eq: ["$role", "host"] }, "host", "speaker"] },
            seat: data.seat,
            muted: false,
          },
        },
      ],
    );
    return { ok: true as const };
  });

export const setMuted = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ roomId: z.string(), muted: z.boolean() }))
  .handler(async ({ context, data }) => {
    const members = await getCollection<RoomMemberDoc>("roomMembers");
    await members.updateOne({ _id: `${data.roomId}:${context.userId}` }, { $set: { muted: data.muted } });
    return { ok: true as const };
  });

export const listMessages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ roomId: z.string() }))
  .handler(async ({ data }) => {
    const messages = await getCollection<RoomMessageDoc>("roomMessages");
    const rows = await messages
      .find({ roomId: data.roomId })
      .sort({ createdAt: -1 })
      .limit(40)
      .toArray();
    const profiles = await getCollection<ProfileDoc>("profiles");
    const profileById = new Map(
      (await profiles.find({ _id: { $in: rows.map((r) => r.userId) } }).toArray()).map((p) => [p._id, p]),
    );
    return rows
      .slice()
      .reverse()
      .map(
        (r): ChatMsg => ({
          id: r._id,
          userId: r.userId,
          displayName: profileById.get(r.userId)?.displayName ?? "Star",
          body: r.body,
          kind: r.kind,
          giftId: r.giftId,
          createdAt: r.createdAt.toISOString(),
        }),
      );
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ roomId: z.string(), body: z.string().min(1).max(240) }))
  .handler(async ({ context, data }) => {
    const id = randomUUID();
    const messages = await getCollection<RoomMessageDoc>("roomMessages");
    await messages.insertOne({
      _id: id,
      roomId: data.roomId,
      userId: context.userId,
      body: data.body,
      kind: "chat",
      giftId: null,
      createdAt: new Date(),
    });
    return { id };
  });

export const sendGift = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      roomId: z.string(),
      toUser: z.string(),
      giftId: z.string(),
    }),
  )
  .handler(async ({ context, data }) => {
    const gift = giftById(data.giftId);
    if (!gift) throw new Error("Unknown gift");
    if (data.toUser === context.userId) throw new Error("Cannot gift yourself");

    const profiles = await getCollection<ProfileDoc>("profiles");
    const me = await profiles.findOne({ _id: context.userId });
    if (!me || me.coins < gift.cost) throw new Error("Not enough coins");

    // Deduct from the sender only if they still have enough — closes the
    // same race the original SQL had, since Mongo has no cross-document
    // transaction here either; a negative-balance guard on the filter is
    // the cheap fix.
    const debited = await profiles.updateOne(
      { _id: context.userId, coins: { $gte: gift.cost } },
      { $inc: { coins: -gift.cost, xp: 5 } },
    );
    if (debited.matchedCount === 0) throw new Error("Not enough coins");

    const charm = Math.floor(gift.cost * 0.4);
    await profiles.updateOne({ _id: data.toUser }, { $inc: { charm, coins: charm } });

    const giftSends = await getCollection<GiftSendDoc>("giftSends");
    await giftSends.insertOne({
      _id: randomUUID(),
      roomId: data.roomId,
      fromUser: context.userId,
      toUser: data.toUser,
      giftId: gift.id,
      cost: gift.cost,
      createdAt: new Date(),
    });

    const messages = await getCollection<RoomMessageDoc>("roomMessages");
    await messages.insertOne({
      _id: randomUUID(),
      roomId: data.roomId,
      userId: context.userId,
      body: gift.id,
      kind: "gift",
      giftId: gift.id,
      createdAt: new Date(),
    });

    return { ok: true as const, gift };
  });

export const listMyGifts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const giftSends = await getCollection<GiftSendDoc>("giftSends");
    const rows = await giftSends
      .find({
        $and: [
          { $or: [{ fromUser: context.userId }, { toUser: context.userId }] },
          { giftId: { $not: /^daily:/ } },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    return rows.map((r) => ({
      id: r._id,
      giftId: r.giftId,
      cost: r.cost,
      fromUser: r.fromUser,
      toUser: r.toUser,
      createdAt: r.createdAt.toISOString(),
      catalog: GIFTS.find((g) => g.id === r.giftId) ?? null,
    }));
  });

export const toggleFollow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ context, data }) => {
    if (data.userId === context.userId) return { following: false };
    const follows = await getCollection<FollowDoc>("follows");
    const id = `${context.userId}:${data.userId}`;
    const existing = await follows.findOne({ _id: id });
    if (existing) {
      await follows.deleteOne({ _id: id });
      return { following: false };
    }
    await follows.insertOne({ _id: id, followerId: context.userId, followingId: data.userId });
    return { following: true };
  });
