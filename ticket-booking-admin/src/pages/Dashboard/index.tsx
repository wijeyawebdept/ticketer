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
  startDateTime: string;
  endDateTime: string;
  status: string;
  createdAt?: string;
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
  const [draftEvents, setDraftEvents] = useState<DashboardEvent[]>([]);
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
        
        // Fetch recent transactions (10)
        const transactions = await DashboardService.getRecentTransactions(10);
        setRecentTransactions(transactions.transactions || []);
        
        // Fetch draft events (10)
        const drafts = await DashboardService.getDraftEvents(10);
        setDraftEvents(drafts.draftEvents || []);
        
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
            <Divider sx={{ mb: 0 }} />
            {recentTransactions.length > 0 ? (
              <Box sx={{ overflowY: 'auto', maxHeight: 440 }}>
                {/* Table header */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr auto auto',
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    backgroundColor: 'rgba(25, 118, 210, 0.06)',
                    borderBottom: '1px solid rgba(0,0,0,0.08)',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem' }}>Event</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem' }}>Date</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', textAlign: 'center' }}>Status</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', textAlign: 'right' }}>Amount</Typography>
                </Box>
                {recentTransactions.map((transaction, index) => (
                  <Box
                    key={transaction.transactionId || index}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr auto auto',
                      gap: 1,
                      alignItems: 'center',
                      px: 1.5,
                      py: 1.2,
                      borderBottom: '1px solid rgba(0,0,0,0.05)',
                      '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.03)' },
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 150,
                      }}
                      title={transaction.eventName || 'Unknown Event'}
                    >
                      {transaction.eventName || 'Unknown Event'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      {new Date(transaction.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Typography>
                    <Chip
                      label={transaction.status}
                      size="small"
                      color={transaction.status === 'SUCCESS' ? 'success' : transaction.status === 'FAILED' ? 'error' : 'warning'}
                      variant="outlined"
                      sx={{ fontWeight: 600, fontSize: '0.7rem', height: 22 }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        textAlign: 'right',
                        color: transaction.status === 'SUCCESS' ? 'success.main' : 'text.secondary',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatCurrency(transaction.amount || 0)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <AccountBalanceWalletIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">No recent transactions</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Draft Events */}
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
                Draft Events
              </Typography>
              <Chip label="Unpublished" color="warning" size="small" />
            </Box>
            <Divider sx={{ mb: 0 }} />
            {draftEvents.length > 0 ? (
              <Box sx={{ overflowY: 'auto', maxHeight: 440 }}>
                {/* Table header */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    backgroundColor: 'rgba(25, 118, 210, 0.06)',
                    borderBottom: '1px solid rgba(0,0,0,0.08)',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem' }}>Event Name</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem' }}>Created</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', textAlign: 'center' }}>Status</Typography>
                </Box>
                {draftEvents.map((event, index) => (
                  <Box
                    key={event.eventId || index}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      gap: 1,
                      alignItems: 'center',
                      px: 1.5,
                      py: 1.2,
                      borderBottom: '1px solid rgba(0,0,0,0.05)',
                      '&:hover': { backgroundColor: 'rgba(255, 152, 0, 0.03)' },
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 180,
                      }}
                      title={event.name}
                    >
                      {event.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {event.createdAt
                        ? new Date(event.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'N/A'}
                    </Typography>
                    <Chip
                      label="DRAFT"
                      size="small"
                      color="warning"
                      variant="outlined"
                      sx={{ fontWeight: 600, fontSize: '0.7rem', height: 22 }}
                    />
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <ConfirmationNumberIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">No draft events</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;