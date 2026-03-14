import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import routes
import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';
import gameRoutes from './routes/game.js';
import plinkoRoutes from './routes/plinko.js';
import depositRoutes from './routes/deposit.js';
import withdrawRoutes from './routes/withdraw.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Store socket connections
let adminSocket = null;

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Admin connects
  socket.on('admin-connect', () => {
    adminSocket = socket;
    console.log('Admin connected via socket');
  });
  
  socket.on('disconnect', () => {
    if (adminSocket === socket) {
      adminSocket = null;
    }
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible in routes
app.set('io', io);
app.set('getAdminSocket', () => adminSocket);

// MongoDB connection options for high concurrency
const mongooseOptions = {
  maxPoolSize: 100,
  minPoolSize: 10,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
  family: 4
};

// CORS configuration - allow all origins in production for flexibility
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all origins in production (Vercel, localhost, etc.)
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Increase JSON payload limit for file uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting - stricter limits for production
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many auth attempts, please try again later.' }
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { message: 'Too many requests, please slow down.' }
});

const gameLimiter = rateLimit({
  windowMs: 1 * 1000,
  max: 2,
  message: { message: 'Game cooldown active. Please wait.' }
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/wallet', apiLimiter, walletRoutes);
app.use('/api/game', gameLimiter, gameRoutes);
app.use('/api/plinko', gameLimiter, plinkoRoutes);
app.use('/api/deposit', apiLimiter, depositRoutes);
app.use('/api/withdraw', apiLimiter, withdrawRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// MongoDB connection with retry logic
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/boxpickgame';

const connectWithRetry = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(MONGODB_URI, mongooseOptions);
      console.log('Connected to MongoDB');
      return;
    } catch (err) {
      console.error(`MongoDB connection error (${i + 1}/${retries}):`, err.message);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  console.error('Failed to connect to MongoDB after retries');
};

connectWithRetry();

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
