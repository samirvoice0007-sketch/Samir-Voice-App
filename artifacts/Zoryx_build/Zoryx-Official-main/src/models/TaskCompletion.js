const mongoose = require('mongoose');

const taskCompletionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    status: {
      type: String,
      // started              -> user tapped Go
      // pending_verification -> user submitted a username for manual review (social platforms)
      // claimable            -> verified (auto/wait check passed, or admin approved) but NOT credited yet
      // completed            -> user tapped Claim, balance credited
      enum: ['started', 'pending_verification', 'claimable', 'completed'],
      default: 'started',
    },
    submittedUsername: { type: String, default: null }, // username the user submitted for manual review
    startedAt: { type: Date, default: Date.now },
    claimableAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

taskCompletionSchema.index({ userId: 1, taskId: 1 }, { unique: true });

module.exports = mongoose.model('TaskCompletion', taskCompletionSchema);
