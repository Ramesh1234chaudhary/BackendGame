import express from 'express';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import Transaction from './models/Transaction.js';

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Google OAuth login/register
router.post('/google', async (req, res) => {
  try {
    const { token, referralCode } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Get user info from Google using access token
    const googleUserResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`);
    
    if (!googleUserResponse.ok) {
      return res.status(401).json({ message: 'Invalid Google token' });
    }
    
    const payload = await googleUserResponse.json();
    const { id: googleId, email, name, picture } = payload;

    let user = await User.findOne({ googleId });
    let isNewUser = false;

    if (!user) {
      // Check if user exists with same email
      user = await User.findOne({ email });
      
      if (user) {
        // Link Google account to existing user
        user.googleId = googleId;
        if (!user.avatar && picture) user.avatar = picture;
        await user.save();
      } else {
        // Create new user with referral
        let referredBy = null;
        isNewUser = true;
        
        // Validate referral code if provided
        if (referralCode && referralCode.trim() !== '') {
          const referrer = await User.findOne({ referralCode: referralCode.trim().toUpperCase() });
          if (referrer) {
            referredBy = referrer._id;
          }
        }

        // Create new user
        user = new User({
          name: name || email.split('@')[0],
          email,
          googleId,
          avatar: picture || '',
          referredBy
        });
        await user.save();

        // Update referrer's count if valid referral
        if (referredBy) {
          await User.findByIdAndUpdate(referredBy, {
            $inc: { referralCount: 1 }
          });
        }

        // Credit 20 rupees bonus for first-time login ONLY if not already received
        const BONUS_AMOUNT = 20;
        if (!user.hasReceivedFirstLoginBonus) {
          user.walletBalance += BONUS_AMOUNT;
          user.gameWinnings += BONUS_AMOUNT;
          user.hasReceivedFirstLoginBonus = true;
          await user.save();

          // Create bonus transaction record
          const bonusTransaction = new Transaction({
            userId: user._id,
            type: 'bonus',
            amount: BONUS_AMOUNT,
            status: 'completed',
            description: 'Welcome bonus - First time login reward'
          });
          await bonusTransaction.save();
        }
      }
    }

    const authToken = generateToken(user._id);
    
    res.json({
      token: authToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        walletBalance: user.walletBalance,
        gameWinnings: user.gameWinnings,
        isAdmin: user.isAdmin,
        referralCode: user.referralCode,
        referralCount: user.referralCount,
        referralEarnings: user.referralEarnings
      },
      receivedBonus: isNewUser
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-googleId');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      walletBalance: user.walletBalance,
      gameWinnings: user.gameWinnings,
      isAdmin: user.isAdmin,
      referralCode: user.referralCode,
      referralCount: user.referralCount,
      referralEarnings: user.referralEarnings
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Verify referral code
router.post('/verify-referral', async (req, res) => {
  try {
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({ message: 'Referral code is required' });
    }

    const user = await User.findOne({ referralCode: referralCode.trim().toUpperCase() });

    if (!user) {
      return res.status(404).json({ valid: false, message: 'Invalid referral code' });
    }

    res.json({
      valid: true,
      referrerName: user.name
    });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying referral code' });
  }
});

// Admin login (hardcoded credentials)
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check hardcoded admin credentials
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      // Generate admin token (special admin token with isAdmin flag)
      const adminToken = jwt.sign(
        { userId: 'admin', isAdmin: true, email: process.env.ADMIN_EMAIL },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token: adminToken,
        user: {
          id: 'admin',
          name: 'Admin',
          email: process.env.ADMIN_EMAIL,
          isAdmin: true
        }
      });
    } else {
      res.status(401).json({ message: 'Invalid admin credentials' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Admin login failed' });
  }
});

export default router;
