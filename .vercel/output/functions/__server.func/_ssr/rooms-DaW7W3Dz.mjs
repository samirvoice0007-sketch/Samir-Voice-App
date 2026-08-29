import { r as createServerFn } from "./ssr.mjs";
import { r as getSql } from "./db-CvawacfL.mjs";
import { t as authMiddleware } from "./middleware-D8_1gsU1.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
import { n as giftById } from "./gifts-B-a4BAi4.mjs";
import { t as ensureProfileRow } from "./profile-core-DYkMZ7vz.mjs";
import { t as newId } from "./ids-BspsANa3.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/rooms-DaW7W3Dz.js
async function loadMembers(roomId) {
	return (await (await getSql())`
    select m.user_id, m.role, m.seat, m.muted, p.display_name, p.avatar_hue
    from room_members m
    left join profiles p on p.user_id = m.user_id
    where m.room_id = ${roomId}
    order by m.joined_at
  `).map((r) => ({
		userId: r.user_id,
		displayName: r.display_name || "Star",
		avatarHue: Number(r.avatar_hue ?? 320),
		role: r.role || "listener",
		seat: r.seat === null || r.seat === void 0 ? null : Number(r.seat),
		muted: Boolean(r.muted)
	}));
}
async function loadRoomDetail(id) {
	const room = (await (await getSql())`
    select id, title, topic, host_id, is_live from rooms where id = ${id} limit 1
  `)[0];
	if (!room) throw new Error("Room not found");
	return {
		id: room.id,
		title: room.title,
		topic: room.topic,
		hostId: room.host_id,
		isLive: Boolean(room.is_live),
		members: await loadMembers(room.id)
	};
}
var SEED = [
	{
		id: "rose",
		title: "Rose Lounge",
		topic: "Late night talks · রাতের গল্প"
	},
	{
		id: "party",
		title: "GF BF Party",
		topic: "Flirty party room · পার্টি রুম"
	},
	{
		id: "music",
		title: "Music Night",
		topic: "Sing & vibe · গান আর আড্ডা"
	}
];
async function seedRooms() {
	const sql = await getSql();
	const [{ n }] = await sql`select count(*)::int as n from rooms`;
	if (Number(n) > 0) return;
	for (const r of SEED) await sql`
      insert into rooms (id, title, topic, is_live)
      values (${r.id}, ${r.title}, ${r.topic}, true)
      on conflict (id) do nothing
    `;
}
async function memberCount(roomId) {
	const rows = await (await getSql())`
    select
      count(*)::int as people,
      count(*) filter (where role <> 'listener')::int as speakers
    from room_members where room_id = ${roomId}
  `;
	return {
		people: Number(rows[0]?.people ?? 0),
		speakers: Number(rows[0]?.speakers ?? 0)
	};
}
var listRooms_createServerFn_handler = createServerRpc({
	id: "a953c508121308f40fee15df3bd1de3e1e71218dd4f6cf04eb733f6b43684692",
	name: "listRooms",
	filename: "src/lib/rooms.ts"
}, (opts) => listRooms.__executeServer(opts));
var listRooms = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(listRooms_createServerFn_handler, async () => {
	await seedRooms();
	const rooms = await (await getSql())`
      select id, title, topic, host_id, is_live
      from rooms where is_live = true
      order by updated_at desc
      limit 50
    `;
	const out = [];
	for (const r of rooms) {
		const c = await memberCount(r.id);
		out.push({
			id: r.id,
			title: r.title,
			topic: r.topic,
			hostId: r.host_id,
			people: c.people,
			speakers: c.speakers,
			isLive: Boolean(r.is_live)
		});
	}
	return out;
});
var createRoom_createServerFn_handler = createServerRpc({
	id: "50fea19dea03f2a51f20c94ac43563bfe3fb1de56e58af98aabc64d377f78d22",
	name: "createRoom",
	filename: "src/lib/rooms.ts"
}, (opts) => createRoom.__executeServer(opts));
var createRoom = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createRoom_createServerFn_handler, async ({ context, data }) => {
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
		isLive: true
	};
});
var getRoom_createServerFn_handler = createServerRpc({
	id: "49b99f319fc5c372ed45926ef645aa98b270fe27ddb6a500a5de66b4bcdfe162",
	name: "getRoom",
	filename: "src/lib/rooms.ts"
}, (opts) => getRoom.__executeServer(opts));
var getRoom = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d).handler(getRoom_createServerFn_handler, async ({ data }) => {
	return loadRoomDetail(data.id);
});
var joinRoom_createServerFn_handler = createServerRpc({
	id: "851cd4d66b2c4aafe2da5441abd79d8952676d69980e2b10a7695c575afc9c32",
	name: "joinRoom",
	filename: "src/lib/rooms.ts"
}, (opts) => joinRoom.__executeServer(opts));
var joinRoom = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(joinRoom_createServerFn_handler, async ({ context, data }) => {
	await ensureProfileRow(context.userId);
	const sql = await getSql();
	const room = (await sql`
      select id, title, topic, host_id, is_live from rooms where id = ${data.id} limit 1
    `)[0];
	if (!room || !room.is_live) throw new Error("Room not found");
	await sql`
      insert into room_members (room_id, user_id, role, seat, muted)
      values (${room.id}, ${context.userId}, 'listener', null, true)
      on conflict (room_id, user_id) do nothing
    `;
	await sql`update rooms set updated_at = now() where id = ${room.id}`;
	return loadRoomDetail(room.id);
});
var leaveRoom_createServerFn_handler = createServerRpc({
	id: "194a489c220f8d2049e20a96b09dbb03f6540edc8fbace7adc06d04eae6699a8",
	name: "leaveRoom",
	filename: "src/lib/rooms.ts"
}, (opts) => leaveRoom.__executeServer(opts));
var leaveRoom = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(leaveRoom_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	await sql`delete from room_members where room_id = ${data.id} and user_id = ${context.userId}`;
	const [{ n }] = await sql`
      select count(*)::int as n from room_members where room_id = ${data.id}
    `;
	if (Number(n) === 0) await sql`update rooms set is_live = false, updated_at = now() where id = ${data.id}`;
	else await sql`update rooms set updated_at = now() where id = ${data.id}`;
	return { ok: true };
});
var takeSeat_createServerFn_handler = createServerRpc({
	id: "c30c3462065eba47caf93bb0d2896e904d62b8863fd11935876ecb26b663bb52",
	name: "takeSeat",
	filename: "src/lib/rooms.ts"
}, (opts) => takeSeat.__executeServer(opts));
var takeSeat = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(takeSeat_createServerFn_handler, async ({ context, data }) => {
	const seat = Number(data.seat);
	if (!Number.isInteger(seat) || seat < 0 || seat > 7) throw new Error("Invalid seat");
	const sql = await getSql();
	if ((await sql`
      select user_id from room_members
      where room_id = ${data.id} and seat = ${seat} and user_id <> ${context.userId}
      limit 1
    `)[0]) throw new Error("Seat taken");
	const me = await sql`
      select role from room_members where room_id = ${data.id} and user_id = ${context.userId} limit 1
    `;
	if (!me[0]) throw new Error("Join room first");
	await sql`
      update room_members
      set seat = ${seat}, role = ${me[0].role === "host" ? "host" : "speaker"}, muted = false
      where room_id = ${data.id} and user_id = ${context.userId}
    `;
	return loadRoomDetail(data.id);
});
var setMuted_createServerFn_handler = createServerRpc({
	id: "4f7fa25141ad338ab17c505971dbfba75cfbc662f86120f471f9f279c4d3e379",
	name: "setMuted",
	filename: "src/lib/rooms.ts"
}, (opts) => setMuted.__executeServer(opts));
var setMuted = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(setMuted_createServerFn_handler, async ({ context, data }) => {
	await (await getSql())`
      update room_members set muted = ${Boolean(data.muted)}
      where room_id = ${data.id} and user_id = ${context.userId}
    `;
	return { muted: Boolean(data.muted) };
});
var kickMember_createServerFn_handler = createServerRpc({
	id: "c01c2126e5e26e8ec8b07d4aba77961d1eb3329e1ef06b2b5e6b46b484357988",
	name: "kickMember",
	filename: "src/lib/rooms.ts"
}, (opts) => kickMember.__executeServer(opts));
var kickMember = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(kickMember_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const room = (await sql`select id, title, topic, host_id, is_live from rooms where id = ${data.id} limit 1`)[0];
	if (!room) throw new Error("Room not found");
	if (room.host_id !== context.userId) throw new Error("Host only");
	await sql`delete from room_members where room_id = ${data.id} and user_id = ${data.userId}`;
	return loadRoomDetail(data.id);
});
var listMessages_createServerFn_handler = createServerRpc({
	id: "6acef8402b3b63c2589bb3b7fe9c33bdff342c72787a7f102d0ef0ec7676adf2",
	name: "listMessages",
	filename: "src/lib/rooms.ts"
}, (opts) => listMessages.__executeServer(opts));
var listMessages = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d).handler(listMessages_createServerFn_handler, async ({ data }) => {
	return (await (await getSql())`
      select m.id, m.user_id, m.body, m.kind, m.gift_id, m.created_at, p.display_name
      from messages m
      left join profiles p on p.user_id = m.user_id
      where m.room_id = ${data.id}
      order by m.created_at desc
      limit 50
    `).reverse().map((r) => ({
		id: r.id,
		userId: r.user_id,
		displayName: r.display_name || "Star",
		body: r.body,
		kind: r.kind === "gift" ? "gift" : "chat",
		giftId: r.gift_id,
		createdAt: r.created_at
	}));
});
var sendMessage_createServerFn_handler = createServerRpc({
	id: "601d7689b49910671d15275287873bc2f31fe2e0fd3d957c8e0c44c112afba5e",
	name: "sendMessage",
	filename: "src/lib/rooms.ts"
}, (opts) => sendMessage.__executeServer(opts));
var sendMessage = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(sendMessage_createServerFn_handler, async ({ context, data }) => {
	const body = String(data.body || "").trim().slice(0, 280);
	if (!body) throw new Error("Empty message");
	const id = newId("m");
	const sql = await getSql();
	await sql`
      insert into messages (id, room_id, user_id, body, kind)
      values (${id}, ${data.id}, ${context.userId}, ${body}, 'chat')
    `;
	const [p] = await sql`
      select display_name from profiles where user_id = ${context.userId} limit 1
    `;
	return {
		id,
		userId: context.userId,
		displayName: p?.display_name || "Star",
		body,
		kind: "chat",
		giftId: null,
		createdAt: (/* @__PURE__ */ new Date()).toISOString()
	};
});
var sendGift_createServerFn_handler = createServerRpc({
	id: "9d5d7da320b66359e963a666c4f78966a9b8d9bafd413ac0d7fa5e9ec85108c5",
	name: "sendGift",
	filename: "src/lib/rooms.ts"
}, (opts) => sendGift.__executeServer(opts));
var sendGift = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(sendGift_createServerFn_handler, async ({ context, data }) => {
	const gift = giftById(data.giftId);
	if (!gift) throw new Error("Unknown gift");
	if (!data.toUser || data.toUser === context.userId) throw new Error("Pick someone else");
	const sql = await getSql();
	const [me] = await sql`
      select coins, xp, display_name from profiles where user_id = ${context.userId} limit 1
    `;
	if (!me) throw new Error("Profile missing");
	if (Number(me.coins) < gift.cost) throw new Error("Not enough coins");
	const [target] = await sql`
      select coins, charm, display_name from profiles where user_id = ${data.toUser} limit 1
    `;
	if (!target) throw new Error("User not found");
	const charm = Math.floor(gift.cost * .4);
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
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		}
	};
});
//#endregion
export { createRoom_createServerFn_handler, getRoom_createServerFn_handler, joinRoom_createServerFn_handler, kickMember_createServerFn_handler, leaveRoom_createServerFn_handler, listMessages_createServerFn_handler, listRooms_createServerFn_handler, sendGift_createServerFn_handler, sendMessage_createServerFn_handler, setMuted_createServerFn_handler, takeSeat_createServerFn_handler };
