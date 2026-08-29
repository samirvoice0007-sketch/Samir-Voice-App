const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: { type: String, index: true },
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['text', 'gift', 'system', 'emoji'], default: 'text' },
  text: String,
  giftId: String,
  giftCount: Number,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
