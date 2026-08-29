const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const config = require("./config");
const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/rooms");
const userRoutes = require("./routes/user");
const Room = require("./models/Room");

function resolveCorsOrigin() {
  if (config.nodeEnv !== "production") return true;
  const allowed = config.clientOrigins.filter((o) => o && o !== "*");
  if (!allowed.length) return false;
  return (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowed.includes(origin)) return cb(null, true);
    return cb(null, false);
  };
}

const corsOrigin = resolveCorsOrigin();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: corsOrigin, credentials: true },
});
app.set("io", io);
app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 240,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait and try again." },
  skip: (req) => req.method === "GET",
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    name: "GF BF",
    agora: Boolean(config.agoraAppId),
    google: Boolean(config.googleClientId),
    firebase: Boolean(config.firebaseProjectId && config.firebaseClientEmail),
    time: new Date().toISOString(),
  });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/user", userRoutes);

app.use(express.static(path.join(__dirname, "../public")));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId) => {
    if (roomId) socket.join(`room:${roomId}`);
  });
  socket.on("leave-room", (roomId) => {
    if (roomId) socket.leave(`room:${roomId}`);
  });
});

async function seedRooms() {
  const count = await Room.countDocuments();
  if (count > 0) return;
  await Room.insertMany([
    { title: "Rose Lounge", topic: "Late night talks · রাতের গল্প", host: null, members: [], isLive: true },
    { title: "GF BF Party", topic: "Flirty party room · পার্টি রুম", host: null, members: [], isLive: true },
    { title: "Music Night", topic: "Sing & vibe · গান আর আড্ডা", host: null, members: [], isLive: true },
  ]);
  console.log("[seed] starter rooms created");
}

async function connectDb() {
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log("[db] connected");
    return true;
  } catch (e) {
    console.error("[db] failed:", e.message);
    if (config.nodeEnv === "production") throw e;
  }
  try {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const mem = await MongoMemoryServer.create();
    await mongoose.connect(mem.getUri());
    console.log("[db] in-memory MongoDB (dev/preview)");
    return true;
  } catch (e) {
    console.error("[db] memory server failed:", e.message);
    return false;
  }
}

async function start() {
  const ok = await connectDb();
  if (ok) await seedRooms();
  server.listen(config.port, "0.0.0.0", () => {
    console.log(`[gf-bf] listening on :${config.port}`);
  });
}

start().catch((e) => {
  console.error("[fatal]", e);
  process.exit(1);
});
