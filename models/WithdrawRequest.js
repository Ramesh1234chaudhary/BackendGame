import mongoose from 'mongoose';

const withdrawRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  upiId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  adminNotes: {
    type: String
  },
  processedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

withdrawRequestSchema.index({ userId: 1, status: 1 });
withdrawRequestSchema.index({ status: 1, createdAt: -1 });

const WithdrawRequest = mongoose.model('WithdrawRequest', withdrawRequestSchema);

export default WithdrawRequest;
