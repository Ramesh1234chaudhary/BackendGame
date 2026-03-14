import express from 'express';
import { authenticate } from '../middleware/auth.js';
import User from '../models/User.js';
import GameHistory from '../models/GameHistory.js';
import Transaction from '../models/Transaction.js';

const router = express.Router();

const BET_AMOUNT = 10;
const WIN_REWARD = 20;
const WIN_PROBABILITY = 0.3;

// Store active game sessions
const activeGames = new Map();

// Play game - simplified for speed
router.post('/play', authenticate, async (req, res) => {
  try {
    const { selectedBox } = req.body;
    const userId = req.userId;

    // Validate selected box
    if (selectedBox < 0 || selectedBox > 8) {
      return res.status(400).json({ message: 'Invalid box selection' });
    }

    // Quick check if user has active game
    if (activeGames.get(userId.toString())) {
      return res.status(429).json({ message: 'Please wait for your current game to complete' });
    }

    // Mark game as active
    activeGames.set(userId.toString(), true);

    try {
      // Get and update user in one atomic operation
      const user = await User.findOneAndUpdate(
        { _id: userId, walletBalance: { $gte: BET_AMOUNT } },
        { $inc: { walletBalance: -BET_AMOUNT } },
        { new: true }
      );

      if (!user) {
        return res.status(400).json({ message: 'Insufficient balance. Please deposit first.' });
      }

      // Generate game result on server (30% win, 70% lose)
      // Check if this is user's first game - guaranteed win!
      let isWin;
      let winningBox;
      
      if (!user.hasPlayedFirstGame) {
        // Guaranteed first win for new users
        isWin = true;
        // Make winning box different from selected box (show near-miss effect later)
        winningBox = selectedBox;
      } else {
        // Normal probability (30% win)
        const random = Math.random();
        isWin = random < WIN_PROBABILITY;
        
        if (isWin) {
          // Winning box should be the one user selected
          winningBox = selectedBox;
        } else {
          // Near-miss effect: make winning box adjacent to selected box
          const adjacentBoxes = [];
          const row = Math.floor(selectedBox / 3);
          const col = selectedBox % 3;
          
          // Add adjacent positions (up, down, left, right)
          if (row > 0) adjacentBoxes.push(selectedBox - 3); // up
          if (row < 2) adjacentBoxes.push(selectedBox + 3); // down
          if (col > 0) adjacentBoxes.push(selectedBox - 1); // left
          if (col < 2) adjacentBoxes.push(selectedBox + 1); // right
          
          if (adjacentBoxes.length > 0 && Math.random() < 0.5) {
            // 50% chance to show near-miss
            winningBox = adjacentBoxes[Math.floor(Math.random() * adjacentBoxes.length)];
          } else {
            // Random box that's not the selected one
            do {
              winningBox = Math.floor(Math.random() * 9);
            } while (winningBox === selectedBox);
          }
        }
      }
      
      const result = isWin ? 'win' : 'lose';
      
      let reward = 0;
      
      if (isWin) {
        reward = WIN_REWARD;
        
        // Add win reward to gameWinnings (withdrawable) and walletBalance (for playing)
        await User.findByIdAndUpdate(userId, {
          $inc: { walletBalance: WIN_REWARD, gameWinnings: WIN_REWARD }
        });

        // Create win transaction
        const winTransaction = new Transaction({
          userId,
          type: 'win',
          amount: WIN_REWARD,
          status: 'completed',
          description: 'Game win reward'
        });
        await winTransaction.save();
      }

      // Create bet transaction
      const betTransaction = new Transaction({
        userId,
        type: 'bet',
        amount: BET_AMOUNT,
        status: 'completed',
        description: 'Game bet'
      });
      await betTransaction.save();

      // Save game history
      const gameHistory = new GameHistory({
        userId,
        betAmount: BET_AMOUNT,
        result,
        reward,
        selectedBox,
        winningBox
      });
      await gameHistory.save();

      // Mark first game as played
      if (!user.hasPlayedFirstGame) {
        await User.findByIdAndUpdate(userId, { hasPlayedFirstGame: true });
      }

      // Get updated balance
      const updatedUser = await User.findById(userId);

      res.json({
        result,
        winningBox,
        reward,
        newBalance: updatedUser.walletBalance
      });
    } finally {
      // Always remove from active games
      activeGames.delete(userId.toString());
    }
  } catch (error) {
    console.error('Game error:', error);
    activeGames.delete(req.userId?.toString());
    res.status(500).json({ message: 'Error playing game' });
  }
});

// Get game history
router.get('/history', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const games = await GameHistory.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await GameHistory.countDocuments({ userId: req.userId });
    
    res.json({
      games,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching game history' });
  }
});

// Get top winners today (public endpoint)
// Optimized aggregation pipeline for leaderboard
router.get('/top-winners', async (req, res) => {
  try {
    // Get start of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Optimized aggregation pipeline:
    // 1. Match winning games from today
    // 2. Lookup user data early to reduce post-processing
    // 3. Group by user with aggregated stats
    // 4. Sort and limit
    // 5. Project masked username
    const topWinners = await GameHistory.aggregate([
      // Stage 1: Filter winning games from today
      {
        $match: {
          createdAt: { $gte: startOfToday },
          result: 'win',
          reward: { $gt: 0 }
        }
      },
      // Stage 2: Lookup user data BEFORE grouping (more efficient)
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userData'
        }
      },
      // Stage 3: Unwind user data (handle cases where user might not exist)
      {
        $unwind: {
          path: '$userData',
          preserveNullAndEmptyArrays: false
        }
      },
      // Stage 4: Group by user with aggregated stats
      {
        $group: {
          _id: '$userId',
          userName: { $first: '$userData.name' },
          totalWinnings: { $sum: '$reward' },
          winCount: { $sum: 1 },
          lastWin: { $max: '$createdAt' }
        }
      },
      // Stage 5: Sort by total winnings descending
      { $sort: { totalWinnings: -1 } },
      // Stage 6: Limit to top 10
      { $limit: 10 },
      // Stage 7: Project with masked username
      {
        $project: {
          _id: 0,
          name: {
            $concat: [
              { $substr: ['$userName', 0, 3] },
              '***'
            ]
          },
          totalWinnings: 1,
          winCount: 1,
          lastWin: 1
        }
      }
    ], {
      // Query timeout to prevent server hangs (5 seconds)
      maxTimeMS: 5000,
      // Allow disk use for large datasets
      allowDiskUse: true
    });

    // Return empty array if no winners instead of undefined
    res.json({ winners: topWinners || [] });
  } catch (error) {
    // Handle specific MongoDB errors to prevent server crashes
    if (error.name === 'MongoServerError') {
      console.error('MongoDB Server Error in top-winners:', error.message);
    } else if (error.name === 'MongooseError') {
      console.error('Mongoose Error in top-winners:', error.message);
    } else if (error.name === 'MongoTimeoutError') {
      console.error('Query timeout in top-winners:', error.message);
    } else {
      console.error('Top winners error:', error.message);
    }
    
    // Always return a valid response to prevent client crashes
    res.status(500).json({ 
      message: 'Unable to fetch leaderboard. Please try again later.',
      winners: [] 
    });
  }
});

export default router;
