const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  index: Number,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  locked: { type: Boolean, default: false },
  muted: { type: Boolean, default: false }
}, { _id: false });

const roomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true, index: true },
  name: { type: String, default: 'My Room' },
  announcement: { type: String, default: 'Welcome to my room, let\'s chat together!' },
  cover: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  password: { type: String, default: '' },
  isPrivate: { type: Boolean, default: false },
  seats: { type: [seatSchema], default: () => Array.from({ length: 13 }, (_, i) => ({ index: i, userId: null, locked: false, muted: false })) },
  maxMic: { type: Number, default: 13 },
  whoCanChat: { type: String, default: 'Anyone' },
  whoCanMic: { type: String, default: 'Anyone' },
  superMic: { type: Boolean, default: false },
  theme: { type: String, default: 'aurora' },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  superAdmins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blocked: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  onlineCount: { type: Number, default: 0 },
  totalCoins: { type: Number, default: 0 },
  tags: [String],
  isLive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', roomSchema);
