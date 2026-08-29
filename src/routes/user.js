const express = require("express");
const User = require("../models/User");
const GiftSend = require("../models/GiftSend");
const { authRequired } = require("../middleware/auth");
const { GIFTS } = require("../services/gifts");

const router = express.Router();

router.get("/profile", authRequired, async (req, res) => {
  res.json({ user: req.user.public(), gifts: GIFTS });
});

router.patch("/profile", authRequired, async (req, res) => {
  const { displayName, bio, lang } = req.body || {};
  if (displayName) req.user.displayName = String(displayName).trim().slice(0, 32);
  if (typeof bio === "string") req.user.bio = bio.slice(0, 160);
  if (lang === "bn" || lang === "en") req.user.lang = lang;
  await req.user.save();
  res.json({ user: req.user.public() });
});

router.post("/daily", authRequired, async (req, res) => {
  const now = new Date();
  const last = req.user.lastDailyAt ? new Date(req.user.lastDailyAt) : null;
  if (last && last.toDateString() === now.toDateString()) {
    return res.json({ ok: false, message: "Already claimed today", coins: req.user.coins });
  }
  req.user.coins += 50;
  req.user.xp += 10;
  req.user.lastDailyAt = now;
  if (req.user.xp >= req.user.level * 100) req.user.level += 1;
  await req.user.save();
  res.json({ ok: true, coins: req.user.coins, level: req.user.level });
});

router.get("/gifts/history", authRequired, async (req, res) => {
  const rows = await GiftSend.find({
    $or: [{ from: req.user._id }, { to: req.user._id }],
  })
    .sort({ createdAt: -1 })
    .limit(30);
  res.json({
    history: rows.map((r) => ({
      id: r._id.toString(),
      giftId: r.giftId,
      cost: r.cost,
      from: r.from.toString(),
      to: r.to.toString(),
      createdAt: r.createdAt,
      catalog: GIFTS.find((g) => g.id === r.giftId) || null,
    })),
  });
});

router.post("/follow/:id", authRequired, async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ error: "Cannot follow yourself" });
  }
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ error: "User not found" });
  const uid = req.user._id;
  const following = req.user.following.map(String).includes(req.params.id);
  if (following) {
    req.user.following = req.user.following.filter((id) => id.toString() !== req.params.id);
    target.followers = target.followers.filter((id) => id.toString() !== uid.toString());
  } else {
    req.user.following.push(target._id);
    target.followers.push(uid);
  }
  await req.user.save();
  await target.save();
  res.json({ following: !following });
});

module.exports = router;
