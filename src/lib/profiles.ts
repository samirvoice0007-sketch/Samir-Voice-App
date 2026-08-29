import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { GIFTS } from "@/lib/gifts";
import {
  ensureProfileRow,
  followCounts,
  loadProfileRow,
  toProfile,
} from "@/lib/profile-core";
import type { GiftHistoryRow, Profile } from "@/lib/types";

export const ensureMyProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Profile> => {
    return ensureProfileRow(context.userId);
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Profile> => {
    return ensureProfileRow(context.userId);
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { displayName?: string; bio?: string; lang?: "bn" | "en" }) => d)
  .handler(async ({ context, data }): Promise<Profile> => {
    const sql = await getSql();
    await ensureProfileRow(context.userId);
    const name = data.displayName?.trim().slice(0, 32);
    const bio = typeof data.bio === "string" ? data.bio.slice(0, 160) : undefined;
    const lang = data.lang === "en" || data.lang === "bn" ? data.lang : undefined;
    if (name) {
      await sql`update profiles set display_name = ${name} where user_id = ${context.userId}`;
    }
    if (bio !== undefined) {
      await sql`update profiles set bio = ${bio} where user_id = ${context.userId}`;
    }
    if (lang) {
      await sql`update profiles set lang = ${lang} where user_id = ${context.userId}`;
    }
    const row = await loadProfileRow(context.userId);
    return toProfile(row!, await followCounts(context.userId));
  });

export const claimDaily = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ ok: boolean; coins: number; message: "claimed" | "already" }> => {
    const sql = await getSql();
    await ensureProfileRow(context.userId);
    const me = await loadProfileRow(context.userId);
    if (!me) throw new Error("Profile missing");
    const last = me.last_daily_at ? new Date(me.last_daily_at) : null;
    const now = new Date();
    if (last && last.toDateString() === now.toDateString()) {
      return { ok: false, coins: Number(me.coins), message: "already" };
    }
    let xp = Number(me.xp) + 10;
    let level = Number(me.level);
    if (xp >= level * 100) level += 1;
    const coins = Number(me.coins) + 50;
    await sql`
      update profiles
      set coins = ${coins}, xp = ${xp}, level = ${level}, last_daily_at = ${now.toISOString()}
      where user_id = ${context.userId}
    `;
    return { ok: true, coins, message: "claimed" };
  });

export const giftHistory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<GiftHistoryRow[]> => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      gift_id: string;
      cost: number;
      from_id: string;
      to_id: string;
      created_at: string;
    }>`
      select id, gift_id, cost, from_id, to_id, created_at
      from gift_sends
      where from_id = ${context.userId} or to_id = ${context.userId}
      order by created_at desc
      limit 30
    `;
    return rows.map((r) => {
      const g = GIFTS.find((x) => x.id === r.gift_id);
      return {
        id: r.id,
        giftId: r.gift_id,
        cost: Number(r.cost),
        from: r.from_id,
        to: r.to_id,
        createdAt: r.created_at,
        emoji: g?.emoji ?? "🎁",
        nameEn: g?.nameEn ?? r.gift_id,
        nameBn: g?.nameBn ?? r.gift_id,
      };
    });
  });

export const toggleFollow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { userId: string }) => d)
  .handler(async ({ context, data }): Promise<{ following: boolean }> => {
    const target = String(data.userId || "");
    if (!target || target === context.userId) throw new Error("Cannot follow yourself");
    const sql = await getSql();
    const existing = await sql<{ follower_id: string }>`
      select follower_id from follows
      where follower_id = ${context.userId} and following_id = ${target}
      limit 1
    `;
    if (existing[0]) {
      await sql`delete from follows where follower_id = ${context.userId} and following_id = ${target}`;
      return { following: false };
    }
    await sql`insert into follows (follower_id, following_id) values (${context.userId}, ${target})`;
    return { following: true };
  });
