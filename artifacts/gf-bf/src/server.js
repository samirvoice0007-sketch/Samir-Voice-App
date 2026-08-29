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

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.clientOrigins.includes("*") ? true : config.clientOrigins },
});
app.set("io", io);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
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

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    name: "GF BF",
    agora: Boolean(config.agoraAppId),
    time: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
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

async function start() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("[db] connected");
    await seedRooms();
  } catch (e) {
    console.error("[db] failed:", e.message);
  }
  server.listen(config.port, "0.0.0.0", () => {
    console.log(`[gf-bf] listening on :${config.port}`);
  });
}

start();
