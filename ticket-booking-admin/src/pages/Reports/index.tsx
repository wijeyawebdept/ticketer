import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Avatar
} from '@mui/material';
import {
  Assessment as ReportIcon,
  Search as SearchIcon,
  Event as EventIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  ArrowForward as ArrowIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import reportService, { ReportableEvent } from '../../services/report.service';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

const ReportsIndex: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<ReportableEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const isAdmin = user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ROLE_ADMIN);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportService.getReportableEvents();
      setEvents(data);
    } catch (err: any) {
      console.error('Failed to fetch reportable events:', err);
      setError(err.response?.data?.message || 'Failed to load events for reporting');
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(e =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.venueName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.organizerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box p={3}>
      {/* Header Banner */}
      <Paper
        elevation={2}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 3,
          border: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: isAdmin ? '#1976d2' : '#ed6c02', width: 56, height: 56 }}>
            <ReportIcon fontSize="large" />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight={700} sx={{ color: '#1976d2' }}>
              Event Analytics & Reports Center
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {isAdmin
                ? 'Generate and export event reports across all organizers, venues, and multi-showtimes.'
                : 'Generate comprehensive reports for your events, ticket inventory, customer bookings, and venue seat maps.'}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Search Filter */}
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
        <Typography variant="h6" fontWeight={700}>
          Select Event for Detailed Reporting ({filteredEvents.length} Events)
        </Typography>
        <TextField
          size="small"
          placeholder="Search by event title, venue, or organizer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 320 }}
        />
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={5}>
          <CircularProgress size={50} />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : filteredEvents.length === 0 ? (
        <Alert severity="info">No events found matching search criteria.</Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredEvents.map((evt) => (
            <Grid item xs={12} sm={6} md={4} key={evt.eventId}>
              <Card
                elevation={3}
                sx={{
                  borderRadius: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Chip label={evt.status} size="small" color={evt.status === 'PUBLISHED' ? 'success' : 'default'} />
                    <Chip icon={<EventIcon />} label={`${evt.totalSchedules} Show Times`} size="small" variant="outlined" />
                  </Box>

                  <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mt: 1 }}>
                    {evt.title}
                  </Typography>

                  <Box display="flex" flexDirection="column" gap={1} mt={2}>
                    <Typography variant="body2" color="textSecondary" display="flex" alignItems="center" gap={1}>
                      <LocationIcon fontSize="small" color="action" />
                      {evt.venueName}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" display="flex" alignItems="center" gap={1}>
                      <PeopleIcon fontSize="small" color="action" />
                      Organizer: {evt.organizerName}
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color={isAdmin ? 'primary' : 'warning'}
                    endIcon={<ArrowIcon />}
                    onClick={() => navigate(isAdmin ? `/admin/reports/event/${evt.eventId}` : `/organizer/reports/event/${evt.eventId}`)}
                    sx={{ fontWeight: 600, borderRadius: 2 }}
                  >
                    View & Export Report
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default ReportsIndex;
