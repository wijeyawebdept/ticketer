import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  LinearProgress,
  Alert,
  AlertTitle
} from '@mui/material';
import {
  People as PeopleIcon,
  Event as EventIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  EventAvailable as EventAvailableIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  Security as SecurityIcon,
  AdminPanelSettings as AdminPanelSettingsIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { DashboardService } from '../../services';
import { DashboardOverview } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: number; // Changed from string to number for dynamic trends
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend }) => (
  <Card 
    elevation={3} 
    sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      borderRadius: 3,
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e7f1 100%)',
      border: '1px solid rgba(0,0,0,0.05)',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
      }
    }}
  >
    <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box
          sx={{
            backgroundColor: color,
            borderRadius: '16px',
            p: 2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          }}
        >
          {icon}
        </Box>
        {trend !== undefined && (
          <Chip
            icon={trend >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
            label={`${trend >= 0 ? '+' : ''}${trend.toFixed(2)}%`}
            size="small"
            color={trend >= 0 ? 'success' : 'error'}
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        )}
      </Box>
      <Typography variant="h4" component="div" sx={{ fontWeight: 700, mb: 1, color: '#333' }}>
        {value}
      </Typography>
      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500 }}>
        {title}
      </Typography>
    </CardContent>
  </Card>
);

interface DashboardTransaction {
  transactionId: string;
  transactionReference?: string;
  amount: number;
  status: string;
  type?: string;
  createdAt: string;

  bookingId?: string;
  bookingReference?: string;

  eventId?: string;
  eventName?: string; //
}
interface DashboardEvent {
  eventId: string;
  name: string;
  startDateTime: string; // Changed from eventDate to match backend
  endDateTime: string;   // Added to match backend
  status: string;
}

// Interface for trend data
interface TrendData {
  userGrowthTrend: number;
  revenueTrend: number;
  bookingTrend: number;
  eventTrend: number;
}

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { formatCurrency, currency } = useCurrency();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<DashboardTransaction[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<DashboardEvent[]>([]);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { isSuperAdmin, user } = useAuth();
  
  // Check if user is an organizer
  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ROLE_ORGANIZER';

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
        
        // Fetch trend data
        const trends = await DashboardService.getTrendData();
        setTrendData(trends);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, color: '#1976d2' }}>
          {t('dashboard.title')}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
          {t('dashboard.welcomeMessage')}
        </Typography>
      </Box>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Hide total users for organizers */}
        {!isOrganizer && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title={t('dashboard.stats.totalUsers')}
              value={overview?.totalUsers || 0}
              icon={<PeopleIcon sx={{ color: 'white', fontSize: 32 }} />}
              color="#4CAF50"
              trend={trendData?.userGrowthTrend}
            />
          </Grid>
        )}
        <Grid item xs={12} sm={6} md={isOrganizer ? 4 : 3}>
          <StatCard
            title={t('dashboard.stats.activeEvents')}
            value={overview?.activeEventsCount || 0}
            icon={<EventIcon sx={{ color: 'white', fontSize: 32 }} />}
            color="#2196F3"
            trend={trendData?.eventTrend}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={isOrganizer ? 4 : 3}>
          <StatCard
            title={t('dashboard.stats.monthlyBookings')}
            value={overview?.monthBookings || 0}
            icon={<CalendarIcon sx={{ color: 'white', fontSize: 32 }} />}
            color="#FF9800"
            trend={trendData?.bookingTrend}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={isOrganizer ? 4 : 3}>
          <StatCard
            title={t('dashboard.stats.totalRevenue')}
            value={formatCurrency(overview?.totalRevenue || 0)}
            icon={<MoneyIcon sx={{ color: 'white', fontSize: 32 }} />}
            color="#E91E63"
            trend={trendData?.revenueTrend}
          />
        </Grid>
      </Grid>
      
      {/* SUPER_ADMIN Exclusive Section - System Overview */}
      {isSuperAdmin() && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Alert 
              severity="info" 
              icon={<AdminPanelSettingsIcon />}
              sx={{ 
                borderRadius: 3,
                background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
                color: 'white',
                '& .MuiAlert-icon': {
                  color: 'white'
                }
              }}
            >
              <AlertTitle sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
              {t('dashboard.superAdmin.title')}
              </AlertTitle>
              {t('dashboard.superAdmin.description')}
            </Alert>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title={t('dashboard.superAdmin.superAdmins')}
              value={overview?.superAdminCount || 0}
              icon={<SecurityIcon sx={{ color: 'white', fontSize: 32 }} />}
              color="#9C27B0"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title={t('dashboard.superAdmin.totalAdmins')}
              value={overview?.adminCount || 0}
              icon={<AdminPanelSettingsIcon sx={{ color: 'white', fontSize: 32 }} />}
              color="#673AB7"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title={t('dashboard.superAdmin.organizers')}
              value={overview?.organizerCount || 0}
              icon={<PeopleIcon sx={{ color: 'white', fontSize: 32 }} />}
              color="#3F51B5"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title={t('dashboard.superAdmin.systemHealth')}
              value={t('dashboard.superAdmin.systemHealth')}
              icon={<CheckCircleIcon sx={{ color: 'white', fontSize: 32 }} />}
              color="#00C853"
            />
          </Grid>
        </Grid>
      )}
      
      <Grid container spacing={3}>
        {/* Recent Transactions */}
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              height: '100%',
              borderRadius: 3,
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#1976d2' }}>
                Recent Transactions
              </Typography>
              <Chip label="Live" color="success" size="small" />
            </Box>
            <Divider sx={{ mb: 2 }} />
            {recentTransactions.length > 0 ? (
              <List>
                {recentTransactions.map((transaction, index) => (
                  <ListItem 
                    key={transaction.transactionId || index} 
                    sx={{ 
                      py: 2, 
                      borderRadius: 2,
                      mb: 1,
                      backgroundColor: 'white',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      '&:hover': {
                        backgroundColor: '#f8f9fa',
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar 
                        sx={{ 
                          bgcolor: transaction.status === 'SUCCESS' ? 'success.light' : 'warning.light',
                          width: 48,
                          height: 48
                        }}
                      >
                        {transaction.status === 'SUCCESS' ? <CheckCircleIcon /> : <AccessTimeIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          {transaction.eventName || "Unknown Event"}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Typography
                        variant="h6"
                        color={transaction.status === 'SUCCESS  ' ? 'success.main' : 'warning.main'}
                        sx={{ fontWeight: 700 }}
                      >
                        {formatCurrency(transaction.amount || 0)}
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No recent transactions
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Upcoming Events */}
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              height: '100%',
              borderRadius: 3,
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#1976d2' }}>
                Upcoming Events
              </Typography>
              <Chip label="Soon" color="primary" size="small" />
            </Box>
            <Divider sx={{ mb: 2 }} />
            {upcomingEvents.length > 0 ? (
              <List>
                {upcomingEvents.map((event, index) => (
                  <ListItem 
                    key={event.eventId || index} 
                    sx={{ 
                      py: 2, 
                      borderRadius: 2,
                      mb: 1,
                      backgroundColor: 'white',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      '&:hover': {
                        backgroundColor: '#f8f9fa',
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar 
                        sx={{ 
                          bgcolor: event.status === 'PUBLISHED' ? 'success.light' : 'warning.light',
                          width: 48,
                          height: 48
                        }}
                      >
                        {event.status === 'PUBLISHED' ? <EventAvailableIcon /> : <AccessTimeIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          {event.name}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {new Date(event.startDateTime).toLocaleDateString()}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={event.status}
                        size="small"
                        color={event.status === 'PUBLISHED' ? 'success' : 'warning'}
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No upcoming events
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;