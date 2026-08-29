const mongoose = require("mongoose");

const giftSendSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    giftId: { type: String, required: true },
    cost: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GiftSend", giftSendSchema);
