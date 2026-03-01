const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
    scoreBreakdown: {
      skills: { type: Number, default: 0 },
      goal: { type: Number, default: 0 },
      availability: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Prevent duplicate connection requests
MatchSchema.index({ requester: 1, recipient: 1 }, { unique: true });
MatchSchema.index({ recipient: 1 });
MatchSchema.index({ status: 1 });

module.exports = mongoose.model('Match', MatchSchema);
