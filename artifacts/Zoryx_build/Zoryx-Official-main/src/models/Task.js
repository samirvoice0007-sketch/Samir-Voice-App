const mongoose = require('mongoose');

const PLATFORMS = [
  'telegram_channel',
  'telegram_bot',
  'discord',
  'youtube',
  'tiktok',
  'instagram',
  'facebook',
  'twitter',
  'website',
];

const ACTIONS = ['join', 'start', 'visit', 'follow', 'like', 'comment', 'share', 'subscribe', 'repost'];

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    url: { type: String, required: true },
    urlNormalized: { type: String, required: true, index: true }, // lowercase/trimmed, used for spam/duplicate checks
    platform: { type: String, enum: PLATFORMS, default: 'website' },
    actionType: { type: String, enum: ACTIONS, default: 'visit' },
    rewardUSDT: { type: Number, default: 0.01 },
    channelUsername: { type: String, default: null },
    active: { type: Boolean, default: true },
    createdBy: { type: String, default: 'owner' },
    maxCompletions: { type: Number, default: null }, // null = unlimited
    completionsCount: { type: Number, default: 0 },
    pinned: { type: Boolean, default: false, index: true },
    pinOrder: { type: Number, default: 0 }, // higher = higher on list
  },
  { timestamps: true }
);

taskSchema.statics.PLATFORMS = PLATFORMS;
taskSchema.statics.ACTIONS = ACTIONS;

module.exports = mongoose.model('Task', taskSchema);
