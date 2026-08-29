const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema({
  giftId: { type: String, unique: true },
  name: String,
  icon: String,
  price: { type: Number, default: 10 },
  category: { type: String, default: 'normal' },
  animation: String,
  isSvip: { type: Boolean, default: false },
  sort: { type: Number, default: 0 }
});

module.exports = mongoose.model('Gift', giftSchema);
