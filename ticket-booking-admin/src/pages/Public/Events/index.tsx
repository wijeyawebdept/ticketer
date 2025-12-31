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
      
      console.log('Events response:', response);
      console.log('First event:', response.content?.[0]);
      setEvents(response.content || []);
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
    console.log('Clicked event:', event);
    const eventId = event.id || event.eventId;
    console.log('Event ID:', eventId);
    if (eventId) {
      navigate(`/event/${eventId}`);
    } else {
      console.error('Event ID is missing:', event);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box
      sx={{
        backgroundColor: '#242a33',
        minHeight: '100vh',
        pt: 10,
        pb: 6,
      }}
    >
      <PublicNavbar />
      
      <Container maxWidth="lg">
        {/* Header */}
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

          {/* Search Bar */}
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

        {/* Events Grid */}
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
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 24px rgba(255, 25, 85, 0.3)',
                      },
                    }}
                    onClick={() => handleEventClick(event)}
                  >
                    <CardMedia
                      component="img"
                      height="200"
                      image={event.imageUrl || '/images/default-event.jpg'}
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

                      <Box sx={{ mt: 'auto' }}>
                        <Chip
                          label={event.status}
                          size="small"
                          sx={{
                            backgroundColor: '#ff1955',
                            color: '#fff',
                            fontWeight: 600,
                            fontFamily: 'Raleway, sans-serif',
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Pagination */}
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
    </Box>
  );
};

export default Events;
