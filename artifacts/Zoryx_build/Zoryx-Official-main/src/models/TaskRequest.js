const mongoose = require('mongoose');

// A regular user's request to have a task posted. The user pays a fixed
// TASK_POST_PAYMENT_USDT amount out-of-band; the admin verifies the payment
// manually and then creates the real Task themselves from the Add Task form.
// This record just tracks the request/notification so nothing gets lost.
const taskRequestSchema = new mongoose.Schema(
  {
    sponsorTelegramId: { type: String, required: true, index: true },
    platform: { type: String, required: true },
    url: { type: String, required: true },
    urlNormalized: { type: String, required: true, index: true },
    title: { type: String, required: true },
    status: { type: String, enum: ['pending', 'handled', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TaskRequest', taskRequestSchema);
