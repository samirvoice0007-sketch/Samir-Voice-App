import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { giftById } from "@/lib/gifts";
import { newId } from "@/lib/ids";
import { ensureProfileRow } from "@/lib/profile-core";
import { loadRoomDetail } from "@/lib/room-core";
import type { ChatMessage, RoomDetail, RoomSummary } from "@/lib/types";

type RoomRow = {
  id: string;
  title: string;
  topic: string;
  host_id: string | null;
  is_live: boolean;
};

const SEED = [
  { id: "rose", title: "Rose Lounge", topic: "Late night talks · রাতের গল্প" },
  { id: "party", title: "GF BF Party", topic: "Flirty party room · পার্টি রুম" },
  { id: "music", title: "Music Night", topic: "Sing & vibe · গান আর আড্ডা" },
];

async function seedRooms() {
  const sql = await getSql();
  const [{ n }] = await sql<{ n: number }>`select count(*)::int as n from rooms`;
  if (Number(n) > 0) return;
  for (const r of SEED) {
    await sql`
      insert into rooms (id, title, topic, is_live)
      values (${r.id}, ${r.title}, ${r.topic}, true)
      on conflict (id) do nothing
    `;
  }
}

async function memberCount(roomId: string) {
  const sql = await getSql();
  const rows = await sql<{ people: number; speakers: number }>`
    select
      count(*)::int as people,
      count(*) filter (where role <> 'listener')::int as speakers
    from room_members where room_id = ${roomId}
  `;
  return {
    people: Number(rows[0]?.people ?? 0),
    speakers: Number(rows[0]?.speakers ?? 0),
  };
}

export const listRooms = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<RoomSummary[]> => {
    await seedRooms();
    const sql = await getSql();
    const rooms = await sql<RoomRow>`
      select id, title, topic, host_id, is_live
      from rooms where is_live = true
      order by updated_at desc
      limit 50
    `;
    const out: RoomSummary[] = [];
    for (const r of rooms) {
      const c = await memberCount(r.id);
      out.push({
        id: r.id,
        title: r.title,
        topic: r.topic,
        hostId: r.host_id,
        people: c.people,
        speakers: c.speakers,
        isLive: Boolean(r.is_live),
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
    const sql = await getSql();
    await sql`
      insert into rooms (id, title, topic, host_id, is_live)
      values (${id}, ${title}, ${topic}, ${context.userId}, true)
    `;
    await sql`
      insert into room_members (room_id, user_id, role, seat, muted)
      values (${id}, ${context.userId}, 'host', 0, false)
    `;
    return {
      id,
      title,
      topic,
      hostId: context.userId,
      people: 1,
      speakers: 1,
      isLive: true,
    };
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
    const sql = await getSql();
    const rows = await sql<RoomRow>`
      select id, title, topic, host_id, is_live from rooms where id = ${data.id} limit 1
    `;
    const room = rows[0];
    if (!room || !room.is_live) throw new Error("Room not found");
    await sql`
      insert into room_members (room_id, user_id, role, seat, muted)
      values (${room.id}, ${context.userId}, 'listener', null, true)
      on conflict (room_id, user_id) do nothing
    `;
    await sql`update rooms set updated_at = now() where id = ${room.id}`;
    return loadRoomDetail(room.id);
  });

export const leaveRoom = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const sql = await getSql();
    await sql`delete from room_members where room_id = ${data.id} and user_id = ${context.userId}`;
    const [{ n }] = await sql<{ n: number }>`
      select count(*)::int as n from room_members where room_id = ${data.id}
    `;
    if (Number(n) === 0) {
      await sql`update rooms set is_live = false, updated_at = now() where id = ${data.id}`;
    } else {
      await sql`update rooms set updated_at = now() where id = ${data.id}`;
    }
    return { ok: true };
  });

export const takeSeat = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; seat: number }) => d)
  .handler(async ({ context, data }): Promise<RoomDetail> => {
    const seat = Number(data.seat);
    if (!Number.isInteger(seat) || seat < 0 || seat > 7) throw new Error("Invalid seat");
    const sql = await getSql();
    const taken = await sql<{ user_id: string }>`
      select user_id from room_members
      where room_id = ${data.id} and seat = ${seat} and user_id <> ${context.userId}
      limit 1
    `;
    if (taken[0]) throw new Error("Seat taken");
    const me = await sql<{ role: string }>`
      select role from room_members where room_id = ${data.id} and user_id = ${context.userId} limit 1
    `;
    if (!me[0]) throw new Error("Join room first");
    const role = me[0].role === "host" ? "host" : "speaker";
    await sql`
      update room_members
      set seat = ${seat}, role = ${role}, muted = false
      where room_id = ${data.id} and user_id = ${context.userId}
    `;
    return loadRoomDetail(data.id);
  });

export const setMuted = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; muted: boolean }) => d)
  .handler(async ({ context, data }): Promise<{ muted: boolean }> => {
    const sql = await getSql();
    await sql`
      update room_members set muted = ${Boolean(data.muted)}
      where room_id = ${data.id} and user_id = ${context.userId}
    `;
    return { muted: Boolean(data.muted) };
  });

export const kickMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; userId: string }) => d)
  .handler(async ({ context, data }): Promise<RoomDetail> => {
    const sql = await getSql();
    const rows = await sql<RoomRow>`select id, title, topic, host_id, is_live from rooms where id = ${data.id} limit 1`;
    const room = rows[0];
    if (!room) throw new Error("Room not found");
    if (room.host_id !== context.userId) throw new Error("Host only");
    await sql`delete from room_members where room_id = ${data.id} and user_id = ${data.userId}`;
    return loadRoomDetail(data.id);
  });

export const listMessages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<ChatMessage[]> => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      user_id: string;
      body: string;
      kind: string;
      gift_id: string | null;
      created_at: string;
      display_name: string | null;
    }>`
      select m.id, m.user_id, m.body, m.kind, m.gift_id, m.created_at, p.display_name
      from messages m
      left join profiles p on p.user_id = m.user_id
      where m.room_id = ${data.id}
      order by m.created_at desc
      limit 50
    `;
    return rows.reverse().map((r) => ({
      id: r.id,
      userId: r.user_id,
      displayName: r.display_name || "Star",
      body: r.body,
      kind: r.kind === "gift" ? "gift" : "chat",
      giftId: r.gift_id,
      createdAt: r.created_at,
    }));
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; body: string }) => d)
  .handler(async ({ context, data }): Promise<ChatMessage> => {
    const body = String(data.body || "").trim().slice(0, 280);
    if (!body) throw new Error("Empty message");
    const id = newId("m");
    const sql = await getSql();
    await sql`
      insert into messages (id, room_id, user_id, body, kind)
      values (${id}, ${data.id}, ${context.userId}, ${body}, 'chat')
    `;
    const [p] = await sql<{ display_name: string }>`
      select display_name from profiles where user_id = ${context.userId} limit 1
    `;
    return {
      id,
      userId: context.userId,
      displayName: p?.display_name || "Star",
      body,
      kind: "chat",
      giftId: null,
      createdAt: new Date().toISOString(),
    };
  });

export const sendGift = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; giftId: string; toUser: string }) => d)
  .handler(async ({ context, data }): Promise<{ coins: number; message: ChatMessage }> => {
    const gift = giftById(data.giftId);
    if (!gift) throw new Error("Unknown gift");
    if (!data.toUser || data.toUser === context.userId) throw new Error("Pick someone else");
    const sql = await getSql();
    const [me] = await sql<{ coins: number; xp: number; display_name: string }>`
      select coins, xp, display_name from profiles where user_id = ${context.userId} limit 1
    `;
    if (!me) throw new Error("Profile missing");
    if (Number(me.coins) < gift.cost) throw new Error("Not enough coins");
    const [target] = await sql<{ coins: number; charm: number; display_name: string }>`
      select coins, charm, display_name from profiles where user_id = ${data.toUser} limit 1
    `;
    if (!target) throw new Error("User not found");
    const charm = Math.floor(gift.cost * 0.4);
    const myCoins = Number(me.coins) - gift.cost;
    await sql`update profiles set coins = ${myCoins}, xp = ${Number(me.xp) + 5} where user_id = ${context.userId}`;
    await sql`update profiles set charm = ${Number(target.charm) + charm}, coins = ${Number(target.coins) + charm} where user_id = ${data.toUser}`;
    const gid = newId("g");
    const mid = newId("m");
    await sql`
      insert into gift_sends (id, room_id, from_id, to_id, gift_id, cost)
      values (${gid}, ${data.id}, ${context.userId}, ${data.toUser}, ${gift.id}, ${gift.cost})
    `;
    await sql`
      insert into messages (id, room_id, user_id, body, kind, gift_id)
      values (${mid}, ${data.id}, ${context.userId}, ${gift.id}, 'gift', ${gift.id})
    `;
    return {
      coins: myCoins,
      message: {
        id: mid,
        userId: context.userId,
        displayName: me.display_name,
        body: gift.id,
        kind: "gift",
        giftId: gift.id,
        emoji: gift.emoji,
        toUser: data.toUser,
        toName: target.display_name,
        createdAt: new Date().toISOString(),
      },
    };
  });
