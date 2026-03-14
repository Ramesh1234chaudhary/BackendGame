import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Tabs, Tab, Pagination, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Grid, TextField } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import io from 'socket.io-client';
import { adminAPI } from '../services/api';

// Socket.io connection - connect to backend URL in production
const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  if (apiUrl) {
    return apiUrl.replace('/api', '');
  }
  return '';
};

const socket = io(getSocketUrl());

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [stats, setStats] = useState({ pendingDeposits: 0, pendingWithdrawals: 0, totalUsers: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; type: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [newDepositNotification, setNewDepositNotification] = useState<string | null>(null);

  useEffect(() => {
    // Connect as admin
    socket.emit('admin-connect');
    
    // Listen for new deposits
    socket.on('new-deposit', (data) => {
      console.log('New deposit received:', data);
      setNewDepositNotification(`New deposit request: ₹${data.amount} from ${data.userName}`);
      // Refresh deposits
      fetchData();
      // Clear notification after 5 seconds
      setTimeout(() => setNewDepositNotification(null), 5000);
    });

    // Listen for new withdrawals
    socket.on('new-withdrawal', (data) => {
      console.log('New withdrawal received:', data);
      // Refresh withdrawals
      fetchData();
    });

    fetchData();

    return () => {
      socket.off('new-deposit');
      socket.off('new-withdrawal');
    };
  }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes] = await Promise.all([
        adminAPI.getStats()
      ]);
      setStats(statsRes.data);

      if (tab === 0) {
        const depositsRes = await adminAPI.getDeposits('pending');
        setDeposits(depositsRes.data.deposits);
      } else {
        const withdrawalsRes = await adminAPI.getWithdrawals('pending');
        setWithdrawals(withdrawalsRes.data.withdrawals);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, type: 'deposit' | 'withdrawal') => {
    setActionLoading(true);
    try {
      if (type === 'deposit') {
        await adminAPI.approveDeposit(id);
      } else {
        await adminAPI.approveWithdrawal(id);
      }
      fetchData();
    } catch (error) {
      console.error('Error approving:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = (id: string, type: string) => {
    setSelectedItem({ id, type });
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (!selectedItem) return;
    
    setActionLoading(true);
    try {
      if (selectedItem.type === 'deposit') {
        await adminAPI.rejectDeposit(selectedItem.id, rejectReason);
      } else {
        await adminAPI.rejectWithdrawal(selectedItem.id, rejectReason);
      }
      setRejectDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error rejecting:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
          ⚙️ Admin Dashboard
        </Typography>
        <Box sx={{ width: 100 }} />
      </Box>

      {/* Real-time Notification */}
      {newDepositNotification && (
        <Alert 
          severity="success" 
          sx={{ mb: 2, fontSize: 16 }}
          onClose={() => setNewDepositNotification(null)}
        >
          🔔 {newDepositNotification}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderRadius: 4, textAlign: 'center' }}>
            <CardContent>
              <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 700 }}>
                {stats.pendingDeposits}
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                Pending Deposits
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderRadius: 4, textAlign: 'center' }}>
            <CardContent>
              <Typography variant="h4" sx={{ color: '#f44336', fontWeight: 700 }}>
                {stats.pendingWithdrawals}
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                Pending Withdrawals
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderRadius: 4, textAlign: 'center' }}>
            <CardContent>
              <Typography variant="h4" sx={{ color: '#667eea', fontWeight: 700 }}>
                {stats.totalUsers}
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                Total Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderRadius: 4, textAlign: 'center' }}>
            <CardContent>
              <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 700 }}>
                ₹{stats.totalRevenue}
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                Total Revenue
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card sx={{ mb: 3, borderRadius: 4 }}>
        <Tabs 
          value={tab} 
          onChange={(e, v) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`Deposits (${stats.pendingDeposits})`} />
          <Tab label={`Withdrawals (${stats.pendingWithdrawals})`} />
        </Tabs>
      </Card>

      {/* Table */}
      <Card sx={{ borderRadius: 4, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ background: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{tab === 0 ? 'UPI ID' : 'Details'}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tab === 0 ? (
                deposits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                      No pending deposits
                    </TableCell>
                  </TableRow>
                ) : (
                  deposits.map((deposit) => (
                    <TableRow key={deposit._id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {deposit.userId?.name || 'Unknown'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          {deposit.userId?.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 700 }}>
                          ₹{deposit.amount}
                        </Typography>
                      </TableCell>
                      <TableCell>{deposit.upiId}</TableCell>
                      <TableCell>{formatDate(deposit.createdAt)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => handleApprove(deposit._id, 'deposit')}
                            disabled={actionLoading}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            startIcon={<CancelIcon />}
                            onClick={() => handleReject(deposit._id, 'deposit')}
                            disabled={actionLoading}
                          >
                            Reject
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )
              ) : (
                withdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                      No pending withdrawals
                    </TableCell>
                  </TableRow>
                ) : (
                  withdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal._id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {withdrawal.userId?.name || 'Unknown'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          {withdrawal.userId?.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="h6" sx={{ color: '#f44336', fontWeight: 700 }}>
                          ₹{withdrawal.amount}
                        </Typography>
                      </TableCell>
                      <TableCell>{withdrawal.upiId}</TableCell>
                      <TableCell>{formatDate(withdrawal.createdAt)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => handleApprove(withdrawal._id, 'withdrawal')}
                            disabled={actionLoading}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            startIcon={<CancelIcon />}
                            onClick={() => handleReject(withdrawal._id, 'withdrawal')}
                            disabled={actionLoading}
                          >
                            Reject
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
        <DialogTitle>Reject {selectedItem?.type === 'deposit' ? 'Deposit' : 'Withdrawal'}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to reject this {selectedItem?.type}?
          </Typography>
          <TextField
            fullWidth
            label="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmReject} variant="contained" color="error" disabled={actionLoading}>
            Confirm Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;
