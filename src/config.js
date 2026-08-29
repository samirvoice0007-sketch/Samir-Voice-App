try {
  require("dotenv").config();
} catch (_) {}

const crypto = require("crypto");

const nodeEnv = process.env.NODE_ENV || "development";

function resolveJwtSecret() {
  const fromEnv = String(process.env.JWT_SECRET || "");
  const weak =
    !fromEnv ||
    fromEnv.length < 32 ||
    /^(secret|changeme|jwtsecret|dev-only|password|123456)/i.test(fromEnv);
  if (nodeEnv === "production" && weak) {
    throw new Error("JWT_SECRET must be set to a strong value (32+ characters) in production");
  }
  if (weak) {
    if (!resolveJwtSecret._dev) {
      resolveJwtSecret._dev = crypto.randomBytes(48).toString("hex");
      console.warn("[config] JWT_SECRET missing or weak — using a random dev secret (sessions reset on restart)");
    }
    return resolveJwtSecret._dev;
  }
  return fromEnv;
}

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || "";

module.exports = {
  port: Number(process.env.PORT) || 8080,
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gfbf",
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",
  agoraAppId: process.env.AGORA_APP_ID || "",
  agoraCertificate: process.env.AGORA_APP_CERTIFICATE || "",
  adminEmail: (process.env.ADMIN_EMAIL || "").toLowerCase(),
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  firebaseProjectId,
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
  firebasePrivateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  firebaseApiKey: process.env.FIREBASE_API_KEY || "",
  firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN || (firebaseProjectId ? `${firebaseProjectId}.firebaseapp.com` : ""),
  firebaseAppId: process.env.FIREBASE_APP_ID || "",
  nodeEnv,
  clientOrigins: (process.env.CLIENT_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
