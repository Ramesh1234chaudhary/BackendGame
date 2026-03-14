import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, TextField, Grid, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Chip, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useAuth } from '../context/AuthContext';
import { plinkoAPI } from '../services/api';

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface Peg {
  x: number;
  y: number;
  radius: number;
}

interface Slot {
  x: number;
  y: number;
  multiplier: number;
}

const PLINKO_MULTIPLIERS: Record<number, number[]> = {
  8: [0.5, 1, 2, 5, 10, 5, 2, 1, 0.5],
  10: [0.2, 0.5, 1, 2, 5, 10, 5, 2, 1, 0.5, 0.2],
  12: [0.1, 0.2, 0.5, 1, 2, 5, 10, 5, 2, 1, 0.5, 0.2, 0.1],
  16: [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05]
};

const PLINKO_COLORS: Record<number, string> = {
  0.05: '#ff1744',
  0.1: '#ff1744',
  0.2: '#ff5252',
  0.5: '#ff8a80',
  1: '#4caf50',
  2: '#8bc34a',
  5: '#03a9f4',
  10: '#3f51b5',
  20: '#9c27b0'
};

const Plinko = () => {
  const navigate = useNavigate();
  const { updateBalance, user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  const [betAmount, setBetAmount] = useState(10);
  const [rows, setRows] = useState(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [gameResult, setGameResult] = useState<any>(null);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [recentWins, setRecentWins] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  
  const ballRef = useRef<Ball | null>(null);
  const pegsRef = useRef<Peg[]>([]);
  const slotsRef = useRef<Slot[]>([]);
  const targetSlotRef = useRef<number>(0);

  // Initialize pegs and slots
  const initializeBoard = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const pegRadius = 6;
    const slotHeight = 60;
    
    pegsRef.current = [];
    slotsRef.current = [];
    
    const multipliers = PLINKO_MULTIPLIERS[rows] || PLINKO_MULTIPLIERS[8];
    const numSlots = multipliers.length;
    const slotWidth = width / numSlots;
    
    // Create pegs in pyramid pattern
    const startY = 80;
    const pegSpacingY = (height - startY - slotHeight - 40) / rows;
    
    for (let row = 0; row < rows; row++) {
      const numPegs = row + 1;
      const rowWidth = numPegs * (width / (rows + 2));
      const startX = (width - rowWidth) / 2;
      const spacing = rowWidth / (numPegs + 1);
      
      for (let col = 0; col < numPegs; col++) {
        pegsRef.current.push({
          x: startX + spacing * (col + 1),
          y: startY + row * pegSpacingY,
          radius: pegRadius
        });
      }
    }
    
    // Create slots
    for (let i = 0; i < numSlots; i++) {
      slotsRef.current.push({
        x: i * slotWidth + slotWidth / 2,
        y: height - slotHeight / 2 - 10,
        multiplier: multipliers[i]
      });
    }
  }, [rows]);

  // Draw the board
  const draw = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw slots
    const slotWidth = width / slotsRef.current.length;
    slotsRef.current.forEach((slot, index) => {
      const multiplier = slot.multiplier;
      const color = PLINKO_COLORS[multiplier] || '#666';
      
      // Slot background
      ctx.fillStyle = color + '40';
      ctx.beginPath();
      ctx.roundRect(index * slotWidth + 2, slot.y - 25, slotWidth - 4, 50, 8);
      ctx.fill();
      
      // Slot border glow
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Multiplier text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Poppins';
      ctx.textAlign = 'center';
      ctx.fillText(`${multiplier}x`, slot.x, slot.y + 5);
    });

    // Draw pegs
    pegsRef.current.forEach(peg => {
      // Peg glow
      const pegGradient = ctx.createRadialGradient(peg.x, peg.y, 0, peg.x, peg.y, peg.radius * 2);
      pegGradient.addColorStop(0, '#00d4ff');
      pegGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = pegGradient;
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.radius * 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Peg
      ctx.fillStyle = '#00d4ff';
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw ball if exists
    if (ballRef.current) {
      const ball = ballRef.current;
      
      // Ball glow
      const ballGlow = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius * 3);
      ballGlow.addColorStop(0, ball.color);
      ballGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = ballGlow;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius * 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Ball
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Ball highlight
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  // Physics update
  const updatePhysics = useCallback(() => {
    if (!ballRef.current || !canvasRef.current) return;

    const ball = ballRef.current;
    const canvas = canvasRef.current;
    const gravity = 0.3;
    const friction = 0.99;
    const bounce = 0.7;

    // Apply gravity
    ball.vy += gravity;
    ball.vx *= friction;
    ball.vy *= friction;

    // Update position
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall collision
    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.vx = -ball.vx * bounce;
    }
    if (ball.x + ball.radius > canvas.width) {
      ball.x = canvas.width - ball.radius;
      ball.vx = -ball.vx * bounce;
    }

    // Peg collision
    pegsRef.current.forEach(peg => {
      const dx = ball.x - peg.x;
      const dy = ball.y - peg.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDist = ball.radius + peg.radius;

      if (distance < minDist) {
        // Collision response
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Move ball out of peg
        ball.x = peg.x + nx * minDist;
        ball.y = peg.y + ny * minDist;
        
        // Reflect velocity
        const dotProduct = ball.vx * nx + ball.vy * ny;
        ball.vx = (ball.vx - 2 * dotProduct * nx) * bounce;
        ball.vy = (ball.vy - 2 * dotProduct * ny) * bounce;
        
        // Add some randomness
        ball.vx += (Math.random() - 0.5) * 2;
      }
    });

    // Check if ball reached bottom
    if (ball.y > canvas.height - 60) {
      // Find which slot the ball is in
      const slotWidth = canvas.width / slotsRef.current.length;
      const slotIndex = Math.floor(ball.x / slotWidth);
      const finalSlot = Math.max(0, Math.min(slotIndex, slotsRef.current.length - 1));
      
      // Animate to center of slot
      const targetSlot = slotsRef.current[finalSlot];
      ball.x += (targetSlot.x - ball.x) * 0.1;
      ball.y += (targetSlot.y - ball.y) * 0.1;
      
      // Check if ball settled
      if (Math.abs(ball.y - targetSlot.y) < 5) {
        setIsAnimating(false);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        return;
      }
    }
  }, []);

  // Animation loop
  useEffect(() => {
    if (isAnimating) {
      const animate = () => {
        updatePhysics();
        draw();
        if (isAnimating) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, updatePhysics, draw]);

  // Initialize board on mount and when rows change
  useEffect(() => {
    initializeBoard();
    draw();
  }, [initializeBoard, draw, rows]);

  // Fetch recent wins and leaderboard
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [winsRes, leaderboardRes] = await Promise.all([
          plinkoAPI.getRecentWins(5),
          plinkoAPI.getLeaderboard(5)
        ]);
        setRecentWins(winsRes.data.wins || []);
        setLeaderboard(leaderboardRes.data.leaderboard || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Start ball animation
  const startAnimation = (targetSlot: number) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    targetSlotRef.current = targetSlot;
    const targetX = slotsRef.current[targetSlot]?.x || canvas.width / 2;
    
    ballRef.current = {
      x: canvas.width / 2,
      y: 30,
      vx: (Math.random() - 0.5) * 4,
      vy: 0,
      radius: 12,
      color: '#00d4ff'
    };
    
    setIsAnimating(true);
  };

  const handlePlay = async () => {
    if (isAnimating) return;
    
    if (!betAmount || betAmount < 10) {
      setError('Minimum bet amount is ₹10');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const { data } = await plinkoAPI.play(betAmount, rows);
      
      setGameResult(data);
      
      // Start animation
      startAnimation(data.slotIndex);
      
      // Update balance
      if (user) {
        updateBalance(data.newBalance);
      }
      
      // Show result after animation
      setTimeout(() => {
        setResultDialogOpen(true);
        if (data.result === 'win') {
          setSuccess(`🎉 You won ₹${data.reward}!`);
        }
      }, 2000);
      
      // Refresh data
      const [winsRes, leaderboardRes] = await Promise.all([
        plinkoAPI.getRecentWins(5),
        plinkoAPI.getLeaderboard(5)
      ]);
      setRecentWins(winsRes.data.wins || []);
      setLeaderboard(leaderboardRes.data.leaderboard || []);
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error playing Plinko');
    } finally {
      setLoading(false);
    }
  };

  const presetBets = [5, 10, 20];
  const rowOptions = [8, 10, 12, 16];

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      padding: 2, 
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      pb: 8
    }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')} sx={{ color: 'white' }}>
          Back
        </Button>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, flex: 1, textAlign: 'center' }}>
          🎯 Plinko
        </Typography>
        <Box sx={{ width: 100 }} />
      </Box>

      <Grid container spacing={2}>
        {/* Main Game Area */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 4, overflow: 'hidden', background: 'transparent', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <CardContent sx={{ p: 1 }}>
              {/* Canvas */}
              <Box sx={{ position: 'relative', width: '100%', aspectRatio: '16/12', borderRadius: 2, overflow: 'hidden' }}>
                <canvas 
                  ref={canvasRef} 
                  width={600} 
                  height={450}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
                
                {/* Loading overlay */}
                {loading && (
                  <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.5)'
                  }}>
                    <CircularProgress sx={{ color: '#00d4ff' }} />
                  </Box>
                )}
              </Box>

              {/* Controls */}
              <Box sx={{ p: 2 }}>
                {/* Bet Amount */}
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ color: '#aaa', mb: 1 }}>Bet Amount</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {presetBets.map(bet => (
                      <Chip
                        key={bet}
                        label={`₹${bet}`}
                        onClick={() => setBetAmount(bet)}
                        sx={{
                          background: betAmount === bet ? '#00d4ff' : 'rgba(255,255,255,0.1)',
                          color: betAmount === bet ? '#000' : '#fff',
                          fontWeight: 600,
                          '&:hover': { background: betAmount === bet ? '#00b8dd' : 'rgba(255,255,255,0.2)' }
                        }}
                      />
                    ))}
                    <TextField
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(Number(e.target.value))}
                      size="small"
                      sx={{ 
                        width: 100,
                        input: { color: '#fff' }
                      }}
                    />
                  </Box>
                </Box>

                {/* Rows */}
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ color: '#aaa', mb: 1 }}>Rows</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {rowOptions.map(row => (
                      <Chip
                        key={row}
                        label={`${row} Rows`}
                        onClick={() => setRows(row)}
                        sx={{
                          background: rows === row ? '#9c27b0' : 'rgba(255,255,255,0.1)',
                          color: rows === row ? '#fff' : '#aaa',
                          fontWeight: 600
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Play Button */}
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handlePlay}
                  disabled={loading || isAnimating}
                  sx={{
                    py: 1.5,
                    background: 'linear-gradient(135deg, #00d4ff, #00b8dd)',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: 18,
                    borderRadius: 2,
                    '&:hover': { background: 'linear-gradient(135deg, #00b8dd, #0099cc)' },
                    '&:disabled': { background: 'rgba(255,255,255,0.2)' }
                  }}
                >
                  {isAnimating ? 'Dropping...' : loading ? 'Playing...' : `Drop Ball - ₹${betAmount}`}
                </Button>

                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Recent Wins */}
          <Card sx={{ borderRadius: 4, mb: 2, background: 'rgba(255,255,255,0.05)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon sx={{ color: '#00ff88', mr: 1 }} />
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>Recent Wins</Typography>
              </Box>
              {recentWins.length === 0 ? (
                <Typography sx={{ color: '#666' }}>No recent wins</Typography>
              ) : (
                recentWins.map((win, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, p: 1, borderRadius: 1, background: 'rgba(0,255,136,0.1)' }}>
                    <Typography sx={{ color: '#fff', fontSize: 14 }}>{win.userName}</Typography>
                    <Typography sx={{ color: '#00ff88', fontWeight: 600 }}>₹{win.amount}</Typography>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card sx={{ borderRadius: 4, background: 'rgba(255,255,255,0.05)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AttachMoneyIcon sx={{ color: '#ffd700', mr: 1 }} />
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>Top Winners</Typography>
              </Box>
              {leaderboard.length === 0 ? (
                <Typography sx={{ color: '#666' }}>No winners yet</Typography>
              ) : (
                leaderboard.map((entry, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, p: 1, borderRadius: 1, background: index === 0 ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ color: index === 0 ? '#ffd700' : '#aaa', fontWeight: 600 }}>#{index + 1}</Typography>
                      <Typography sx={{ color: '#fff', fontSize: 14 }}>{entry.name}</Typography>
                    </Box>
                    <Typography sx={{ color: '#ffd700', fontWeight: 600 }}>₹{entry.totalWinnings}</Typography>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Result Dialog */}
      <Dialog open={resultDialogOpen} onClose={() => setResultDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', fontSize: 24, fontWeight: 700 }}>
          {gameResult?.result === 'win' ? '🎉 Congratulations!' : '😢 Better Luck Next Time!'}
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          {gameResult?.result === 'win' ? (
            <>
              <Typography variant="h3" sx={{ color: '#00ff88', fontWeight: 700, my: 2 }}>
                ₹{gameResult.reward}
              </Typography>
              <Typography variant="h5" sx={{ color: '#aaa' }}>
                Multiplier: {gameResult.multiplier}x
              </Typography>
            </>
          ) : (
            <Typography variant="h5" sx={{ color: '#ff5252', my: 2 }}>
              You lost ₹{gameResult?.betAmount}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button 
            variant="contained" 
            onClick={() => setResultDialogOpen(false)}
            sx={{ background: '#00d4ff', color: '#000', fontWeight: 600 }}
          >
            Play Again
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Plinko;
