const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, maxlength: 280 },
    kind: { type: String, enum: ["chat", "gift", "system"], default: "chat" },
    giftId: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
