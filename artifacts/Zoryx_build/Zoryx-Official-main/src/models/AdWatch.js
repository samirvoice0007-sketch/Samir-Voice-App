const mongoose = require('mongoose');

// A log of every ad a user has watched, so the Mini App can show a scrollable
// "your ad history" box under the Watch Ad button.
const adWatchSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    amountUSDT: { type: Number, required: true },
    watchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdWatch', adWatchSchema);
