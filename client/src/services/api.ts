import axios from 'axios';

const getApiBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  // Ensure baseUrl ends with /api or add it
  if (baseUrl && !baseUrl.endsWith('/api')) {
    return `${baseUrl}/api`;
  }
  return baseUrl || '/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  googleLogin: (token: string, referralCode?: string) => api.post('/auth/google', { token, referralCode }),
  adminLogin: (email: string, password: string) => api.post('/auth/admin-login', { email, password }),
  getMe: () => api.get('/auth/me'),
  verifyReferral: (referralCode: string) => api.post('/auth/verify-referral', { referralCode }),
};

// Wallet API
export const walletAPI = {
  getBalance: () => api.get('/wallet/balance'),
  getTransactions: (page = 1, limit = 20, type?: string) => 
    api.get(`/wallet/transactions?page=${page}&limit=${limit}${type ? `&type=${type}` : ''}`),
};

// Game API
export const gameAPI = {
  play: (selectedBox: number) => api.post('/game/play', { selectedBox }),
  getHistory: (page = 1, limit = 20) => api.get(`/game/history?page=${page}&limit=${limit}`),
  getTopWinners: () => api.get('/game/top-winners'),
};

// Plinko API
export const plinkoAPI = {
  play: (betAmount: number, rows: number) => api.post('/plinko/play', { betAmount, rows }),
  getHistory: (page = 1, limit = 20) => api.get(`/plinko/history?page=${page}&limit=${limit}`),
  getLeaderboard: (limit = 10) => api.get(`/plinko/leaderboard?limit=${limit}`),
  getRecentWins: (limit = 10) => api.get(`/plinko/recent-wins?limit=${limit}`),
};

// Deposit API
export const depositAPI = {
  create: (amount: number) => api.post('/deposit/create', { amount }),
  confirm: (depositId: string) => api.post('/deposit/confirm', { depositId }),
  getRequests: (page = 1, limit = 20) => api.get(`/deposit/requests?page=${page}&limit=${limit}`),
};

// Withdraw API
export const withdrawAPI = {
  request: (amount: number, upiId: string) => api.post('/withdraw/request', { amount, upiId }),
  getRequests: (page = 1, limit = 20) => api.get(`/withdraw/requests?page=${page}&limit=${limit}`),
};

// Admin API
export const adminAPI = {
  getDeposits: (status = 'pending', page = 1, limit = 20) => 
    api.get(`/admin/deposits?status=${status}&page=${page}&limit=${limit}`),
  approveDeposit: (depositId: string) => api.post('/admin/deposit/approve', { depositId }),
  rejectDeposit: (depositId: string, reason?: string) => 
    api.post('/admin/deposit/reject', { depositId, reason }),
  getWithdrawals: (status = 'pending', page = 1, limit = 20) => 
    api.get(`/admin/withdrawals?status=${status}&page=${page}&limit=${limit}`),
  approveWithdrawal: (withdrawId: string) => api.post('/admin/withdraw/approve', { withdrawId }),
  rejectWithdrawal: (withdrawId: string, reason?: string) => 
    api.post('/admin/withdraw/reject', { withdrawId, reason }),
  getStats: () => api.get('/admin/stats'),
};

export default api;
