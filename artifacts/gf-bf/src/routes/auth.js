const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const config = require("../config");
const { signToken, authRequired } = require("../middleware/auth");

const router = express.Router();

function hueFrom(str) {
  let n = 0;
  for (let i = 0; i < String(str).length; i++) n = (n + String(str).charCodeAt(i) * 17) % 360;
  return n;
}

router.post("/register", async (req, res) => {
  try {
    const { email, password, displayName, lang } = req.body || {};
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: "Email and password (min 6) required" });
    }
    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) return res.status(409).json({ error: "Email already registered" });
    const passwordHash = await bcrypt.hash(password, 10);
    const name = (displayName || email.split("@")[0] || "Star").slice(0, 32);
    const user = await User.create({
      email: String(email).toLowerCase(),
      passwordHash,
      displayName: name,
      avatarHue: hueFrom(email),
      lang: lang === "en" ? "en" : "bn",
      role: config.adminEmail && String(email).toLowerCase() === config.adminEmail ? "admin" : "user",
    });
    res.json({ token: signToken(user), user: user.public() });
  } catch (e) {
    res.status(500).json({ error: e.message || "Register failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user || !user.passwordHash) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    res.json({ token: signToken(user), user: user.public() });
  } catch (e) {
    res.status(500).json({ error: e.message || "Login failed" });
  }
});

router.post("/guest", async (req, res) => {
  try {
    const name = String((req.body && req.body.displayName) || `Guest${Math.floor(Math.random() * 9000 + 1000)}`).slice(0, 24);
    const email = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@gfbf.local`;
    const user = await User.create({
      email,
      displayName: name,
      avatarHue: Math.floor(Math.random() * 360),
      passwordHash: await bcrypt.hash(Math.random().toString(36), 8),
    });
    res.json({ token: signToken(user), user: user.public() });
  } catch (e) {
    res.status(500).json({ error: e.message || "Guest failed" });
  }
});

/** Google ID token login — send { idToken, displayName } from Google Sign-In client */
router.post("/google", async (req, res) => {
  try {
    const { googleId, email, displayName } = req.body || {};
    if (!googleId) return res.status(400).json({ error: "googleId required" });
    let user = await User.findOne({ $or: [{ googleId }, email ? { email: String(email).toLowerCase() } : { _id: null }] });
    if (!user) {
      user = await User.create({
        googleId: String(googleId),
        email: email ? String(email).toLowerCase() : undefined,
        displayName: (displayName || "Google User").slice(0, 32),
        avatarHue: hueFrom(googleId),
        role: config.adminEmail && email && String(email).toLowerCase() === config.adminEmail ? "admin" : "user",
      });
    } else {
      user.googleId = String(googleId);
      if (displayName) user.displayName = String(displayName).slice(0, 32);
      await user.save();
    }
    res.json({ token: signToken(user), user: user.public() });
  } catch (e) {
    res.status(500).json({ error: e.message || "Google login failed" });
  }
});

/** Phone OTP verify — after Firebase/client verifies OTP, send { phone, displayName } */
router.post("/phone", async (req, res) => {
  try {
    const { phone, displayName } = req.body || {};
    if (!phone || String(phone).length < 8) return res.status(400).json({ error: "Valid phone required" });
    const normalized = String(phone).replace(/\s+/g, "");
    let user = await User.findOne({ phone: normalized });
    if (!user) {
      user = await User.create({
        phone: normalized,
        displayName: (displayName || `User${normalized.slice(-4)}`).slice(0, 32),
        avatarHue: hueFrom(normalized),
      });
    }
    res.json({ token: signToken(user), user: user.public() });
  } catch (e) {
    res.status(500).json({ error: e.message || "Phone login failed" });
  }
});

router.get("/me", authRequired, async (req, res) => {
  res.json({ user: req.user.public() });
});

module.exports = router;
