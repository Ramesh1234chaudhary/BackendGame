import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import User from '../models/User.js';
import DepositRequest from '../models/DepositRequest.js';
import WithdrawRequest from '../models/WithdrawRequest.js';
import Transaction from '../models/Transaction.js';

const router = express.Router();

// Get all pending deposits
router.get('/deposits', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;

    const query = {};
    if (status !== 'all') query.status = status;

    const deposits = await DepositRequest.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await DepositRequest.countDocuments(query);

    res.json({
      deposits,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching deposits' });
  }
});

// Approve deposit
router.post('/deposit/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const { depositId } = req.body;

    const deposit = await DepositRequest.findById(depositId);
    if (!deposit) {
      return res.status(404).json({ message: 'Deposit request not found' });
    }

    if (deposit.status !== 'pending') {
      return res.status(400).json({ message: 'Deposit already processed' });
    }

    // Update deposit status
    deposit.status = 'approved';
    await deposit.save();

    // Update user wallet
    const user = await User.findById(deposit.userId);
    user.walletBalance += deposit.amount;
    
    // Mark first deposit if not already done
    if (!user.hasMadeFirstDeposit) {
      user.hasMadeFirstDeposit = true;
    }
    await user.save();

    // Create transaction record
    const transaction = new Transaction({
      userId: deposit.userId,
      type: 'deposit',
      amount: deposit.amount,
      status: 'completed',
      paymentMethod: 'upi',
      description: 'Deposit approved'
    });
    await transaction.save();

    // Link transaction to deposit
    deposit.transactionId = transaction._id;
    await deposit.save();

    // Notify user via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('deposit-approved', {
        userId: deposit.userId.toString(),
        amount: deposit.amount,
        newBalance: user.walletBalance
      });
    }

    res.json({
      message: 'Deposit approved successfully',
      deposit
    });
  } catch (error) {
    console.error('Approve deposit error:', error);
    res.status(500).json({ message: 'Error approving deposit' });
  }
});

// Reject deposit
router.post('/deposit/reject', authenticate, requireAdmin, async (req, res) => {
  try {
    const { depositId, reason } = req.body;

    const deposit = await DepositRequest.findById(depositId);
    if (!deposit) {
      return res.status(404).json({ message: 'Deposit request not found' });
    }

    if (deposit.status !== 'pending') {
      return res.status(400).json({ message: 'Deposit already processed' });
    }

    deposit.status = 'rejected';
    await deposit.save();

    // Notify user via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('deposit-rejected', {
        userId: deposit.userId.toString(),
        depositId: deposit._id,
        reason: reason || 'Payment not verified'
      });
    }

    res.json({
      message: 'Deposit rejected',
      deposit
    });
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting deposit' });
  }
});

// Get all pending withdrawals
router.get('/withdrawals', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;

    const query = {};
    if (status !== 'all') query.status = status;

    const withdrawals = await WithdrawRequest.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await WithdrawRequest.countDocuments(query);

    res.json({
      withdrawals,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching withdrawals' });
  }
});

// Approve withdrawal
router.post('/withdraw/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const { withdrawId } = req.body;

    const withdrawal = await WithdrawRequest.findById(withdrawId);
    if (!withdrawal) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ message: 'Withdrawal already processed' });
    }

    // Update withdrawal status
    withdrawal.status = 'approved';
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    // Create transaction record
    const transaction = new Transaction({
      userId: withdrawal.userId,
      type: 'withdraw',
      amount: withdrawal.amount,
      status: 'completed',
      paymentMethod: 'upi',
      description: `Withdrawal to ${withdrawal.upiId}`
    });
    await transaction.save();

    // Link transaction to withdrawal
    withdrawal.transactionId = transaction._id;
    await withdrawal.save();

    res.json({
      message: 'Withdrawal approved successfully',
      withdrawal
    });
  } catch (error) {
    console.error('Approve withdrawal error:', error);
    res.status(500).json({ message: 'Error approving withdrawal' });
  }
});

// Reject withdrawal
router.post('/withdraw/reject', authenticate, requireAdmin, async (req, res) => {
  try {
    const { withdrawId, reason } = req.body;

    const withdrawal = await WithdrawRequest.findById(withdrawId);
    if (!withdrawal) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ message: 'Withdrawal already processed' });
    }

    // Refund to user wallet
    const user = await User.findById(withdrawal.userId);
    user.walletBalance += withdrawal.amount;
    await user.save();

    withdrawal.status = 'rejected';
    withdrawal.adminNotes = reason || 'Rejected by admin';
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    // Create refund transaction
    const transaction = new Transaction({
      userId: withdrawal.userId,
      type: 'withdraw',
      amount: withdrawal.amount,
      status: 'cancelled',
      description: 'Withdrawal rejected - refund'
    });
    await transaction.save();

    res.json({
      message: 'Withdrawal rejected and refunded',
      withdrawal
    });
  } catch (error) {
    console.error('Reject withdrawal error:', error);
    res.status(500).json({ message: 'Error rejecting withdrawal' });
  }
});

// Get dashboard stats
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const pendingDeposits = await DepositRequest.countDocuments({ status: 'pending' });
    const pendingWithdrawals = await WithdrawRequest.countDocuments({ status: 'pending' });
    const totalUsers = await User.countDocuments();
    
    // Revenue based on actual deposits (real money)
    const totalRevenue = await DepositRequest.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      pendingDeposits,
      pendingWithdrawals,
      totalUsers,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats' });
  }
});

export default router;
