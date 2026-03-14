import express from 'express';
import QRCode from 'qrcode';
import { authenticate } from './middleware/auth.js';
import User from './models/User.js';
import DepositRequest from './models/DepositRequest.js';
import Transaction from './models/Transaction.js';
import { notifyAdminDeposit } from './utils/notifications.js';

const router = express.Router();

const MIN_DEPOSIT = 20;

// Create deposit request
router.post('/create', authenticate, async (req, res) => {
  try {
    const { amount } = req.body;

    // Validate amount
    if (!amount || amount < MIN_DEPOSIT) {
      return res.status(400).json({ message: `Minimum deposit amount is ₹${MIN_DEPOSIT}` });
    }

    const upiId = process.env.UPI_ID;
    const upiName = process.env.UPI_NAME || 'GameApp';

    // Generate UPI deep link
    const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR`;

    // Generate QR code
    const qrCode = await QRCode.toDataURL(upiLink, {
      width: 250,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    // Create deposit request - initially 'created' (not shown to admin yet)
    const depositRequest = new DepositRequest({
      userId: req.userId,
      amount,
      upiId,
      status: 'created'
    });
    await depositRequest.save();

    res.json({
      depositId: depositRequest._id,
      amount,
      upiId,
      upiLink,
      qrCode,
      message: 'Payment request created. Complete payment and click below.'
    });
  } catch (error) {
    console.error('Create deposit error:', error);
    res.status(500).json({ message: 'Error creating deposit request' });
  }
});

// Confirm deposit (user marks as paid) - Admin verification required
router.post('/confirm', authenticate, async (req, res) => {
  try {
    const { depositId } = req.body;

    // Find deposit with 'created' status (not yet confirmed by user)
    const deposit = await DepositRequest.findOne({
      _id: depositId,
      userId: req.userId,
      status: 'created'
    });

    if (!deposit) {
      return res.status(404).json({ message: 'Deposit request not found or already processed' });
    }

    // Get user details for notification
    const user = await User.findById(req.userId);
    
    // Change status to pending - now admin can see it
    deposit.status = 'pending';
    deposit.paymentConfirmedAt = new Date();
    await deposit.save();

    // Send notification to admin (WhatsApp + Email)
    notifyAdminDeposit(
      user?.name || 'Unknown',
      user?.email || 'Unknown',
      deposit.amount,
      deposit.upiId
    );

    // Notify admin via Socket.io for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('new-deposit', {
        depositId: deposit._id,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || 'Unknown',
        amount: deposit.amount,
        upiId: deposit.upiId,
        createdAt: deposit.createdAt
      });
    }

    res.json({
      message: 'Payment confirmation submitted. Admin will verify and approve your deposit.',
      depositId: deposit._id,
      status: 'pending',
      amount: deposit.amount
    });
  } catch (error) {
    console.error('Confirm deposit error:', error);
    res.status(500).json({ message: 'Error confirming deposit' });
  }
});

// Get user's deposit requests
router.get('/requests', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const deposits = await DepositRequest.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await DepositRequest.countDocuments({ userId: req.userId });

    res.json({
      deposits,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching deposit requests' });
  }
});

export default router;
