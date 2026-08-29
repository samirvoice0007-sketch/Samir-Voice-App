import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
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

function hueFromId(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n + id.charCodeAt(i) * 17) % 360;
  return n;
}

async function ensureProfile(sql: Awaited<ReturnType<typeof getSql>>, userId: string, fallbackName: string) {
  const existing = await sql<{ user_id: string }>`select user_id from profiles where user_id = ${userId}`;
  if (existing.length) return;
  await sql`
    insert into profiles (user_id, display_name, avatar_hue)
    values (${userId}, ${fallbackName.slice(0, 24) || "Star"}, ${hueFromId(userId)})
    on conflict (user_id) do nothing
  `;
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureProfile(sql, context.userId, "Star");
    const rows = await sql<{
      user_id: string;
      display_name: string;
      avatar_hue: number;
      bio: string;
      coins: number;
      charm: number;
      level: number;
      xp: number;
      lang: string;
    }>`select user_id, display_name, avatar_hue, bio, coins, charm, level, xp, lang from profiles where user_id = ${context.userId}`;
    const r = rows[0];
    const profile: Profile = {
      userId: r.user_id,
      displayName: r.display_name,
      avatarHue: Number(r.avatar_hue),
      bio: r.bio,
      coins: Number(r.coins),
      charm: Number(r.charm),
      level: Number(r.level),
      xp: Number(r.xp),
      lang: r.lang,
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
    const sql = await getSql();
    await sql`
      update profiles
      set display_name = ${data.displayName}, bio = ${data.bio}, lang = ${data.lang}
      where user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const claimDaily = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureProfile(sql, context.userId, "Star");
    const key = `daily:${new Date().toISOString().slice(0, 10)}`;
    const already = await sql<{ id: string }>`
      select id from gift_sends
      where from_user = ${context.userId} and gift_id = ${key}
      limit 1
    `;
    if (already.length) return { ok: false as const, coins: 0 };
    await sql`
      insert into gift_sends (id, room_id, from_user, to_user, gift_id, cost)
      values (${crypto.randomUUID()}, 'system', ${context.userId}, ${context.userId}, ${key}, 0)
    `;
    await sql`update profiles set coins = coins + 50, xp = xp + 10 where user_id = ${context.userId}`;
    return { ok: true as const, coins: 50 };
  });

export const listRooms = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      host_id: string;
      title: string;
      topic: string;
      people: number;
      speakers: number;
    }>`
      select r.id, r.host_id, r.title, r.topic,
        coalesce((select count(*) from room_members m where m.room_id = r.id), 0)::int as people,
        coalesce((select count(*) from room_members m where m.room_id = r.id and m.role <> 'listener'), 0)::int as speakers
      from rooms r
      order by people desc, r.created_at desc
    `;
    return rows.map(
      (r): RoomCard => ({
        id: r.id,
        hostId: r.host_id,
        title: r.title,
        topic: r.topic,
        people: Number(r.people),
        speakers: Number(r.speakers),
      }),
    );
  });

export const createRoom = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ title: z.string().min(2).max(40), topic: z.string().max(80) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfile(sql, context.userId, "Star");
    const id = crypto.randomUUID();
    await sql`
      insert into rooms (id, host_id, title, topic)
      values (${id}, ${context.userId}, ${data.title}, ${data.topic})
    `;
    await sql`
      insert into room_members (room_id, user_id, role, seat, muted)
      values (${id}, ${context.userId}, 'host', 0, false)
    `;
    return { id };
  });

export const getRoom = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ roomId: z.string() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rooms = await sql<{
      id: string;
      host_id: string;
      title: string;
      topic: string;
    }>`select id, host_id, title, topic from rooms where id = ${data.roomId}`;
    if (!rooms[0]) return null;
    const members = await sql<{
      user_id: string;
      display_name: string;
      avatar_hue: number;
      role: string;
      seat: number | null;
      muted: boolean;
    }>`
      select m.user_id, coalesce(p.display_name, 'Star') as display_name,
        coalesce(p.avatar_hue, 320) as avatar_hue, m.role, m.seat, m.muted
      from room_members m
      left join profiles p on p.user_id = m.user_id
      where m.room_id = ${data.roomId}
      order by coalesce(m.seat, 99), m.joined_at
    `;
    return {
      id: rooms[0].id,
      hostId: rooms[0].host_id,
      title: rooms[0].title,
      topic: rooms[0].topic,
      members: members.map(
        (m): Member => ({
          userId: m.user_id,
          displayName: m.display_name,
          avatarHue: Number(m.avatar_hue),
          role: m.role,
          seat: m.seat === null ? null : Number(m.seat),
          muted: Boolean(m.muted),
        }),
      ),
    };
  });

export const joinRoom = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ roomId: z.string() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfile(sql, context.userId, "Star");
    const room = await sql<{ id: string }>`select id from rooms where id = ${data.roomId}`;
    if (!room[0]) throw new Error("Room not found");
    await sql`
      insert into room_members (room_id, user_id, role, seat, muted)
      values (${data.roomId}, ${context.userId}, 'listener', null, true)
      on conflict (room_id, user_id) do nothing
    `;
    return { ok: true as const };
  });

export const leaveRoom = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ roomId: z.string() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from room_members where room_id = ${data.roomId} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const takeSeat = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ roomId: z.string(), seat: z.number().int().min(0).max(7) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const taken = await sql<{ user_id: string }>`
      select user_id from room_members where room_id = ${data.roomId} and seat = ${data.seat}
    `;
    if (taken.length && taken[0].user_id !== context.userId) {
      throw new Error("Seat taken");
    }
    await sql`
      update room_members
      set role = case when role = 'host' then 'host' else 'speaker' end,
          seat = ${data.seat}, muted = false
      where room_id = ${data.roomId} and user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const setMuted = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ roomId: z.string(), muted: z.boolean() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      update room_members set muted = ${data.muted}
      where room_id = ${data.roomId} and user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const listMessages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ roomId: z.string() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      user_id: string;
      display_name: string;
      body: string;
      kind: string;
      gift_id: string | null;
      created_at: string;
    }>`
      select m.id, m.user_id, coalesce(p.display_name, 'Star') as display_name,
        m.body, m.kind, m.gift_id, m.created_at::text as created_at
      from room_messages m
      left join profiles p on p.user_id = m.user_id
      where m.room_id = ${data.roomId}
      order by m.created_at desc
      limit 40
    `;
    return rows
      .slice()
      .reverse()
      .map(
        (r): ChatMsg => ({
          id: r.id,
          userId: r.user_id,
          displayName: r.display_name,
          body: r.body,
          kind: r.kind,
          giftId: r.gift_id,
          createdAt: r.created_at,
        }),
      );
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ roomId: z.string(), body: z.string().min(1).max(240) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`
      insert into room_messages (id, room_id, user_id, body, kind)
      values (${id}, ${data.roomId}, ${context.userId}, ${data.body}, 'chat')
    `;
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
    const sql = await getSql();
    const me = await sql<{ coins: number }>`select coins from profiles where user_id = ${context.userId}`;
    if (!me[0] || Number(me[0].coins) < gift.cost) throw new Error("Not enough coins");
    await sql`update profiles set coins = coins - ${gift.cost}, xp = xp + 5 where user_id = ${context.userId}`;
    const charm = Math.floor(gift.cost * 0.4);
    await sql`update profiles set charm = charm + ${charm}, coins = coins + ${charm} where user_id = ${data.toUser}`;
    const id = crypto.randomUUID();
    await sql`
      insert into gift_sends (id, room_id, from_user, to_user, gift_id, cost)
      values (${id}, ${data.roomId}, ${context.userId}, ${data.toUser}, ${gift.id}, ${gift.cost})
    `;
    await sql`
      insert into room_messages (id, room_id, user_id, body, kind, gift_id)
      values (${crypto.randomUUID()}, ${data.roomId}, ${context.userId}, ${gift.id}, 'gift', ${gift.id})
    `;
    return { ok: true as const, gift };
  });

export const listMyGifts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      gift_id: string;
      cost: number;
      from_user: string;
      to_user: string;
      created_at: string;
    }>`
      select id, gift_id, cost, from_user, to_user, created_at::text as created_at
      from gift_sends
      where (from_user = ${context.userId} or to_user = ${context.userId})
        and gift_id not like 'daily:%'
      order by created_at desc
      limit 20
    `;
    return rows.map((r) => ({
      id: r.id,
      giftId: r.gift_id,
      cost: Number(r.cost),
      fromUser: r.from_user,
      toUser: r.to_user,
      createdAt: r.created_at,
      catalog: GIFTS.find((g) => g.id === r.gift_id) ?? null,
    }));
  });

export const toggleFollow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ context, data }) => {
    if (data.userId === context.userId) return { following: false };
    const sql = await getSql();
    const exists = await sql<{ follower_id: string }>`
      select follower_id from follows
      where follower_id = ${context.userId} and following_id = ${data.userId}
    `;
    if (exists.length) {
      await sql`
        delete from follows where follower_id = ${context.userId} and following_id = ${data.userId}
      `;
      return { following: false };
    }
    await sql`
      insert into follows (follower_id, following_id)
      values (${context.userId}, ${data.userId})
    `;
    return { following: true };
  });
