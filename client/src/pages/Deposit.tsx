import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, TextField, Grid, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import QrCodeIcon from '@mui/icons-material/QrCode';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { depositAPI, walletAPI } from '../services/api';

// Socket.io connection - connect to backend URL in production
const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  if (apiUrl) {
    return apiUrl.replace('/api', '');
  }
  return '';
};

const socket = io(getSocketUrl());

const Deposit = () => {
  const navigate = useNavigate();
  const { updateBalance, user } = useAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [depositData, setDepositData] = useState<{ depositId: string; amount: number; qrCode: string; upiLink: string; upiId: string } | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [waitingDialogOpen, setWaitingDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultType, setResultType] = useState<'success' | 'error'>('success');
  const [resultMessage, setResultMessage] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => setCooldownSeconds(cooldownSeconds - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);
  useEffect(() => {
    if (!user) return;
    
    socket.on('deposit-approved', async (data) => {
      if (data.userId === user.id) {
        // Get fresh balance
        const { data: balanceData } = await walletAPI.getBalance();
        updateBalance(balanceData.balance);
        setWaitingDialogOpen(false);
        setResultType('success');
        setResultMessage(`✅ Deposit Approved! / डिपॉजिट स्वीकृत!\n₹${data.amount} आपके वॉलेट में जोड़ा गया।`);
        setResultDialogOpen(true);
      }
    });

    socket.on('deposit-rejected', (data) => {
      if (data.userId === user.id) {
        setWaitingDialogOpen(false);
        setResultType('error');
        setResultMessage(`❌ Deposit Rejected / डिपॉजिट अस्वीकृत\nआपने भुगतान नहीं किया है। / You have not made the payment.`);
        setResultDialogOpen(true);
      }
    });

    return () => {
      socket.off('deposit-approved');
      socket.off('deposit-rejected');
    };
  }, [user, updateBalance]);

  const handleCreateDeposit = async () => {
    const depositAmount = parseInt(amount);
    
    if (cooldownSeconds > 0) {
      setError(`Please wait ${cooldownSeconds} seconds before creating another deposit request`);
      return;
    }
    
    if (!depositAmount || depositAmount < 20) {
      setError('Minimum deposit amount is ₹20');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await depositAPI.create(depositAmount);
      setDepositData(data);
      setSuccess('Payment request created! Complete payment and confirm.');
      // Start 30 second cooldown to prevent fake payments
      setCooldownSeconds(30);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error creating deposit request');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUPI = () => {
    if (depositData?.upiLink) {
      window.open(depositData.upiLink, '_blank');
    }
  };

  const handleConfirmPayment = async () => {
    if (!depositData?.depositId) return;

    setLoading(true);
    try {
      await depositAPI.confirm(depositData.depositId);
      setConfirmDialogOpen(false);
      // Open waiting dialog
      setWaitingDialogOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error confirming payment');
    } finally {
      setLoading(false);
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
          💰 डिपॉजिट / Deposit Money
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

      {!depositData ? (
        // Deposit Amount Input
        <Card sx={{ borderRadius: 4, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
          <CardContent sx={{ padding: 4, textAlign: 'center' }}>
            <Box sx={{ background: 'linear-gradient(135deg, #4caf50, #8bc34a)', borderRadius: '50%', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <PaymentIcon sx={{ fontSize: 40, color: 'white' }} />
            </Box>
            
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
              Enter Deposit Amount
            </Typography>

            <TextField
              fullWidth
              type="number"
              label="Amount (₹)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1, fontWeight: 600 }}>₹</Typography>
              }}
            />

            <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
              Minimum deposit: ₹20
            </Typography>

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleCreateDeposit}
              disabled={loading || !amount}
              sx={{ 
                background: 'linear-gradient(135deg, #4caf50, #8bc34a)',
                py: 1.5,
                fontSize: 18
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Payment Request'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        // Payment Details
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 4, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <CardContent sx={{ padding: 4, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                  Scan QR Code
                </Typography>
                
                <Box sx={{ background: 'white', borderRadius: 2, padding: 2, display: 'inline-block', mb: 3 }}>
                  <img 
                    src={depositData.qrCode} 
                    alt="Payment QR Code" 
                    style={{ width: 200, height: 200 }}
                  />
                </Box>

                <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
                  Amount: <strong>₹{depositData.amount}</strong>
                </Typography>
                <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
                  UPI ID: <strong>{depositData.upiId}</strong>
                </Typography>

                <Typography variant="body2" sx={{ color: '#666', mt: 2 }}>
                  Scan the QR code with your UPI app to pay ₹{depositData.amount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 4, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <CardContent sx={{ padding: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                  How to Pay
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                    Step 1
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Scan the QR code using any UPI app (Google Pay, PhonePe, Paytm, etc.)
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                    चरण 2
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    सही राशि दर्ज करें: <strong>₹{depositData.amount}</strong>
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                    चरण 3
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    भुगतान पूरा करें
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                    चरण 4
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    नीचे "मैंने भुगतान किया" बटन पर क्लिक करें
                  </Typography>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={() => setConfirmDialogOpen(true)}
                  disabled={loading}
                  sx={{ 
                    background: 'linear-gradient(135deg, #4caf50, #8bc34a)',
                    py: 1.5,
                    fontSize: 18
                  }}
                >
                  {loading ? 'प्रोसेसिंग...' : 'मैंने भुगतान किया'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>भुगतान की पुष्टि करें / Confirm Payment</DialogTitle>
        <DialogContent>
          <Typography>
            क्या आपने ₹{depositData?.amount} UPI ID {depositData?.upiId} को भुगतान किया है?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Have you completed the payment of ₹{depositData?.amount} to UPI ID {depositData?.upiId}?
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            पुष्टि के बाद, एडमिन आपके भुगतान की जांच करेंगे और आपके वॉलेट में पैसे डाल देंगे।
            <br />
            After confirmation, admin will verify your payment and credit your wallet.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>रद्द करें / Cancel</Button>
          <Button 
            onClick={handleConfirmPayment} 
            variant="contained" 
            color="success"
            disabled={loading}
          >
            {loading ? 'प्रोसेसिंग...' : 'हां, मैंने भुगतान किया / Yes, I Have Paid'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Waiting for Admin Approval Dialog */}
      <Dialog open={waitingDialogOpen} onClose={() => {}}>
        <DialogTitle sx={{ textAlign: 'center' }}>⏳ प्रतीक्षा / Waiting</DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 3 }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            आपका डिपॉजिट स्वीकृता का इंतजार है
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your deposit is pending approval
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            कृपया प्रतीक्षा करें जब तक एडमिन आपके भुगतान की जांच करें...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while admin verifies your payment...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontWeight: 'bold' }}>
            💰 राशि / Amount: ₹{depositData?.amount}
          </Typography>
        </DialogContent>
      </Dialog>

      {/* Result Dialog - Success or Error */}
      <Dialog open={resultDialogOpen} onClose={() => {
        setResultDialogOpen(false);
        if (resultType === 'success') navigate('/dashboard');
      }}>
        <DialogTitle sx={{ textAlign: 'center', color: resultType === 'success' ? 'green' : 'red' }}>
          {resultType === 'success' ? <CheckCircleIcon sx={{ fontSize: 60 }} /> : <CancelIcon sx={{ fontSize: 60 }} />}
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="h6" sx={{ whiteSpace: 'pre-line' }}>
            {resultMessage}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button 
            variant="contained" 
            onClick={() => {
              setResultDialogOpen(false);
              if (resultType === 'success') navigate('/dashboard');
            }}
          >
            OK / बंद करें
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Deposit;
