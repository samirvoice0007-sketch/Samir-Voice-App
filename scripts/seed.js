try { require("dotenv").config(); } catch (_) {}
const mongoose = require("mongoose");
const config = require("../src/config");
const Room = require("../src/models/Room");

async function main() {
  await mongoose.connect(config.mongoUri);
  await Room.deleteMany({ host: null });
  await Room.insertMany([
    { title: "Rose Lounge", topic: "Late night talks · রাতের গল্প", host: null, members: [], isLive: true },
    { title: "GF BF Party", topic: "Flirty party room · পার্টি রুম", host: null, members: [], isLive: true },
    { title: "Music Night", topic: "Sing & vibe · গান আর আড্ডা", host: null, members: [], isLive: true },
  ]);
  console.log("Seeded 3 rooms");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
