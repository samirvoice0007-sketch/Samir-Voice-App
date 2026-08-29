const express = require("express");
const Room = require("../models/Room");
const Message = require("../models/Message");
const User = require("../models/User");
const GiftSend = require("../models/GiftSend");
const { authRequired } = require("../middleware/auth");
const { buildRtcToken } = require("../services/agora");
const { giftById } = require("../services/gifts");

const router = express.Router();

function agoraUid(userId) {
  return Number.parseInt(String(userId).replace(/\D/g, "").slice(-8) || "1", 10) % 100000000;
}

router.get("/", authRequired, async (req, res) => {
  const rooms = await Room.find({ isLive: true }).sort({ updatedAt: -1 }).limit(50);
  res.json({ rooms: rooms.map((r) => r.summary()) });
});

router.post("/", authRequired, async (req, res) => {
  const title = String((req.body && req.body.title) || "").trim().slice(0, 48);
  const topic = String((req.body && req.body.topic) || "").trim().slice(0, 80);
  if (title.length < 2) return res.status(400).json({ error: "Title required" });
  const room = await Room.create({
    title,
    topic,
    host: req.user._id,
    members: [{ user: req.user._id, role: "host", seat: 0, muted: false }],
  });
  res.json({ room: room.summary() });
});

router.get("/:id", authRequired, async (req, res) => {
  const room = await Room.findById(req.params.id).populate("members.user", "displayName avatarHue");
  if (!room) return res.status(404).json({ error: "Room not found" });
  const members = room.members.map((m) => ({
    userId: m.user?._id?.toString() || m.user?.toString(),
    displayName: m.user?.displayName || "Star",
    avatarHue: m.user?.avatarHue ?? 320,
    role: m.role,
    seat: m.seat,
    muted: m.muted,
  }));
  res.json({
    id: room._id.toString(),
    title: room.title,
    topic: room.topic,
    hostId: room.host?.toString(),
    members,
  });
});

router.post("/:id/join", authRequired, async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room || !room.isLive) return res.status(404).json({ error: "Room not found" });
  const exists = room.members.find((m) => m.user.toString() === req.user._id.toString());
  if (!exists) {
    room.members.push({ user: req.user._id, role: "listener", seat: null, muted: true });
    await room.save();
  }
  const uid = agoraUid(req.user._id);
  const token = buildRtcToken(room._id.toString(), uid);
  const io = req.app.get("io");
  if (io) io.to(`room:${room._id}`).emit("room-update", { type: "join", userId: req.user._id.toString() });
  res.json({ ok: true, agora: token });
});

router.post("/:id/leave", authRequired, async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.json({ ok: true });
  room.members = room.members.filter((m) => m.user.toString() !== req.user._id.toString());
  if (room.members.length === 0) room.isLive = false;
  await room.save();
  const io = req.app.get("io");
  if (io) io.to(`room:${room._id}`).emit("room-update", { type: "leave", userId: req.user._id.toString() });
  res.json({ ok: true });
});

router.post("/:id/seat", authRequired, async (req, res) => {
  const seat = Number(req.body?.seat);
  if (!Number.isInteger(seat) || seat < 0 || seat > 7) return res.status(400).json({ error: "Invalid seat" });
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found" });
  const taken = room.members.find((m) => m.seat === seat && m.user.toString() !== req.user._id.toString());
  if (taken) return res.status(409).json({ error: "Seat taken" });
  const me = room.members.find((m) => m.user.toString() === req.user._id.toString());
  if (!me) return res.status(400).json({ error: "Join room first" });
  me.seat = seat;
  if (me.role !== "host") me.role = "speaker";
  me.muted = false;
  await room.save();
  const io = req.app.get("io");
  if (io) io.to(`room:${room._id}`).emit("room-update", { type: "seat" });
  res.json({ ok: true });
});

router.post("/:id/mute", authRequired, async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found" });
  const me = room.members.find((m) => m.user.toString() === req.user._id.toString());
  if (!me) return res.status(400).json({ error: "Not in room" });
  me.muted = Boolean(req.body?.muted);
  await room.save();
  res.json({ ok: true, muted: me.muted });
});

router.post("/:id/kick", authRequired, async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found" });
  const isHost = room.host && room.host.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";
  if (!isHost && !isAdmin) return res.status(403).json({ error: "Host only" });
  const targetId = String(req.body?.userId || "");
  room.members = room.members.filter((m) => m.user.toString() !== targetId);
  await room.save();
  const io = req.app.get("io");
  if (io) io.to(`room:${room._id}`).emit("room-update", { type: "kick", userId: targetId });
  res.json({ ok: true });
});

router.get("/:id/messages", authRequired, async (req, res) => {
  const msgs = await Message.find({ room: req.params.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("user", "displayName");
  res.json({
    messages: msgs.reverse().map((m) => ({
      id: m._id.toString(),
      userId: m.user?._id?.toString(),
      displayName: m.user?.displayName || "Star",
      body: m.body,
      kind: m.kind,
      giftId: m.giftId,
      createdAt: m.createdAt,
    })),
  });
});

router.post("/:id/messages", authRequired, async (req, res) => {
  const body = String(req.body?.body || "").trim().slice(0, 280);
  if (!body) return res.status(400).json({ error: "Empty message" });
  const msg = await Message.create({ room: req.params.id, user: req.user._id, body, kind: "chat" });
  const payload = {
    id: msg._id.toString(),
    userId: req.user._id.toString(),
    displayName: req.user.displayName,
    body: msg.body,
    kind: "chat",
    giftId: null,
    createdAt: msg.createdAt,
  };
  const io = req.app.get("io");
  if (io) io.to(`room:${req.params.id}`).emit("chat", payload);
  res.json({ id: msg._id.toString() });
});

router.post("/:id/gift", authRequired, async (req, res) => {
  const gift = giftById(req.body?.giftId);
  const toUserId = req.body?.toUser;
  if (!gift) return res.status(400).json({ error: "Unknown gift" });
  if (!toUserId || toUserId === req.user._id.toString()) {
    return res.status(400).json({ error: "Pick someone else" });
  }
  const me = await User.findById(req.user._id);
  if (me.coins < gift.cost) return res.status(400).json({ error: "Not enough coins" });
  const target = await User.findById(toUserId);
  if (!target) return res.status(404).json({ error: "User not found" });

  me.coins -= gift.cost;
  me.xp += 5;
  const charm = Math.floor(gift.cost * 0.4);
  target.charm += charm;
  target.coins += charm;
  await me.save();
  await target.save();

  await GiftSend.create({
    room: req.params.id,
    from: me._id,
    to: target._id,
    giftId: gift.id,
    cost: gift.cost,
  });

  const msg = await Message.create({
    room: req.params.id,
    user: me._id,
    body: gift.id,
    kind: "gift",
    giftId: gift.id,
  });

  const payload = {
    id: msg._id.toString(),
    userId: me._id.toString(),
    displayName: me.displayName,
    body: gift.id,
    kind: "gift",
    giftId: gift.id,
    emoji: gift.emoji,
    toUser: target._id.toString(),
    toName: target.displayName,
    createdAt: msg.createdAt,
  };
  const io = req.app.get("io");
  if (io) io.to(`room:${req.params.id}`).emit("chat", payload);
  res.json({ ok: true, gift, coins: me.coins });
});

router.get("/:id/agora", authRequired, async (req, res) => {
  const uid = agoraUid(req.user._id);
  res.json(buildRtcToken(req.params.id, uid));
});

module.exports = router;
