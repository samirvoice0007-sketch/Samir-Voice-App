import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getCollection } from "@/lib/db";
import { GIFTS } from "@/lib/gifts";
import { ensureProfileRow, followCounts, loadProfileRow, toProfile, type ProfileDoc } from "@/lib/profile-core";
import type { GiftHistoryRow, Profile } from "@/lib/types";

type GiftSendDoc = {
  _id: string;
  giftId: string;
  cost: number;
  fromId: string;
  toId: string;
  createdAt: Date;
};

type FollowDoc = {
  _id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
};

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
    await ensureProfileRow(context.userId);
    const name = data.displayName?.trim().slice(0, 32);
    const bio = typeof data.bio === "string" ? data.bio.slice(0, 160) : undefined;
    const lang = data.lang === "en" || data.lang === "bn" ? data.lang : undefined;
    const patch: Record<string, unknown> = {};
    if (name) patch.displayName = name;
    if (bio !== undefined) patch.bio = bio;
    if (lang) patch.lang = lang;
    if (Object.keys(patch).length) {
      const profiles = await getCollection<ProfileDoc>("profiles");
      await profiles.updateOne({ _id: context.userId }, { $set: patch });
    }
    const row = await loadProfileRow(context.userId);
    return toProfile(row!, await followCounts(context.userId));
  });

export const claimDaily = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ ok: boolean; coins: number; message: "claimed" | "already" }> => {
    await ensureProfileRow(context.userId);
    const me = await loadProfileRow(context.userId);
    if (!me) throw new Error("Profile missing");
    const last = me.lastDailyAt ? new Date(me.lastDailyAt) : null;
    const now = new Date();
    if (last && last.toDateString() === now.toDateString()) {
      return { ok: false, coins: Number(me.coins), message: "already" };
    }
    let xp = Number(me.xp) + 10;
    let level = Number(me.level);
    if (xp >= level * 100) level += 1;
    const coins = Number(me.coins) + 50;
    const profiles = await getCollection<ProfileDoc>("profiles");
    await profiles.updateOne(
      { _id: context.userId },
      { $set: { coins, xp, level, lastDailyAt: now.toISOString() } },
    );
    return { ok: true, coins, message: "claimed" };
  });

export const giftHistory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<GiftHistoryRow[]> => {
    const giftSends = await getCollection<GiftSendDoc>("giftSends");
    const rows = await giftSends
      .find({ $or: [{ fromId: context.userId }, { toId: context.userId }] })
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray();
    return rows.map((r) => {
      const g = GIFTS.find((x) => x.id === r.giftId);
      return {
        id: r._id,
        giftId: r.giftId,
        cost: Number(r.cost),
        from: r.fromId,
        to: r.toId,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
        emoji: g?.emoji ?? "🎁",
        nameEn: g?.nameEn ?? r.giftId,
        nameBn: g?.nameBn ?? r.giftId,
      };
    });
  });

export const toggleFollow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { userId: string }) => d)
  .handler(async ({ context, data }): Promise<{ following: boolean }> => {
    const target = String(data.userId || "");
    if (!target || target === context.userId) throw new Error("Cannot follow yourself");
    const follows = await getCollection<FollowDoc>("follows");
    const id = `${context.userId}:${target}`;
    const existing = await follows.findOne({ _id: id });
    if (existing) {
      await follows.deleteOne({ _id: id });
      return { following: false };
    }
    await follows.insertOne({
      _id: id,
      followerId: context.userId,
      followingId: target,
      createdAt: new Date(),
    });
    return { following: true };
  });
