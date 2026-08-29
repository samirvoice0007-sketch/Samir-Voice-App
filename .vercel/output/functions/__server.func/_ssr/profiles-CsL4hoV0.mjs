import { r as createServerFn } from "./ssr.mjs";
import { r as getSql } from "./db-CvawacfL.mjs";
import { t as authMiddleware } from "./middleware-D8_1gsU1.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
import { t as GIFTS } from "./gifts-B-a4BAi4.mjs";
import { i as toProfile, n as followCounts, r as loadProfileRow, t as ensureProfileRow } from "./profile-core-DYkMZ7vz.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/profiles-CsL4hoV0.js
var ensureMyProfile_createServerFn_handler = createServerRpc({
	id: "f20902d2eaa967101cd1a347c3e03e2a5dba2bc1a2fc48b277bde945e34084ec",
	name: "ensureMyProfile",
	filename: "src/lib/profiles.ts"
}, (opts) => ensureMyProfile.__executeServer(opts));
var ensureMyProfile = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(ensureMyProfile_createServerFn_handler, async ({ context }) => {
	return ensureProfileRow(context.userId);
});
var getMyProfile_createServerFn_handler = createServerRpc({
	id: "8b3329c2a9c2e99309d3a0e052a1c2aee1122f0a67ed1d38fe5c39d12428d69e",
	name: "getMyProfile",
	filename: "src/lib/profiles.ts"
}, (opts) => getMyProfile.__executeServer(opts));
var getMyProfile = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(getMyProfile_createServerFn_handler, async ({ context }) => {
	return ensureProfileRow(context.userId);
});
var updateMyProfile_createServerFn_handler = createServerRpc({
	id: "a67e0918c7815b04c0558e3948a83ca88260536e7bbb425772ad42d99cb44123",
	name: "updateMyProfile",
	filename: "src/lib/profiles.ts"
}, (opts) => updateMyProfile.__executeServer(opts));
var updateMyProfile = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(updateMyProfile_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	await ensureProfileRow(context.userId);
	const name = data.displayName?.trim().slice(0, 32);
	const bio = typeof data.bio === "string" ? data.bio.slice(0, 160) : void 0;
	const lang = data.lang === "en" || data.lang === "bn" ? data.lang : void 0;
	if (name) await sql`update profiles set display_name = ${name} where user_id = ${context.userId}`;
	if (bio !== void 0) await sql`update profiles set bio = ${bio} where user_id = ${context.userId}`;
	if (lang) await sql`update profiles set lang = ${lang} where user_id = ${context.userId}`;
	const row = await loadProfileRow(context.userId);
	return toProfile(row, await followCounts(context.userId));
});
var claimDaily_createServerFn_handler = createServerRpc({
	id: "5d72d61a85a3d572351cb78d65d9b19d9a67b6e77ed8e039ce0e80d270e8a5ce",
	name: "claimDaily",
	filename: "src/lib/profiles.ts"
}, (opts) => claimDaily.__executeServer(opts));
var claimDaily = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(claimDaily_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	await ensureProfileRow(context.userId);
	const me = await loadProfileRow(context.userId);
	if (!me) throw new Error("Profile missing");
	const last = me.last_daily_at ? new Date(me.last_daily_at) : null;
	const now = /* @__PURE__ */ new Date();
	if (last && last.toDateString() === now.toDateString()) return {
		ok: false,
		coins: Number(me.coins),
		message: "already"
	};
	let xp = Number(me.xp) + 10;
	let level = Number(me.level);
	if (xp >= level * 100) level += 1;
	const coins = Number(me.coins) + 50;
	await sql`
      update profiles
      set coins = ${coins}, xp = ${xp}, level = ${level}, last_daily_at = ${now.toISOString()}
      where user_id = ${context.userId}
    `;
	return {
		ok: true,
		coins,
		message: "claimed"
	};
});
var giftHistory_createServerFn_handler = createServerRpc({
	id: "81eff7155ff2c12ca49cedf41db250b08cfa5e6dec2ec2cd44dcb78b87327518",
	name: "giftHistory",
	filename: "src/lib/profiles.ts"
}, (opts) => giftHistory.__executeServer(opts));
var giftHistory = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(giftHistory_createServerFn_handler, async ({ context }) => {
	return (await (await getSql())`
      select id, gift_id, cost, from_id, to_id, created_at
      from gift_sends
      where from_id = ${context.userId} or to_id = ${context.userId}
      order by created_at desc
      limit 30
    `).map((r) => {
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
			nameBn: g?.nameBn ?? r.gift_id
		};
	});
});
var toggleFollow_createServerFn_handler = createServerRpc({
	id: "8fc5a39d7a9901f14631d1943b39ad72476f806786907ed9f81334a8e0150935",
	name: "toggleFollow",
	filename: "src/lib/profiles.ts"
}, (opts) => toggleFollow.__executeServer(opts));
var toggleFollow = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(toggleFollow_createServerFn_handler, async ({ context, data }) => {
	const target = String(data.userId || "");
	if (!target || target === context.userId) throw new Error("Cannot follow yourself");
	const sql = await getSql();
	if ((await sql`
      select follower_id from follows
      where follower_id = ${context.userId} and following_id = ${target}
      limit 1
    `)[0]) {
		await sql`delete from follows where follower_id = ${context.userId} and following_id = ${target}`;
		return { following: false };
	}
	await sql`insert into follows (follower_id, following_id) values (${context.userId}, ${target})`;
	return { following: true };
});
//#endregion
export { claimDaily_createServerFn_handler, ensureMyProfile_createServerFn_handler, getMyProfile_createServerFn_handler, giftHistory_createServerFn_handler, toggleFollow_createServerFn_handler, updateMyProfile_createServerFn_handler };
