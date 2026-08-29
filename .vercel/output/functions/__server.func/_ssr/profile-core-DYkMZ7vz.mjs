import { r as getSql } from "./db-CvawacfL.mjs";
import { n as hueFrom } from "./hue-BJmJj7bb.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/profile-core-DYkMZ7vz.js
function toProfile(row, counts) {
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
		lastDailyAt: row.last_daily_at
	};
}
async function followCounts(userId) {
	const sql = await getSql();
	const [a] = await sql`select count(*)::int as n from follows where following_id = ${userId}`;
	const [b] = await sql`select count(*)::int as n from follows where follower_id = ${userId}`;
	return {
		followers: Number(a?.n ?? 0),
		following: Number(b?.n ?? 0)
	};
}
async function authName(userId) {
	const row = (await (await getSql())`
    select name, email from "user" where id = ${userId} limit 1
  `)[0];
	if (!row) return "Star";
	const name = (row.name || "").trim();
	if (name && name !== "User") return name.slice(0, 32);
	return ((row.email || "").split("@")[0] || "Star").slice(0, 32);
}
async function loadProfileRow(userId) {
	return (await (await getSql())`
    select user_id, display_name, avatar_hue, bio, coins, charm, level, xp, lang, phone, last_daily_at
    from profiles where user_id = ${userId} limit 1
  `)[0] ?? null;
}
async function ensureProfileRow(userId) {
	const sql = await getSql();
	let row = await loadProfileRow(userId);
	if (!row) {
		await sql`
      insert into profiles (user_id, display_name, avatar_hue)
      values (${userId}, ${await authName(userId)}, ${hueFrom(userId)})
      on conflict (user_id) do nothing
    `;
		row = await loadProfileRow(userId);
	}
	if (!row) throw new Error("Could not create profile");
	return toProfile(row, await followCounts(userId));
}
//#endregion
export { toProfile as i, followCounts as n, loadProfileRow as r, ensureProfileRow as t };
