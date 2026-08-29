const mongoose = require('mongoose');

const depositRequestSchema = new mongoose.Schema(
  {
    telegramId: { type: String, required: true, index: true },
    amountUSDT: { type: Number, required: true },
    fromWallet: { type: String, default: '' },
    txHash: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DepositRequest', depositRequestSchema);
