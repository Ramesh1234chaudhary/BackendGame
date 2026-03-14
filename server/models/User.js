import mongoose from 'mongoose';

// Generate unique referral code
const generateReferralCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'BOX' + code;
};

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  avatar: {
    type: String,
    default: ''
  },
  walletBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  // Game winnings that can be withdrawn (separate from deposited money)
  gameWinnings: {
    type: Number,
    default: 0,
    min: 0
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  // Referral system
  referralCode: {
    type: String,
    unique: true,
    default: generateReferralCode
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  referralCount: {
    type: Number,
    default: 0
  },
  referralEarnings: {
    type: Number,
    default: 0
  },
  hasPlayedFirstGame: {
    type: Boolean,
    default: false
  },
  hasMadeFirstDeposit: {
    type: Boolean,
    default: false
  },
  hasReceivedFirstLoginBonus: {
    type: Boolean,
    default: false
  },
  // Wallet lock to prevent race conditions
  walletLock: {
    type: Boolean,
    default: false
  },
  // Transaction lock timeout
  lockExpiresAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
userSchema.index({ walletBalance: 1 });
userSchema.index({ referredBy: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for wallet lock status
userSchema.virtual('isWalletLocked').get(function() {
  return this.walletLock && this.lockExpiresAt && this.lockExpiresAt > new Date();
});

// Pre-save middleware
userSchema.pre('save', function(next) {
  // Ensure wallet balance is never negative
  if (this.walletBalance < 0) {
    this.walletBalance = 0;
  }
  next();
});

const User = mongoose.model('User', userSchema);

export default User;
