import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Tabs, Tab, Pagination } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { walletAPI } from '../services/api';

const TransactionHistory = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);

  const typeMap: Record<string, string> = {
    deposit: 'Deposit',
    bet: 'Bet',
    win: 'Win',
    withdraw: 'Withdraw'
  };

  const statusColors: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
    completed: 'success',
    pending: 'warning',
    failed: 'error',
    cancelled: 'default'
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const type = tab === 0 ? undefined : ['deposit', 'bet', 'win', 'withdraw'][tab - 1];
        const { data } = await walletAPI.getTransactions(page, 10, type);
        setTransactions(data.transactions);
        setTotalPages(data.totalPages);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [page, tab]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number, type: string) => {
    if (type === 'bet' || type === 'withdraw') {
      return `-₹${amount}`;
    }
    return `+₹${amount}`;
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
          📜 Transaction History
        </Typography>
        <Box sx={{ width: 100 }} />
      </Box>

      {/* Tabs */}
      <Card sx={{ mb: 3, borderRadius: 4 }}>
        <Tabs 
          value={tab} 
          onChange={(e, v) => { setTab(v); setPage(1); }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="All" />
          <Tab label="Deposits" />
          <Tab label="Bets" />
          <Tab label="Wins" />
          <Tab label="Withdrawals" />
        </Tabs>
      </Card>

      {/* Transactions Table */}
      <Card sx={{ borderRadius: 4, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ background: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" sx={{ color: '#666' }}>
                      No transactions found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx._id} hover>
                    <TableCell>{formatDate(tx.createdAt)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={typeMap[tx.type] || tx.type} 
                        color="primary" 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 600,
                          color: tx.type === 'bet' || tx.type === 'withdraw' ? '#f44336' : '#4caf50'
                        }}
                      >
                        {formatAmount(tx.amount, tx.type)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={tx.status} 
                        color={statusColors[tx.status] || 'default'} 
                        size="small" 
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
            <Pagination 
              count={totalPages} 
              page={page} 
              onChange={(e, v) => setPage(v)}
              color="primary" 
            />
          </Box>
        )}
      </Card>
    </Box>
  );
};

export default TransactionHistory;
