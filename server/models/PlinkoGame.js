import mongoose from 'mongoose';

const plinkoGameSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  betAmount: {
    type: Number,
    required: true,
    min: 10
  },
  rows: {
    type: Number,
    required: true,
    default: 8
  },
  selectedRow: {
    type: Number,
    required: true
  },
  slotIndex: {
    type: Number,
    required: true
  },
  multiplier: {
    type: Number,
    required: true
  },
  result: {
    type: String,
    enum: ['win', 'lose'],
    required: true
  },
  reward: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
plinkoGameSchema.index({ userId: 1, createdAt: -1 });
plinkoGameSchema.index({ createdAt: -1 });

const PlinkoGame = mongoose.model('PlinkoGame', plinkoGameSchema);

export default PlinkoGame;
