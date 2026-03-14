import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, TextField, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CasinoIcon from '@mui/icons-material/Casino';
import { useAuth } from '../context/AuthContext';
import { withdrawAPI } from '../services/api';

const MIN_WITHDRAWAL = 150;

const Withdraw = () => {
  const navigate = useNavigate();
  const { user, updateBalance } = useAuth();
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Use gameWinnings for withdrawal
  const gameWinnings = user?.gameWinnings || 0;
  const canWithdraw = gameWinnings >= MIN_WITHDRAWAL;

  const handleWithdraw = () => {
    if (!canWithdraw) {
      setError(`Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}. You can only withdraw your game winnings!`);
      return;
    }

    const withdrawAmount = parseInt(amount);
    
    if (!withdrawAmount || withdrawAmount < MIN_WITHDRAWAL) {
      setError(`Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}`);
      return;
    }

    if (!upiId || !upiId.includes('@')) {
      setError('Please enter a valid UPI ID');
      return;
    }

    if (withdrawAmount > gameWinnings) {
      setError('Insufficient withdrawable balance! (केवल गेम की जीत हटा सकते हैं)');
      return;
    }

    setConfirmDialogOpen(true);
  };

  const confirmWithdraw = async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await withdrawAPI.request(parseInt(amount), upiId);
      // Update both wallet balance and game winnings
      updateBalance((user?.walletBalance || 0) - parseInt(amount));
      setSuccess('Withdrawal request submitted successfully!');
      setAmount('');
      setUpiId('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error creating withdrawal request');
    } finally {
      setLoading(false);
      setConfirmDialogOpen(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', padding: { xs: 2, md: 4 }, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{ color: 'white', mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, flex: 1, textAlign: 'center' }}>
          💸 Withdraw Money
        </Typography>
        <Box sx={{ width: 100 }} />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Game Winnings Card - Only this can be withdrawn */}
      <Card sx={{ mb: 3, borderRadius: 4, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', background: 'linear-gradient(135deg, #4caf50, #2e7d32)' }}>
        <CardContent sx={{ padding: 3, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
            <CasinoIcon sx={{ color: '#fff' }} />
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              Your Game Winnings (Available for Withdrawal)
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Typography variant="h2" sx={{ color: '#fff', fontWeight: 700 }}>
              ₹{gameWinnings.toFixed(2)}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: canWithdraw ? '#a5d6a7' : '#ffcdd2', mt: 2 }}>
            {canWithdraw 
              ? '✓ You can withdraw now!' 
              : `Minimum withdrawal: ₹${MIN_WITHDRAWAL}`}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', mt: 1 }}>
            * Only game winnings can be withdrawn, not deposited money
          </Typography>
        </CardContent>
      </Card>

      {/* Total Balance Card (informational only) */}
      <Card sx={{ mb: 3, borderRadius: 4, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <CardContent sx={{ padding: 3, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#666', mb: 1 }}>
            Total Balance (For Playing Games)
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <AccountBalanceWalletIcon sx={{ fontSize: 30, color: '#667eea' }} />
            <Typography variant="h4" sx={{ color: '#667eea', fontWeight: 700 }}>
              ₹{(user?.walletBalance || 0).toFixed(2)}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#999', mt: 1, display: 'block' }}>
            Use this to play games - cannot be withdrawn
          </Typography>
        </CardContent>
      </Card>

      {/* Withdrawal Form */}
      <Card sx={{ borderRadius: 4, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <CardContent sx={{ padding: 4, textAlign: 'center' }}>
          <Box sx={{ background: 'linear-gradient(135deg, #ff9800, #ff5722)', borderRadius: '50%', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <AccountBalanceWalletIcon sx={{ fontSize: 40, color: 'white' }} />
          </Box>
          
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
            Request Withdrawal
          </Typography>

          <TextField
            fullWidth
            type="number"
            label="Amount (₹)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            sx={{ mb: 2 }}
            disabled={!canWithdraw}
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1, fontWeight: 600 }}>₹</Typography>
            }}
          />

          <TextField
            fullWidth
            label="UPI ID"
            placeholder="yourname@upi"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            sx={{ mb: 2 }}
            disabled={!canWithdraw}
          />

          <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
            Minimum withdrawal: ₹{MIN_WITHDRAWAL} (from game winnings only)
          </Typography>

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleWithdraw}
            disabled={loading || !canWithdraw}
            sx={{ 
              background: canWithdraw ? 'linear-gradient(135deg, #ff9800, #ff5722)' : '#ccc',
              py: 1.5,
              fontSize: 18
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Request Withdrawal'}
          </Button>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card sx={{ mt: 3, borderRadius: 4, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', background: 'rgba(255,255,255,0.9)' }}>
        <CardContent sx={{ padding: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Withdrawal Rules
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
            1. Only game winnings can be withdrawn (not deposited money)
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
            2. Minimum withdrawal: ₹{MIN_WITHDRAWAL}
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
            3. Enter your valid UPI ID
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
            4. Click "Request Withdrawal"
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            5. Admin will approve and process your withdrawal within 24 hours
          </Typography>
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirm Withdrawal</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to withdraw ₹{amount} to UPI ID {upiId}?
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#666' }}>
            * This will be deducted from your game winnings
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmWithdraw} variant="contained" color="warning">
            Yes, Confirm Withdrawal
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Withdraw;
