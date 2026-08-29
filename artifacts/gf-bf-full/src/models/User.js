const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: String, index: true },
  phone: { type: String, index: true },
  email: { type: String, index: true },
  googleId: String,
  name: { type: String, default: 'Guest' },
  nickname: { type: String, default: '' },
  avatar: { type: String, default: '' },
  gender: { type: String, enum: ['Boy', 'Girl', 'Other', ''], default: '' },
  birthday: String,
  bio: { type: String, default: '' },
  country: { type: String, default: 'Bangladesh' },
  language: { type: String, default: 'en' },
  coins: { type: Number, default: 1000 },
  diamonds: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },
  svipLevel: { type: Number, default: 0 },
  svipPoints: { type: Number, default: 0 },
  followers: { type: Number, default: 0 },
  following: { type: Number, default: 0 },
  visitors: { type: Number, default: 0 },
  isAdmin: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  inviteCode: { type: String, unique: true, sparse: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  inviteCount: { type: Number, default: 0 },
  totalInviteCoins: { type: Number, default: 0 },
  dailyRewardDay: { type: Number, default: 0 },
  lastDailyReward: Date,
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' },
  cpPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  gifts: [{ giftId: String, count: { type: Number, default: 0 } }],
  frames: [String],
  vehicles: [String],
  medals: [String],
  theme: { type: String, default: 'dark' },
  lastOnline: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    name: this.name || this.nickname || 'User',
    nickname: this.nickname,
    avatar: this.avatar,
    gender: this.gender,
    bio: this.bio,
    country: this.country,
    level: this.level,
    svipLevel: this.svipLevel,
    coins: this.coins,
    diamonds: this.diamonds,
    followers: this.followers,
    following: this.following,
    visitors: this.visitors,
    isAdmin: this.isAdmin
  };
};

module.exports = mongoose.model('User', userSchema);
