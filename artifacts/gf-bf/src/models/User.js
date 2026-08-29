const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    passwordHash: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    displayName: { type: String, required: true, trim: true, maxlength: 32 },
    avatarHue: { type: Number, default: 320 },
    bio: { type: String, default: "", maxlength: 160 },
    coins: { type: Number, default: 500 },
    charm: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    lang: { type: String, enum: ["bn", "en"], default: "bn" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    lastDailyAt: { type: Date },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

userSchema.methods.public = function () {
  return {
    id: this._id.toString(),
    displayName: this.displayName,
    avatarHue: this.avatarHue,
    bio: this.bio,
    coins: this.coins,
    charm: this.charm,
    level: this.level,
    xp: this.xp,
    lang: this.lang,
    role: this.role,
    followers: (this.followers || []).length,
    following: (this.following || []).length,
  };
};

module.exports = mongoose.model("User", userSchema);
