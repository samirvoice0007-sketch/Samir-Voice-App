const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    telegramId: { type: String, required: true, unique: true, index: true },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    username: { type: String, default: '' },
    photoUrl: { type: String, default: '' },
    language: { type: String, default: null },
    balanceUSDT: { type: Number, default: 0 },
    referredBy: { type: String, default: null },
    referralCount: { type: Number, default: 0 },
    completedTasksCount: { type: Number, default: 0 },
    lastAdWatchAt: { type: Date, default: null },
    lastCheckInAt: { type: Date, default: null },
    checkInStreak: { type: Number, default: 0 },
    claimedAchievements: { type: [String], default: [] },
    // weekly leaderboard bucket - reset lazily when the ISO week changes
    weeklyUSDT: { type: Number, default: 0 },
    weeklyWeekKey: { type: String, default: null },
    isFake: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    // Deposit gate for withdraw (must deposit >= 1 USDT at least once)
    hasDeposited: { type: Boolean, default: false },
    totalDeposited: { type: Number, default: 0 },
    walletAddress: { type: String, default: null },

    // ==== Admin/Owner broadcast flow state (multi-step /announcement or /announcementimage) ====
    // null               -> not currently composing a broadcast
    // 'awaiting_text'    -> /announcement: waiting for the text message
    // 'awaiting_image'   -> /announcementimage: waiting for the photo
    // 'awaiting_caption' -> /announcementimage: photo received, waiting for the caption text
    // 'awaiting_button'  -> waiting for a button link, or /nobutton
    broadcastStep: {
      type: String,
      enum: [null, 'awaiting_text', 'awaiting_image', 'awaiting_caption', 'awaiting_button'],
      default: null,
    },
    broadcastDraftPhotoId: { type: String, default: null }, // Telegram file_id of the uploaded photo
    broadcastDraftText: { type: String, default: null }, // the text / caption content
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
