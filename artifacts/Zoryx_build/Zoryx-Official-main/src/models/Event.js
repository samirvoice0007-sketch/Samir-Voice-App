const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    link: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    active: { type: Boolean, default: true },
    createdBy: { type: String, default: 'owner' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);
