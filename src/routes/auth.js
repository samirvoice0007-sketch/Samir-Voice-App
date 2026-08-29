const express = require("express");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const config = require("../config");
const { signToken, authRequired } = require("../middleware/auth");
const { verifyIdToken, isConfigured: firebaseConfigured } = require("../services/firebase");

const router = express.Router();
const BCRYPT_ROUNDS = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let googleClient = null;
function getGoogleClient() {
  if (!config.googleClientId) return null;
  if (!googleClient) googleClient = new OAuth2Client(config.googleClientId);
  return googleClient;
}

function hueFrom(str) {
  let n = 0;
  for (let i = 0; i < String(str).length; i++) n = (n + String(str).charCodeAt(i) * 17) % 360;
  return n;
}

function roleForEmail(email) {
  if (config.adminEmail && email && String(email).toLowerCase() === config.adminEmail) return "admin";
  return "user";
}

async function verifyGoogleIdToken(idToken) {
  const client = getGoogleClient();
  if (!client) {
    const err = new Error("Google login is not configured");
    err.status = 503;
    throw err;
  }
  if (!idToken || typeof idToken !== "string") {
    const err = new Error("Google ID token required");
    err.status = 400;
    throw err;
  }
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      const err = new Error("Invalid Google token");
      err.status = 401;
      throw err;
    }
    return payload;
  } catch (e) {
    if (e.status) throw e;
    const err = new Error("Invalid or expired Google token");
    err.status = 401;
    throw err;
  }
}

router.get("/config", (_req, res) => {
  res.json({
    googleClientId: config.googleClientId || "",
    firebase: {
      apiKey: config.firebaseApiKey || "",
      authDomain: config.firebaseAuthDomain || "",
      projectId: config.firebaseProjectId || "",
      appId: config.firebaseAppId || "",
    },
  });
});

router.post("/register", async (req, res) => {
  try {
    const { email, password, displayName, lang } = req.body || {};
    if (!email || !EMAIL_RE.test(String(email))) {
      return res.status(400).json({ error: "Valid email required" });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: "Email and password (min 6) required" });
    }
    const normalized = String(email).toLowerCase().trim();
    const exists = await User.findOne({ email: normalized });
    if (exists) return res.status(409).json({ error: "Email already registered" });
    const passwordHash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
    const name = (displayName || normalized.split("@")[0] || "Star").toString().trim().slice(0, 32);
    const user = await User.create({
      email: normalized,
      passwordHash,
      displayName: name || "Star",
      avatarHue: hueFrom(normalized),
      lang: lang === "en" ? "en" : "bn",
      role: roleForEmail(normalized),
    });
    res.json({ token: signToken(user), user: user.public() });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Register failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user || !user.passwordHash) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    res.json({ token: signToken(user), user: user.public() });
  } catch (e) {
    res.status(500).json({ error: e.message || "Login failed" });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { idToken, lang } = req.body || {};
    const payload = await verifyGoogleIdToken(idToken);
    const googleId = String(payload.sub);
    const email = payload.email && payload.email_verified ? String(payload.email).toLowerCase() : undefined;
    const name = String(payload.name || payload.given_name || (email ? email.split("@")[0] : "Google User")).slice(0, 32);

    let user = await User.findOne({ googleId });
    if (!user && email) user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        googleId,
        email,
        displayName: name,
        avatarHue: hueFrom(googleId),
        lang: lang === "en" ? "en" : "bn",
        role: roleForEmail(email),
      });
    } else {
      user.googleId = googleId;
      if (email && !user.email) user.email = email;
      if (!user.displayName) user.displayName = name;
      if (roleForEmail(user.email || email) === "admin") user.role = "admin";
      await user.save();
    }
    res.json({ token: signToken(user), user: user.public() });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Google login failed" });
  }
});

router.post("/phone", async (req, res) => {
  try {
    const { idToken, displayName, lang } = req.body || {};
    if (!firebaseConfigured()) {
      return res.status(503).json({ error: "Phone login is not configured" });
    }
    const decoded = await verifyIdToken(idToken);
    const phone = decoded.phone_number ? String(decoded.phone_number).replace(/\s+/g, "") : "";
    if (!phone) return res.status(400).json({ error: "Phone number missing on Firebase token" });
    const firebaseUid = String(decoded.uid);

    let user = await User.findOne({ $or: [{ firebaseUid }, { phone }] });
    if (!user) {
      user = await User.create({
        phone,
        firebaseUid,
        displayName: String(displayName || `User${phone.slice(-4)}`).slice(0, 32),
        avatarHue: hueFrom(phone),
        lang: lang === "en" ? "en" : "bn",
      });
    } else {
      user.firebaseUid = firebaseUid;
      user.phone = phone;
      if (displayName) user.displayName = String(displayName).slice(0, 32);
      await user.save();
    }
    res.json({ token: signToken(user), user: user.public() });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Phone login failed" });
  }
});

router.get("/me", authRequired, async (req, res) => {
  res.json({ user: req.user.public() });
});

module.exports = router;
