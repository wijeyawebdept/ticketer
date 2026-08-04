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
  Snackbar,
  Alert,
  Slide,
  SlideProps,
} from '@mui/material';
import { Search as SearchIcon, CalendarToday, LocationOn, LocalOffer } from '@mui/icons-material';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import PublicNavbar from '../../../components/public/PublicNavbar';
import PublicFooter from '../../../components/public/PublicFooter';
import EventService from '../../../services/event.service';
import { Event } from '../../../types';
import { getAssetUrl } from '../../../utils/formatters';
import { useCurrency } from '../../../context/CurrencyContext';

const SlideTransition = (props: SlideProps) => <Slide {...props} direction="down" />;

const Events: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('category');
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');

  // Show welcome toast when arriving from Google login
  useEffect(() => {
    const state = location.state as { googleWelcome?: boolean; firstName?: string } | undefined;
    if (state?.googleWelcome) {
      setWelcomeName(state.firstName || '');
      setWelcomeOpen(true);
      // Clear the state so refreshing doesn't re-show the toast
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchCategoryName = async () => {
      if (categoryId) {
        try {
          const { EventCategoryService } = await import('../../../services');
          const category = await EventCategoryService.getPublicCategoryById(categoryId);
          setCategoryName(category.categoryName);
        } catch (error) {
          setCategoryName(null);
        }
      } else {
        setCategoryName(null);
      }
    };
    fetchCategoryName();
  }, [categoryId]);

  const loadEvents = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = searchQuery 
        ? await EventService.searchPublishedEvents(searchQuery, page, 12)
        : await EventService.getPublishedEvents(page, 12, categoryId || undefined);
      
      // Sort events to show deals first, then by creation date (newest first)
      const sortedEvents = (response.content || []).sort((a: Event, b: Event) => {
        if (a.hasDeal && !b.hasDeal) return -1;
        if (!a.hasDeal && b.hasDeal) return 1;
        
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      setEvents(sortedEvents);
      setTotalPages(response.totalPages || 0);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page, categoryId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleSearch = () => {
    setPage(0);
    loadEvents();
  };

  const handleEventClick = (event: Event) => {
    const identifier = event.slug || event.id || event.eventId;
    if (identifier) {
      navigate(`/event/${identifier}`);
    } else {
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
    return formatCurrency(price);
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
        <Box sx={{ textAlign: 'center', mb: { xs: 3, md: 6 } }}>
          <Typography
            variant="h1"
            sx={{
              fontWeight: 900,
              fontFamily: 'Raleway, sans-serif',
              color: '#ff1955',
              fontSize: { xs: '26px', sm: '36px', md: '60px' },
              lineHeight: 1.1,
              mb: { xs: 1, md: 2 },
            }}
          >
            {categoryName ? `${categoryName} Events` : 'All Events'}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Raleway, sans-serif',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: { xs: '0.85rem', sm: '1rem', md: '1.25rem' },
              mb: { xs: 2.5, md: 4 },
            }}
          >
            {categoryName 
              ? `Browse the best ${categoryName.toLowerCase()} events and book your tickets` 
              : 'Discover and book tickets for exciting events'}
          </Typography>

          <Box sx={{ maxWidth: { xs: '100%', sm: '500px', md: '600px' }, mx: 'auto', px: { xs: 1, sm: 0 } }}>
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
                    <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: { xs: 18, md: 22 } }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSearch}
                      sx={{
                        backgroundColor: '#ff1955',
                        color: '#fff',
                        fontSize: { xs: '0.78rem', md: '0.9rem' },
                        py: { xs: 0.3, md: 0.8 },
                        px: { xs: 1.5, md: 2.5 },
                        minHeight: { xs: 28, md: 36 },
                        borderRadius: '6px',
                        textTransform: 'none',
                        fontWeight: 700,
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
                  fontSize: { xs: '0.82rem', md: '1rem' },
                  minHeight: { xs: '38px', md: '48px' },
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                },
                '& .MuiOutlinedInput-input': {
                  py: { xs: '6px', md: '12px' },
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
              {events.map((event) => {
                  // Compute the true lowest current price across all categories (with and without deals)
                  const allCategoryPrices = (event.ticketCategories || []).map((tc: any) => {
                    const originalPrice = Number(tc.price) || 0;
                    const discount = Number(tc.dealDiscountPercentage) || 0;
                    const currentPrice = (tc.dealActive && discount > 0)
                      ? originalPrice * (1 - discount / 100)
                      : originalPrice;
                    return { originalPrice, currentPrice };
                  });

                  const lowestOriginalPrice = allCategoryPrices.length > 0
                    ? Math.min(...allCategoryPrices.map(p => p.originalPrice))
                    : Number(event.basePrice) || 0;

                  const lowestCurrentPrice = allCategoryPrices.length > 0
                    ? Math.min(...allCategoryPrices.map(p => p.currentPrice))
                    : Number(event.basePrice) || 0;

                  const showDiscountedPrice = lowestCurrentPrice < lowestOriginalPrice;

                  return (
                  <Grid item xs={12} sm={6} md={4} key={event.id || event.eventId}>
                    <Card
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#1b222c',
                        borderRadius: '14px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          borderColor: 'rgba(255, 25, 85, 0.35)',
                          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6), 0 0 15px rgba(255, 25, 85, 0.15)',
                        },
                      }}
                      onClick={() => handleEventClick(event)}
                    >
                      <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 1, display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        {event.hasDeal && (
                          <Chip
                            icon={<LocalOffer sx={{ fontSize: '13px !important' }} />}
                            label="Deal"
                            size="small"
                            sx={{
                              backgroundColor: '#00c853',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              height: 24,
                              '& .MuiChip-icon': { color: '#fff' },
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
                      <Box
                        sx={{
                          width: '100%',
                          height: { xs: '140px', sm: '180px', md: '200px' },
                          minHeight: { xs: '140px', sm: '180px', md: '200px' },
                          maxHeight: { xs: '140px', sm: '180px', md: '200px' },
                          overflow: 'hidden',
                          position: 'relative',
                          backgroundColor: '#0f131a',
                        }}
                      >
                        <CardMedia
                          component="img"
                          image={event.imageUrl ? getAssetUrl(event.imageUrl) : '/images/default-event.jpg'}
                          alt={event.name}
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center center',
                          }}
                        />
                      </Box>
                      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: { xs: 1.5, sm: 2 } }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontFamily: 'Raleway, sans-serif',
                            fontWeight: 700,
                            color: '#ffffff',
                            fontSize: { xs: '0.95rem', sm: '1.1rem' },
                            lineHeight: 1.3,
                            mb: { xs: 0.8, sm: 1 },
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {event.name}
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 0.6, sm: 1 } }}>
                          <CalendarToday sx={{ fontSize: { xs: 14, sm: 16 }, color: '#ff1955', mr: 0.8, flexShrink: 0 }} />
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: 'Raleway, sans-serif', color: '#cbd5e1', fontSize: { xs: '0.78rem', sm: '0.88rem' } }}
                          >
                            {formatDate(event.startDateTime)}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1, sm: 1.5 } }}>
                          <LocationOn sx={{ fontSize: { xs: 14, sm: 16 }, color: '#fcd0a5', mr: 0.8, flexShrink: 0 }} />
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: 'Raleway, sans-serif',
                              color: '#fcd0a5',
                              fontSize: { xs: '0.78rem', sm: '0.88rem' },
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {event.venue?.name || 'TBA'}
                          </Typography>
                        </Box>

                        <Box sx={{ mt: 'auto', pt: { xs: 1, sm: 1.5 }, borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: 'Raleway, sans-serif',
                                color: 'rgba(255, 255, 255, 0.6)',
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                mb: 0.2,
                              }}
                            >
                              Starting from
                            </Typography>
                            {showDiscountedPrice ? (
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{ fontFamily: 'Raleway, sans-serif', color: 'rgba(255, 255, 255, 0.4)', textDecoration: 'line-through', display: 'block', fontSize: '0.75rem' }}
                                >
                                  {formatPrice(lowestOriginalPrice)}
                                </Typography>
                                <Typography
                                  variant="h6"
                                  sx={{ fontFamily: 'Raleway, sans-serif', fontWeight: 700, color: '#00e676', fontSize: { xs: '0.95rem', sm: '1.15rem' } }}
                                >
                                  {formatPrice(lowestCurrentPrice)}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography
                                variant="h6"
                                sx={{ fontFamily: 'Raleway, sans-serif', fontWeight: 700, color: '#00e676', fontSize: { xs: '0.95rem', sm: '1.15rem' } }}
                              >
                                {formatPrice(lowestCurrentPrice)}
                              </Typography>
                            )}
                          </Box>

                          <Button
                            variant="contained"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(event);
                            }}
                            sx={{
                              backgroundColor: '#ff1955',
                              color: '#fff',
                              borderRadius: '16px',
                              py: { xs: 0.3, sm: 0.5 },
                              px: { xs: 1.5, sm: 2 },
                              fontSize: { xs: '0.74rem', sm: '0.82rem' },
                              fontWeight: 700,
                              textTransform: 'none',
                              minHeight: { xs: 26, sm: 30 },
                              boxShadow: 'none',
                              '&:hover': {
                                backgroundColor: '#e01545',
                                boxShadow: '0 0 12px rgba(255, 25, 85, 0.5)',
                              },
                            }}
                          >
                            Book Now
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  );
                })}
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

      {/* Google Sign-In Welcome Toast */}
      <Snackbar
        open={welcomeOpen}
        autoHideDuration={5000}
        onClose={() => setWelcomeOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={() => setWelcomeOpen(false)}
          severity="success"
          variant="filled"
          elevation={6}
          sx={{
            fontFamily: 'Raleway, sans-serif',
            fontWeight: 600,
            fontSize: '1rem',
            minWidth: 320,
          }}
        >
          {welcomeName
            ? `Welcome back, ${welcomeName}! You're signed in with Google.`
            : `Welcome! You're signed in with Google.`}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Events;
