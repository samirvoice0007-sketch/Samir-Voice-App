import { getCollection } from "@/lib/db";
import { hueFrom } from "@/lib/hue";
import type { Profile } from "@/lib/types";

export type ProfileDoc = {
  _id: string;
  displayName: string;
  avatarHue: number;
  bio: string;
  coins: number;
  charm: number;
  level: number;
  xp: number;
  lang: string;
  phone: string | null;
  lastDailyAt: string | null;
  createdAt: Date;
};

export function toProfile(
  row: ProfileDoc,
  counts: { followers: number; following: number },
): Profile {
  return {
    userId: row._id,
    displayName: row.displayName,
    avatarHue: Number(row.avatarHue) || 320,
    bio: row.bio || "",
    coins: Number(row.coins) || 0,
    charm: Number(row.charm) || 0,
    level: Number(row.level) || 1,
    xp: Number(row.xp) || 0,
    lang: row.lang === "en" ? "en" : "bn",
    phone: row.phone,
    followers: counts.followers,
    following: counts.following,
    lastDailyAt: row.lastDailyAt,
  };
}

export async function followCounts(userId: string) {
  const follows = await getCollection<{ followerId: string; followingId: string }>("follows");
  const followers = (await follows.find({ followingId: userId }).toArray()).length;
  const following = (await follows.find({ followerId: userId }).toArray()).length;
  return { followers, following };
}

async function authName(userId: string): Promise<string> {
  if (userId === "admin") return "Admin";
  const users = await getCollection<{ _id: string; name?: string; email?: string }>("users");
  const row = await users.findOne({ _id: userId });
  if (!row) return "Star";
  const name = (row.name || "").trim();
  if (name && name !== "User") return name.slice(0, 32);
  const fromEmail = (row.email || "").split("@")[0];
  return (fromEmail || "Star").slice(0, 32);
}

export async function loadProfileRow(userId: string): Promise<ProfileDoc | null> {
  const profiles = await getCollection<ProfileDoc>("profiles");
  return profiles.findOne({ _id: userId });
}

export async function ensureProfileRow(userId: string): Promise<Profile> {
  const profiles = await getCollection<ProfileDoc>("profiles");
  let row = await profiles.findOne({ _id: userId });
  if (!row) {
    const displayName = await authName(userId);
    const doc: ProfileDoc = {
      _id: userId,
      displayName: displayName.slice(0, 32) || "Star",
      avatarHue: hueFrom(userId),
      bio: "",
      coins: 500,
      charm: 0,
      level: 1,
      xp: 0,
      lang: "bn",
      phone: null,
      lastDailyAt: null,
      createdAt: new Date(),
    };
    try {
      await profiles.insertOne(doc);
      row = doc;
    } catch {
      row = await profiles.findOne({ _id: userId });
    }
  }
  if (!row) throw new Error("Could not create profile");
  return toProfile(row, await followCounts(userId));
}
