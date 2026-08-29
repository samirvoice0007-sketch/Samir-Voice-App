const mongoose = require('mongoose');

const withdrawRequestSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    amountCoins: { type: Number, required: true },
    amountUSDT: { type: Number, required: true },
    recipientAddress: { type: String, required: true },
    status: { type: String, enum: ['pending', 'completed', 'rejected'], default: 'pending' },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WithdrawRequest', withdrawRequestSchema);
