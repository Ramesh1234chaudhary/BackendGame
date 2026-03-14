import express from 'express';
import { authenticate } from './middleware/auth.js';
import User from './models/User.js';
import Transaction from './models/Transaction.js';

const router = express.Router();

// Get wallet balance
router.get('/balance', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({ balance: user.walletBalance });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching balance' });
  }
});

// Get transaction history
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    
    const query = { userId: req.userId };
    if (type) query.type = type;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions' });
  }
});

export default router;
