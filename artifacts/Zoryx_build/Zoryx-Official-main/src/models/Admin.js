const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    telegramId: { type: String, required: true, unique: true, index: true },
    addedBy: { type: String, default: 'owner' },
    permissions: {
      canAddTask: { type: Boolean, default: true },
      canAnnounce: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema);
