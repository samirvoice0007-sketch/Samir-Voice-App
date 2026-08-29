try { require("dotenv").config(); } catch (_) {}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gfbf",
  jwtSecret: process.env.JWT_SECRET || "dev-only-change-me-in-production-32chars",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",
  agoraAppId: process.env.AGORA_APP_ID || "",
  agoraCertificate: process.env.AGORA_APP_CERTIFICATE || "",
  adminEmail: (process.env.ADMIN_EMAIL || "").toLowerCase(),
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  nodeEnv: process.env.NODE_ENV || "development",
  clientOrigins: (process.env.CLIENT_ORIGINS || "*").split(",").map((s) => s.trim()).filter(Boolean),
};
