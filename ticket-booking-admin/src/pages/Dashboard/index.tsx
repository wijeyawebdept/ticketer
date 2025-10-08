import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  People as PeopleIcon,
  Event as EventIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { DashboardService } from '../../services';
import { DashboardOverview } from '../../types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <Card elevation={2}>
    <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box>
        <Typography variant="subtitle2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h4">
          {value}
        </Typography>
      </Box>
      <Box
        sx={{
          backgroundColor: color,
          borderRadius: '50%',
          p: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {icon}
      </Box>
    </CardContent>
  </Card>
);

interface DashboardTransaction {
  transactionId: string;
  amount: number;
  status: string;
  createdAt: string;
  booking?: { 
    event?: { 
      name: string;
    };
  };
}

interface DashboardEvent {
  eventId: string;
  name: string;
  eventDate: string;
  status: string;
}

const Dashboard: React.FC = () => {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<DashboardTransaction[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<DashboardEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch dashboard overview
        const dashboardOverview = await DashboardService.getDashboardOverview();
        setOverview(dashboardOverview);
        
        // Fetch recent transactions
        const transactions = await DashboardService.getRecentTransactions(5);
        setRecentTransactions(transactions.transactions || []);
        
        // Fetch upcoming events
        const events = await DashboardService.getUpcomingEvents(5);
        setUpcomingEvents(events.events || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={overview?.totalUsers || 0}
            icon={<PeopleIcon sx={{ color: 'white' }} />}
            color="#4CAF50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Events"
            value={overview?.activeEventsCount || 0}
            icon={<EventIcon sx={{ color: 'white' }} />}
            color="#2196F3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Monthly Bookings"
            value={overview?.monthBookings || 0}
            icon={<CalendarIcon sx={{ color: 'white' }} />}
            color="#FF9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={`$${overview?.totalRevenue || 0}`}
            icon={<MoneyIcon sx={{ color: 'white' }} />}
            color="#E91E63"
          />
        </Grid>
      </Grid>
      
      <Grid container spacing={3}>
        {/* Recent Transactions */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Transactions
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {recentTransactions.length > 0 ? (
              <Box>
                {recentTransactions.map((transaction, index) => (
                  <Box
                    key={transaction.transactionId || index}
                    sx={{
                      p: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderBottom: index !== recentTransactions.length - 1 ? '1px solid #eee' : 'none'
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2">
                        {transaction.booking?.event?.name || 'Unknown Event'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="subtitle2"
                        color={transaction.status === 'COMPLETED' ? 'success.main' : 'warning.main'}
                      >
                        ${transaction.amount}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                No recent transactions
              </Typography>
            )}
          </Paper>
        </Grid>
        
        {/* Upcoming Events */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Upcoming Events
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {upcomingEvents.length > 0 ? (
              <Box>
                {upcomingEvents.map((event, index) => (
                  <Box
                    key={event.eventId || index}
                    sx={{
                      p: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderBottom: index !== upcomingEvents.length - 1 ? '1px solid #eee' : 'none'
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2">
                        {event.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(event.eventDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          backgroundColor: event.status === 'PUBLISHED' ? 'success.light' : 'warning.light',
                          color: event.status === 'PUBLISHED' ? 'success.dark' : 'warning.dark',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1
                        }}
                      >
                        {event.status}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                No upcoming events
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;