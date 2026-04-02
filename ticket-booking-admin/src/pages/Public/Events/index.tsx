import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  CircularProgress,
  TextField,
  InputAdornment,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Search as SearchIcon, CalendarToday, LocationOn } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../../../components/public/PublicNavbar';
import PublicFooter from '../../../components/public/PublicFooter';
import EventService from '../../../services/event.service';
import { Event } from '../../../types';

const Events: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const loadEvents = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = searchQuery 
        ? await EventService.searchPublishedEvents(searchQuery, page, 12)
        : await EventService.getPublishedEvents(page, 12);
      
      // Sort events to show deals first
      const sortedEvents = (response.content || []).sort((a: Event, b: Event) => {
        if (a.hasDeal && !b.hasDeal) return -1;
        if (!a.hasDeal && b.hasDeal) return 1;
        return 0;
      });
      
      setEvents(sortedEvents);
      setTotalPages(response.totalPages || 0);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleSearch = () => {
    setPage(0);
    loadEvents();
  };

  const handleEventClick = (event: Event) => {
    const eventId = event.id || event.eventId;
    if (eventId) {
      navigate(`/event/${eventId}`);
    } else {
      console.error('Event ID is missing:', event);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'TBA';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'TBA';
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'TBA';
    }
  };

  const formatPrice = (price: number | null | undefined) => {
    if (!price || price === 0) return 'Free';
    return `LKR ${price.toLocaleString()}`;
  };

  return (
    <Box
      sx={{
        backgroundColor: '#242a33',
        minHeight: '100vh',
        pt: 10,
      }}
    >
      <PublicNavbar />
      
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h1"
            sx={{
              fontWeight: 900,
              fontFamily: 'Raleway, sans-serif',
              color: '#ff1955',
              fontSize: isMobile ? '36px' : '60px',
              lineHeight: 1.1,
              mb: 2,
            }}
          >
            All Events
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Raleway, sans-serif',
              color: 'rgba(255, 255, 255, 0.8)',
              mb: 4,
            }}
          >
            Discover and book tickets for exciting events
          </Typography>

          <Box sx={{ maxWidth: '600px', mx: 'auto' }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      variant="contained"
                      onClick={handleSearch}
                      sx={{
                        backgroundColor: '#ff1955',
                        '&:hover': { backgroundColor: '#e01545' },
                      }}
                    >
                      Search
                    </Button>
                  </InputAdornment>
                ),
              }}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                },
              }}
            />
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#ff1955' }} />
          </Box>
        ) : events.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography
              variant="h6"
              sx={{ color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'Raleway, sans-serif' }}
            >
              No events found
            </Typography>
          </Box>
        ) : (
          <>
            <Grid container spacing={3}>
              {events.map((event) => (
                <Grid item xs={12} sm={6} md={4} key={event.id || event.eventId}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: 2,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'pointer',
                      position: 'relative',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 24px rgba(255, 25, 85, 0.3)',
                      },
                    }}
                    onClick={() => handleEventClick(event)}
                  >
                    <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1, display: 'flex', gap: 1, flexDirection: 'row-reverse' }}>
                      {event.hasDeal && (
                        <Chip
                          label="Deal"
                          size="small"
                          sx={{
                            backgroundColor: '#00c853',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        />
                      )}
                      {event.ticketsAvailable === 0 && (
                        <Chip
                          label="Sold Out"
                          size="small"
                          sx={{
                            backgroundColor: '#dc3545',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        />
                      )}
                    </Box>
                    <CardMedia
                      component="img"
                      height="200"
                      image={event.imageUrl ? `http://localhost:8081/${event.imageUrl}` : '/images/default-event.jpg'}
                      alt={event.name}
                      sx={{ objectFit: 'cover' }}
                    />
                    <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontFamily: 'Raleway, sans-serif',
                          fontWeight: 700,
                          color: '#2c3e50',
                          mb: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {event.name}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CalendarToday sx={{ fontSize: 16, color: '#ff1955', mr: 1 }} />
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'Raleway, sans-serif', color: '#666' }}
                        >
                          {formatDate(event.startDateTime)}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <LocationOn sx={{ fontSize: 16, color: '#ff1955', mr: 1 }} />
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'Raleway, sans-serif',
                            color: '#666',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {event.venue?.name || 'TBA'}
                        </Typography>
                      </Box>

                      <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid rgba(0, 0, 0, 0.1)' }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'Raleway, sans-serif',
                            color: '#999',
                            fontSize: '0.75rem',
                            mb: 0.5,
                          }}
                        >
                          Starting from
                        </Typography>
                        <Typography
                          variant="h6"
                          sx={{
                            fontFamily: 'Raleway, sans-serif',
                            fontWeight: 700,
                            color: '#ff1955',
                            fontSize: '1.25rem',
                          }}
                        >
                          {formatPrice(event.basePrice)} <span style={{ fontSize: '0.875rem', fontWeight: 400 }}>upwards</span>
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, gap: 2 }}>
                <Button
                  variant="outlined"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  sx={{
                    color: '#fff',
                    borderColor: '#ff1955',
                    '&:hover': { borderColor: '#e01545', backgroundColor: 'rgba(255, 25, 85, 0.1)' },
                  }}
                >
                  Previous
                </Button>
                <Typography sx={{ color: '#fff', alignSelf: 'center', fontFamily: 'Raleway, sans-serif' }}>
                  Page {page + 1} of {totalPages}
                </Typography>
                <Button
                  variant="outlined"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                  sx={{
                    color: '#fff',
                    borderColor: '#ff1955',
                    '&:hover': { borderColor: '#e01545', backgroundColor: 'rgba(255, 25, 85, 0.1)' },
                  }}
                >
                  Next
                </Button>
              </Box>
            )}
          </>
        )}
      </Container>
      <PublicFooter />
    </Box>
  );
};

export default Events;
