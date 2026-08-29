const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["host", "speaker", "listener"], default: "listener" },
    seat: { type: Number, default: null },
    muted: { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 48 },
    topic: { type: String, default: "", maxlength: 80 },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isPrivate: { type: Boolean, default: false },
    password: { type: String, default: "" },
    maxSeats: { type: Number, default: 8 },
    members: [memberSchema],
    isLive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

roomSchema.methods.summary = function () {
  const speakers = this.members.filter((m) => m.role !== "listener").length;
  return {
    id: this._id.toString(),
    title: this.title,
    topic: this.topic,
    hostId: this.host ? this.host.toString() : null,
    people: this.members.length,
    speakers,
    isLive: this.isLive,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("Room", roomSchema);
