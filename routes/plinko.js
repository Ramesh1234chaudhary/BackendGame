import express from 'express';
import { authenticate } from '../middleware/auth.js';
import PlinkoGame from '../models/PlinkoGame.js';
import User from '../models/User.js';

const router = express.Router();

// Allowed bet amounts
const ALLOWED_BETS = [5, 10, 20];

// Plinko multiplier configuration - 0.5x, 1x, 2x only
const PLINKO_MULTIPLIERS = {
  8: [0.5, 0.5, 1, 1, 2, 1, 1, 0.5, 0.5],      // 9 slots
  10: [0.5, 0.5, 0.5, 1, 1, 2, 1, 1, 0.5, 0.5, 0.5],  // 11 slots
  12: [0.5, 0.5, 0.5, 1, 1, 1, 2, 1, 1, 0.5, 0.5, 0.5, 0.5], // 13 slots
  16: [0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1, 2, 1, 1, 1, 0.5, 0.5, 0.5, 0.5, 0.5] // 17 slots
};

// Generate slot - users mostly lose
const generateWeightedSlot = (numRows, forceLose = false) => {
  const slots = PLINKO_MULTIPLIERS[numRows] || PLINKO_MULTIPLIERS[8];
  const numSlots = slots.length;
  
  // If user has 300 or more, force them to lose
  if (forceLose) {
    // Return edge slot with 0.5x multiplier
    return 0;
  }
  
  // Create weighted array - edges have higher weight (lose more)
  const weights = [];
  const center = Math.floor(numSlots / 2);
  
  for (let i = 0; i < numSlots; i++) {
    // Edges have much higher weight (lose more)
    const distance = Math.abs(i - center);
    const weight = distance > 0 ? Math.pow(3, distance) * 50 : 1;
    weights.push(weight);
  }
  
  // Normalize weights
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const normalizedWeights = weights.map(w => w / totalWeight);
  
  // Select slot based on weights
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < normalizedWeights.length; i++) {
    cumulative += normalizedWeights[i];
    if (random <= cumulative) {
      return i;
    }
  }
  
  return 0; // Fallback to edge (lose)
};

// Play Plinko game
router.post('/play', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { betAmount, rows = 8 } = req.body;
    
    // Validate bet amount - only 10, 20, 100 allowed
    if (!betAmount || !ALLOWED_BETS.includes(betAmount)) {
      return res.status(400).json({ message: 'Invalid bet amount. Choose ₹10, ₹20, or ₹100' });
    }
    
    // Validate rows
    if (!PLINKO_MULTIPLIERS[rows]) {
      return res.status(400).json({ message: 'Invalid row count. Choose 8, 10, 12, or 16' });
    }
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check balance
    if (user.walletBalance < betAmount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    
    // Check if user has 300 or more - force them to lose
    const shouldForceLose = user.walletBalance >= 300;
    
    // Deduct bet amount
    user.walletBalance -= betAmount;
    await user.save();
    
    // Generate slot - users mostly lose
    const slotIndex = generateWeightedSlot(rows, shouldForceLose);
    const multiplier = PLINKO_MULTIPLIERS[rows][slotIndex];
    const reward = betAmount * multiplier;
    const isWin = multiplier >= 1;
    
    // Update wallet if won (only 1x)
    if (isWin) {
      user.walletBalance += reward;
      await user.save();
    }
    
    // Save game history
    const game = new PlinkoGame({
      userId,
      betAmount,
      rows,
      selectedRow: rows,
      slotIndex,
      multiplier,
      result: isWin ? 'win' : 'lose',
      reward: isWin ? reward : 0
    });
    await game.save();
    
    res.json({
      success: true,
      slotIndex,
      multiplier,
      reward: isWin ? reward : 0,
      result: isWin ? 'win' : 'lose',
      newBalance: user.walletBalance,
      betAmount,
      rows
    });
  } catch (error) {
    console.error('Plinko play error:', error);
    res.status(500).json({ message: 'Error playing Plinko' });
  }
});

// Get Plinko game history
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;
    
    const games = await PlinkoGame.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await PlinkoGame.countDocuments({ userId });
    
    res.json({
      games,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Plinko history error:', error);
    res.status(500).json({ message: 'Error fetching history' });
  }
});

// Get Plinko leaderboard (top winners)
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const leaderboard = await PlinkoGame.aggregate([
      { $match: { result: 'win', reward: { $gt: 0 } } },
      {
        $group: {
          _id: '$userId',
          totalWinnings: { $sum: '$reward' },
          gamesPlayed: { $sum: 1 },
          lastWin: { $max: '$createdAt' }
        }
      },
      { $sort: { totalWinnings: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: { $concat: [{ $substr: ['$user.name', 0, 3] }, '***'] },
          totalWinnings: 1,
          gamesPlayed: 1,
          lastWin: 1
        }
      }
    ]);
    
    res.json({ leaderboard });
  } catch (error) {
    console.error('Plinko leaderboard error:', error);
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
});

// Get recent Plinko wins for display
router.get('/recent-wins', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const recentWins = await PlinkoGame.find({ result: 'win', reward: { $gt: 0 } })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('userId', 'name');
    
    res.json({ 
      wins: recentWins.map(game => ({
        userName: game.userId?.name ? game.userId.name.substring(0, 3) + '***' : 'User',
        amount: game.reward,
        multiplier: game.multiplier,
        createdAt: game.createdAt
      }))
    });
  } catch (error) {
    console.error('Recent wins error:', error);
    res.status(500).json({ message: 'Error fetching recent wins' });
  }
});

export default router;
