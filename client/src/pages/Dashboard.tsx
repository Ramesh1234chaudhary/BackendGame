import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, Grid, Avatar, Chip, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import CasinoIcon from '@mui/icons-material/Casino';
import PaymentIcon from '@mui/icons-material/Payment';
import HistoryIcon from '@mui/icons-material/History';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LogoutIcon from '@mui/icons-material/Logout';
import ShareIcon from '@mui/icons-material/Share';
import { useAuth } from '../context/AuthContext';
import { walletAPI } from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout, updateBalance } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const { data } = await walletAPI.getBalance();
        updateBalance(data.balance);
      } catch (error) {
        console.error('Error fetching balance:', error);
      }
    };
    fetchBalance();
  }, [refreshKey]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleShareReferral = () => {
    const referralLink = `${window.location.origin}/login?ref=${user?.referralCode}`;
    navigator.clipboard.writeText(referralLink);
    setSnackbarOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  return (
    <Box sx={{ minHeight: '100vh', padding: { xs: 2, md: 4 }, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={user?.avatar} sx={{ width: 56, height: 56, border: '3px solid white' }}>
            {user?.name?.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
              Hello, {user?.name}! 👋
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              {user?.email}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white' } }}
        >
          Logout
        </Button>
      </Box>

      {/* Wallet Card */}
      <Card sx={{ mb: 4, borderRadius: 4, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <CardContent sx={{ padding: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="body1" sx={{ color: '#666', mb: 1 }}>
                Your Wallet Balance
              </Typography>
              <Typography variant="h2" sx={{ color: '#667eea', fontWeight: 700 }}>
                {formatCurrency(user?.walletBalance || 0)}
              </Typography>
            </Box>
            <AccountBalanceWalletIcon sx={{ fontSize: 80, color: '#667eea', opacity: 0.3 }} />
          </Box>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Grid container spacing={3}>
        {/* Play Game */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              cursor: 'pointer', 
              transition: 'all 0.3s',
              '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }
            }}
            onClick={() => navigate('/game')}
          >
            <CardContent sx={{ textAlign: 'center', padding: 3 }}>
              <Box sx={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: '50%', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <SportsEsportsIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Play Game</Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>Bet ₹10, Win ₹20</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Plinko Game */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              cursor: 'pointer', 
              transition: 'all 0.3s',
              '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }
            }}
            onClick={() => navigate('/plinko')}
          >
            <CardContent sx={{ textAlign: 'center', padding: 3 }}>
              <Box sx={{ background: 'linear-gradient(135deg, #00d4ff, #0099cc)', borderRadius: '50%', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CasinoIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Plinko</Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>Up to 20x!</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Deposit */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              cursor: 'pointer', 
              transition: 'all 0.3s',
              '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }
            }}
            onClick={() => navigate('/deposit')}
          >
            <CardContent sx={{ textAlign: 'center', padding: 3 }}>
              <Box sx={{ background: 'linear-gradient(135deg, #4caf50, #8bc34a)', borderRadius: '50%', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <PaymentIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Deposit</Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>Add money via UPI</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Withdraw */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              cursor: (user?.walletBalance || 0) >= 300 ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s',
              opacity: (user?.walletBalance || 0) >= 300 ? 1 : 0.6,
              '&:hover': { transform: (user?.walletBalance || 0) >= 300 ? 'translateY(-8px)' : 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }
            }}
            onClick={() => (user?.walletBalance || 0) >= 300 && navigate('/withdraw')}
          >
            <CardContent sx={{ textAlign: 'center', padding: 3 }}>
              <Box sx={{ background: 'linear-gradient(135deg, #ff9800, #ff5722)', borderRadius: '50%', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <PaymentIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Withdraw</Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>Min: ₹300</Typography>
              {(user?.walletBalance || 0) < 300 && (
                <Chip label="Insufficient balance" color="error" size="small" sx={{ mt: 1 }} />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Transactions */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              cursor: 'pointer', 
              transition: 'all 0.3s',
              '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }
            }}
            onClick={() => navigate('/transactions')}
          >
            <CardContent sx={{ textAlign: 'center', padding: 3 }}>
              <Box sx={{ background: 'linear-gradient(135deg, #9c27b0, #e91e63)', borderRadius: '50%', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <HistoryIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>History</Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>View transactions</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Admin Panel Link */}
      {user?.isAdmin && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="contained"
            startIcon={<AdminPanelSettingsIcon />}
            onClick={() => navigate('/admin')}
            sx={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
          >
            Admin Panel
          </Button>
        </Box>
      )}

      {/* Referral Section */}
      <Card sx={{ mt: 4, borderRadius: 4, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <CardContent sx={{ padding: 3, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#667eea' }}>
            🎁 Refer Friends & Earn!
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
            Share your referral code and earn ₹10 when your friend plays their first game after making a deposit!
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#333', fontFamily: 'monospace' }}>
              {user?.referralCode || 'Loading...'}
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            startIcon={<ShareIcon />}
            onClick={handleShareReferral}
            sx={{ background: 'linear-gradient(135deg, #4caf50, #8bc34a)' }}
          >
            Copy Referral Link
          </Button>
          
          {(user?.referralCount || 0) > 0 && (
            <Typography variant="body2" sx={{ mt: 2, color: '#666' }}>
              You have referred {user?.referralCount} friend(s) and earned ₹{user?.referralEarnings || 0}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Snackbar for copy confirmation */}
      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)}>
        <Alert severity="success" sx={{ width: '100%' }}>
          Referral link copied to clipboard!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard;
