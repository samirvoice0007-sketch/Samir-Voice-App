import { getSql } from "@/lib/db";
import { hueFrom } from "@/lib/hue";
import type { Profile } from "@/lib/types";

export type ProfileRow = {
  user_id: string;
  display_name: string;
  avatar_hue: number;
  bio: string;
  coins: number;
  charm: number;
  level: number;
  xp: number;
  lang: string;
  phone: string | null;
  last_daily_at: string | null;
};

export function toProfile(
  row: ProfileRow,
  counts: { followers: number; following: number },
): Profile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    avatarHue: Number(row.avatar_hue) || 320,
    bio: row.bio || "",
    coins: Number(row.coins) || 0,
    charm: Number(row.charm) || 0,
    level: Number(row.level) || 1,
    xp: Number(row.xp) || 0,
    lang: row.lang === "en" ? "en" : "bn",
    phone: row.phone,
    followers: counts.followers,
    following: counts.following,
    lastDailyAt: row.last_daily_at,
  };
}

export async function followCounts(userId: string) {
  const sql = await getSql();
  const [a] = await sql<{ n: number }>`select count(*)::int as n from follows where following_id = ${userId}`;
  const [b] = await sql<{ n: number }>`select count(*)::int as n from follows where follower_id = ${userId}`;
  return { followers: Number(a?.n ?? 0), following: Number(b?.n ?? 0) };
}

async function authName(userId: string): Promise<string> {
  const sql = await getSql();
  const rows = await sql<{ name: string; email: string }>`
    select name, email from "user" where id = ${userId} limit 1
  `;
  const row = rows[0];
  if (!row) return "Star";
  const name = (row.name || "").trim();
  if (name && name !== "User") return name.slice(0, 32);
  const fromEmail = (row.email || "").split("@")[0];
  return (fromEmail || "Star").slice(0, 32);
}

export async function loadProfileRow(userId: string): Promise<ProfileRow | null> {
  const sql = await getSql();
  const rows = await sql<ProfileRow>`
    select user_id, display_name, avatar_hue, bio, coins, charm, level, xp, lang, phone, last_daily_at
    from profiles where user_id = ${userId} limit 1
  `;
  return rows[0] ?? null;
}

export async function ensureProfileRow(userId: string): Promise<Profile> {
  const sql = await getSql();
  let row = await loadProfileRow(userId);
  if (!row) {
    const displayName = await authName(userId);
    const hue = hueFrom(userId);
    await sql`
      insert into profiles (user_id, display_name, avatar_hue)
      values (${userId}, ${displayName}, ${hue})
      on conflict (user_id) do nothing
    `;
    row = await loadProfileRow(userId);
  }
  if (!row) throw new Error("Could not create profile");
  return toProfile(row, await followCounts(userId));
}
