import mongoose from 'mongoose';

const depositRequestSchema = new mongoose.Schema({
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
  paymentScreenshot: {
    type: String
  },
  paymentConfirmedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['created', 'pending', 'approved', 'rejected'],
    default: 'created'
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

depositRequestSchema.index({ userId: 1, status: 1 });
depositRequestSchema.index({ status: 1, createdAt: -1 });

const DepositRequest = mongoose.model('DepositRequest', depositRequestSchema);

export default DepositRequest;
