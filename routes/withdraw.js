import express from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth.js';
import User from '../models/User.js';
import WithdrawRequest from '../models/WithdrawRequest.js';
import Transaction from '../models/Transaction.js';

const router = express.Router();

const MIN_WITHDRAWAL = 150;
const LOCK_TIMEOUT = 5000;

// Acquire wallet lock
const acquireLock = async (userId, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    const user = await User.findById(userId);
    if (!user.walletLock || !user.lockExpiresAt || user.lockExpiresAt < new Date()) {
      await User.findByIdAndUpdate(userId, {
        walletLock: true,
        lockExpiresAt: new Date(Date.now() + LOCK_TIMEOUT)
      });
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return false;
};

// Release wallet lock
const releaseLock = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, {
      walletLock: false,
      lockExpiresAt: null
    });
  } catch (err) {
    console.error('Error releasing lock:', err);
  }
};

// Create withdrawal request
router.post('/request', authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, upiId } = req.body;
    const userId = req.userId;

    // Validate amount
    if (!amount || amount < MIN_WITHDRAWAL) {
      await session.abortTransaction();
      return res.status(400).json({ message: `Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}` });
    }

    // Validate UPI ID
    if (!upiId || !upiId.includes('@')) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Please enter a valid UPI ID' });
    }

    // Try to acquire lock
    const lockAcquired = await acquireLock(userId);
    if (!lockAcquired) {
      await session.abortTransaction();
      return res.status(429).json({ message: 'System busy, please try again' });
    }

    try {
      // Atomically deduct from gameWinnings and check balance
      const updatedUser = await User.findOneAndUpdate(
        { _id: userId, gameWinnings: { $gte: amount } },
        { $inc: { walletBalance: -amount, gameWinnings: -amount } },
        { new: true, session }
      );

      if (!updatedUser) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Insufficient withdrawable balance. You can only withdraw your game winnings!' });
      }

      // Create withdrawal request
      const withdrawRequest = new WithdrawRequest({
        userId,
        amount,
        upiId,
        status: 'pending'
      });
      await withdrawRequest.save({ session });

      // Create transaction record
      const transaction = new Transaction({
        userId,
        type: 'withdraw',
        amount,
        status: 'pending',
        paymentMethod: 'upi',
        description: `Withdrawal request to ${upiId}`
      });
      await transaction.save({ session });

      // Commit transaction
      await session.commitTransaction();

      res.json({
        message: 'Withdrawal request submitted for approval',
        withdrawId: withdrawRequest._id,
        amount,
        status: 'pending'
      });
    } finally {
      await releaseLock(userId);
    }
  } catch (error) {
    await session.abortTransaction();
    console.error('Withdrawal request error:', error);
    res.status(500).json({ message: 'Error creating withdrawal request' });
  } finally {
    session.endSession();
  }
});

// Get user's withdrawal requests
router.get('/requests', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const withdrawals = await WithdrawRequest.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await WithdrawRequest.countDocuments({ userId: req.userId });

    res.json({
      withdrawals,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching withdrawal requests' });
  }
});

export default router;
