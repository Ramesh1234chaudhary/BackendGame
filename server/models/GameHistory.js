import mongoose from 'mongoose';

const gameHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  betAmount: {
    type: Number,
    required: true,
    default: 10
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
  selectedBox: {
    type: Number,
    required: true
  },
  winningBox: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

gameHistorySchema.index({ userId: 1, createdAt: -1 });

const GameHistory = mongoose.model('GameHistory', gameHistorySchema);

export default GameHistory;
