import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { Box, Button, Card, CardContent, Typography, CircularProgress, Alert, TextField, Collapse } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '307916202061-t1dl0bfuoige0v040s0dv86vhfvbnttb.apps.googleusercontent.com'; // Replace with actual client ID

const GoogleLoginButton = ({ onSuccess, onError }: { onSuccess: (token: string) => void; onError: () => void }) => {
  const login = useGoogleLogin({
    onSuccess: (response) => {
      onSuccess(response.access_token);
    },
    onError: () => {
      onError();
    },
    scope: 'email profile',
  });

  return (
    <Button
      fullWidth
      variant="contained"
      size="large"
      onClick={() => login()}
      sx={{
        py: 1.5,
        backgroundColor: '#fff',
        color: '#333',
        fontSize: '16px',
        fontWeight: 600,
        boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
        '&:hover': {
          backgroundColor: '#f5f5f5',
        },
      }}
    >
      <img
        src="https://www.google.com/favicon.ico"
        alt="Google"
        style={{ width: 20, height: 20, marginRight: 12 }}
      />
      Continue with Google
    </Button>
  );
};

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [showReferral, setShowReferral] = useState(!!searchParams.get('ref'));
  const [showBonusMessage, setShowBonusMessage] = useState(false);

  const handleSuccess = async (accessToken: string) => {
    setLoading(true);
    setError('');
    
    try {
      // For Google OAuth, we need to get user info first
      const googleUserResponse = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
      const googleUser = await googleUserResponse.json();
      
      // Send the ID token to our backend for verification
      const { data } = await authAPI.googleLogin(accessToken, referralCode || undefined);
      login(data.token, data.user);
      
      // Show bonus message if user received welcome bonus
      if (data.receivedBonus) {
        setShowBonusMessage(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleError = () => {
    setError('Google login failed. Please try again.');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card sx={{ maxWidth: 420, width: '100%', borderRadius: 4, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <CardContent sx={{ padding: 4, textAlign: 'center' }}>
          {/* Logo/Title */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, color: '#667eea', mb: 1 }}>
              🎮
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#333' }}>
              Box Pick Game
            </Typography>
            <Typography variant="body1" sx={{ color: '#666', mt: 1 }}>
              Win exciting prizes!
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {showBonusMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              🎉 Welcome! You received ₹20 as a welcome bonus! (₹20 बोनस के रूप में मिला!)
            </Alert>
          )}

          {/* Referral Code Input - Collapsible */}
          <Box sx={{ mb: 2 }}>
            <Button
              size="small"
              onClick={() => setShowReferral(!showReferral)}
              endIcon={<ExpandMoreIcon sx={{ transform: showReferral ? 'rotate(180deg)' : 'rotate(0deg)' }} />}
              sx={{ color: '#666' }}
            >
              Have a referral code?
            </Button>
            <Collapse in={showReferral}>
              <TextField
                fullWidth
                size="small"
                label="Referral Code (Optional)"
                value={referralCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="e.g., BOX123456"
                sx={{ mt: 1 }}
              />
            </Collapse>
          </Box>

          {/* Google Login Button */}
          {loading ? (
            <CircularProgress sx={{ my: 3 }} />
          ) : (
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
              <GoogleLoginButton onSuccess={handleSuccess} onError={handleError} />
            </GoogleOAuthProvider>
          )}

          {/* Admin Login Link */}
          <Typography variant="body2" sx={{ color: '#666', mt: 2 }}>
            Are you an admin?{' '}
            <Button
              variant="text"
              size="small"
              onClick={() => navigate('/admin-login')}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Admin Login
            </Button>
          </Typography>

          {/* Info */}
          <Typography variant="body2" sx={{ color: '#999', mt: 3, fontSize: 12 }}>
            By continuing, you agree to our Terms & Conditions
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
