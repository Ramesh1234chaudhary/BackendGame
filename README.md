# Box Pick Game - MERN Stack Application

A production-ready MERN stack online game platform with UPI payment integration.

## Features

- 🎮 **Box Pick Game** - Simple 3x3 grid game with 30% win probability
- 💰 **Wallet System** - Deposit, play, win, and withdraw
- 📱 **UPI Payments** - QR code and deep link payment support
- 🔐 **Google OAuth** - Secure authentication
- ⚙️ **Admin Panel** - Approve deposits and withdrawals

## Tech Stack

### Backend
- Node.js + Express.js
- MongoDB with Mongoose
- JWT Authentication
- Google OAuth

### Frontend
- React 18 + TypeScript
- Vite
- Material UI
- Axios

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Google OAuth Client ID

## Setup

### 1. Clone and Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables

Edit `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/boxpickgame
JWT_SECRET=your-super-secret-jwt-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
UPI_ID=your-upi-id@bank
UPI_NAME=BoxPickGame
FRONTEND_URL=http://localhost:5173
```

Edit `client/src/pages/Login.tsx` and replace:
```typescript
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
```

### 3. Run the Application

```bash
# Terminal 1 - Start Backend
cd server
npm run dev

# Terminal 2 - Start Frontend
cd client
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Game Rules

- **Bet Amount**: ₹10
- **Win Reward**: ₹20
- **Win Probability**: 30%
- **Minimum Deposit**: ₹10
- **Minimum Withdrawal**: ₹300

## Project Structure

```
├── server/
│   ├── models/         # MongoDB models
│   ├── routes/        # API routes
│   ├── middleware/   # Auth middleware
│   └── server.js     # Entry point
│
└── client/
    ├── src/
    │   ├── pages/     # React pages
    │   ├── context/   # Auth context
    │   └── services/  # API services
    └── index.html
```

## API Endpoints

### Authentication
- `POST /api/auth/google` - Google OAuth login

### Wallet
- `GET /api/wallet/balance` - Get balance
- `GET /api/wallet/transactions` - Transaction history

### Game
- `POST /api/game/play` - Play game
- `GET /api/game/history` - Game history

### Deposits
- `POST /api/deposit/create` - Create deposit request
- `POST /api/deposit/confirm` - Confirm payment

### Withdrawals
- `POST /api/withdraw/request` - Create withdrawal request

### Admin
- `GET /api/admin/deposits` - Get deposits
- `POST /api/admin/deposit/approve` - Approve deposit
- `GET /api/admin/withdrawals` - Get withdrawals
- `POST /api/admin/withdraw/approve` - Approve withdrawal

## Security Features

- Server-side game result generation
- JWT authentication
- Rate limiting
- Backend wallet balance validation
- Anti-concurrent game play protection

## License

MIT
