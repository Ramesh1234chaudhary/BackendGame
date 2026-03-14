import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, Grid, Alert, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Howl } from 'howler';
import { useAuth } from '../context/AuthContext';
import { gameAPI } from '../services/api';

const Game = () => {
  const navigate = useNavigate();
  const { user, updateBalance } = useAuth();
  const [selectedBox, setSelectedBox] = useState<number | null>(null);
  const [gameResult, setGameResult] = useState<{ result: string; winningBox: number; reward: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [topWinners, setTopWinners] = useState<any[]>([]);
  const [isFirstGame, setIsFirstGame] = useState(false);
  const [showNearMiss, setShowNearMiss] = useState(false);
  const [boxRevealing, setBoxRevealing] = useState(false);
  
  // Sound refs
  const coinSoundRef = useRef<Howl | null>(null);
  const winSoundRef = useRef<Howl | null>(null);
  const loseSoundRef = useRef<Howl | null>(null);

  // Initialize sounds
  useEffect(() => {
    // Create sounds using Howler
    coinSoundRef.current = new Howl({
      src: ['https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'],
      volume: 0.5
    });
    
    winSoundRef.current = new Howl({
      src: ['https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'],
      volume: 0.6
    });
    
    loseSoundRef.current = new Howl({
      src: ['https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3'],
      volume: 0.3
    });

    // Fetch top winners
    fetchTopWinners();

    return () => {
      coinSoundRef.current?.unload();
      winSoundRef.current?.unload();
      loseSoundRef.current?.unload();
    };
  }, []);

  const fetchTopWinners = async () => {
    try {
      const { data } = await gameAPI.getTopWinners();
      setTopWinners(data.winners || []);
    } catch (err) {
      console.error('Error fetching top winners:', err);
    }
  };

  const playCoinSound = () => {
    coinSoundRef.current?.play();
  };

  const playWinSound = () => {
    winSoundRef.current?.play();
  };

  const playLoseSound = () => {
    loseSoundRef.current?.play();
  };

  const handleBoxClick = async (boxIndex: number) => {
    if (selectedBox !== null || loading) return;
    
    if ((user?.walletBalance || 0) < 10) {
      setError('Insufficient balance! Please deposit money to play. (बैलेंस कम है, कृपया जमा करें)');
      return;
    }

    setSelectedBox(boxIndex);
    setLoading(true);
    setError('');
    setBoxRevealing(true);
    playCoinSound();

    try {
      const { data } = await gameAPI.play(boxIndex);
      
      // Check if this was first game (guaranteed win)
      const wasFirstGame = !user?.hasPlayedFirstGame;
      setIsFirstGame(wasFirstGame);

      // Show near-miss effect for loses
      if (data.result === 'lose') {
        const selectedRow = Math.floor(boxIndex / 3);
        const selectedCol = boxIndex % 3;
        const winningRow = Math.floor(data.winningBox / 3);
        const winningCol = data.winningBox % 3;
        
        // Check if winning box is adjacent (near-miss)
        const isAdjacent = (Math.abs(selectedRow - winningRow) + Math.abs(selectedCol - winningCol)) === 1;
        setShowNearMiss(isAdjacent);
      } else {
        setShowNearMiss(false);
      }

      // Delay to show animation
      setTimeout(() => {
        setGameResult({
          result: data.result,
          winningBox: data.winningBox,
          reward: data.reward
        });

        updateBalance(data.newBalance);
        setBoxRevealing(false);

        // Play appropriate sound and confetti on win
        if (data.result === 'win') {
          playWinSound();
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#4caf50', '#ffd700', '#ff9800', '#00ff00']
          });
        } else {
          playLoseSound();
        }
      }, 800);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error playing game');
      setSelectedBox(null);
      setBoxRevealing(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAgain = () => {
    setSelectedBox(null);
    setGameResult(null);
    setError('');
    setShowNearMiss(false);
    fetchTopWinners();
  };

  const getBoxContent = (index: number) => {
    if (selectedBox === null) return '';
    if (gameResult) {
      if (index === gameResult.winningBox) return '💰';
      if (index === selectedBox && gameResult.result === 'lose') return '❌';
    }
    return '';
  };

  const boxVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: { 
      scale: 1, 
      rotate: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 260,
        damping: 20
      }
    },
    selected: {
      scale: 1.1,
      boxShadow: '0 0 30px rgba(255, 215, 0, 0.8)'
    },
    win: {
      scale: 1.15,
      backgroundColor: '#4caf50',
      transition: { duration: 0.3 }
    },
    lose: {
      scale: 0.95,
      backgroundColor: '#f44336',
      transition: { duration: 0.3 }
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', padding: { xs: 2, md: 4 }, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{ color: 'white', mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, flex: 1, textAlign: 'center' }}>
          🎮 Box Pick Game
        </Typography>
        <Box sx={{ width: 100 }} />
      </Box>

      {/* Top Winners Today */}
      {topWinners.length > 0 && (
        <Card sx={{ mb: 3, borderRadius: 3, background: 'linear-gradient(135deg, #ffd700, #ff9800)' }}>
          <CardContent sx={{ py: 2, px: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <EmojiEventsIcon sx={{ color: '#fff' }} />
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
                🏆 Top Winners Today
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
              {topWinners.slice(0, 5).map((winner: any, idx: number) => (
                <Box key={idx} sx={{ 
                  background: 'rgba(255,255,255,0.3)', 
                  borderRadius: 2, 
                  px: 2, 
                  py: 1,
                  minWidth: 100,
                  textAlign: 'center'
                }}>
                  <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                    {winner.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    ₹{winner.totalWinnings}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Balance Card */}
      <Card sx={{ mb: 3, borderRadius: 4, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <CardContent sx={{ textAlign: 'center', padding: 2 }}>
          <Typography variant="body1" sx={{ color: '#666' }}>Your Balance (For Playing)</Typography>
          <Typography variant="h3" sx={{ color: '#667eea', fontWeight: 700 }}>
            ₹{(user?.walletBalance || 0).toFixed(2)}
          </Typography>
          <Typography variant="body2" sx={{ color: '#4caf50', mt: 1 }}>
            Winnings to withdraw: ₹{user?.gameWinnings || 0}
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mt: 1 }}>
            Bet: ₹10 | Win: ₹20
          </Typography>
        </CardContent>
      </Card>

      {/* First Game Win Banner */}
      {isFirstGame && gameResult?.result === 'win' && (
        <Alert severity="success" sx={{ mb: 3 }}>
          🎉 Congratulations! Your first game win! Keep playing to win more!
        </Alert>
      )}

      {/* Near Miss Message */}
      {showNearMiss && gameResult?.result === 'lose' && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          😮 So close! You were just next to the winning box! Try again!
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Game Result */}
      <AnimatePresence>
        {gameResult && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <Card sx={{ mb: 3, borderRadius: 4, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', textAlign: 'center' }}>
              <CardContent sx={{ padding: 3 }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <Typography variant="h3" sx={{ 
                    color: gameResult.result === 'win' ? '#4caf50' : '#f44336',
                    fontWeight: 700,
                    mb: 2
                  }}>
                    {gameResult.result === 'win' ? '🎉 YOU WIN! 🎉' : '😢 YOU LOSE!'}
                  </Typography>
                </motion.div>
                {gameResult.result === 'win' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 700 }}>
                      +₹{gameResult.reward}
                    </Typography>
                  </motion.div>
                )}
                <Typography variant="body1" sx={{ color: '#666', mt: 2 }}>
                  Winning box was: Box {gameResult.winningBox + 1}
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Board */}
      <Card sx={{ borderRadius: 4, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <CardContent sx={{ padding: 3 }}>
          <Typography variant="h6" sx={{ textAlign: 'center', mb: 2, color: '#666' }}>
            Select a box to play
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={60} />
            </Box>
          ) : (
            <Grid container spacing={{ xs: 1, sm: 2 }} justifyContent="center">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
                <Grid item key={index} xs={4} sm={3} md={3}>
                  <motion.div
                    variants={boxVariants}
                    initial="hidden"
                    animate={selectedBox === index ? 'selected' : 'visible'}
                    whileHover={selectedBox === null ? { scale: 1.05 } : {}}
                    whileTap={selectedBox === null ? { scale: 0.95 } : {}}
                  >
                    <Box
                      onClick={() => handleBoxClick(index)}
                      sx={{
                        width: { xs: '100%', sm: 90 },
                        height: { xs: 'auto', sm: 90 },
                        aspectRatio: '1/1',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        cursor: selectedBox !== null ? 'default' : 'pointer',
                        backgroundColor: gameResult && index === gameResult.winningBox ? '#4caf50' : 
                                        gameResult && index === selectedBox && gameResult.result === 'lose' ? '#f44336' : 'white',
                        borderRadius: 2,
                        border: selectedBox === index ? '4px solid #ffd700' : 'none',
                        boxShadow: 3,
                        fontSize: { xs: '2rem', sm: '2.5rem' },
                        touchAction: 'manipulation',
                      }}
                    >
                      {getBoxContent(index)}
                    </Box>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Play Again Button */}
          {gameResult && (
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  variant="contained"
                  size="large"
                  onClick={handlePlayAgain}
                  sx={{ 
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    px: 6,
                    py: 1.5,
                    fontSize: 18
                  }}
                >
                  Play Again
                </Button>
              </motion.div>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Game;
