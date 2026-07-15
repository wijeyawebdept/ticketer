import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Chip,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  Snackbar,
  Alert,
  Slide,
  SlideProps,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarToday, LocationOn } from '@mui/icons-material';
import PublicNavbar from '../../../components/public/PublicNavbar';
import PublicFooter from '../../../components/public/PublicFooter';
import EventService from '../../../services/event.service';
import BannerService, { BannerResponse } from '../../../services/banner.service';
import { Event } from '../../../types';
import { getAssetUrl } from '../../../utils/formatters';

const SlideTransition = (props: SlideProps) => <Slide {...props} direction="down" />;

// Import carousel images from public folder
const carouselImages = [
  '/images/1.jpg',
  '/images/2.jpg',
  '/images/3.jpg',
];

interface EventCardProps {
  title: string;
  artists: string;
  venue: string;
  tickets: string;
  date: string;
  day: string;
  backgroundImage: string;
  eventId: string;
  slug?: string;
}

const EventCard: React.FC<EventCardProps> = ({
  title,
  artists,
  venue,
  tickets,
  date,
  day,
  backgroundImage,
  eventId,
  slug,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  return (
    <Box
      sx={{
        minHeight: '325px',
        backgroundImage: `url(${backgroundImage})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
        backgroundSize: 'cover',
        marginBottom: '30px',
        padding: '0 15px',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Grid container>
        <Grid item xs={12} sm={12} md={8} lg={8} xl={8}>
          <Typography
            sx={{
              paddingTop: '15px',
              paddingBottom: '10px',
              paddingLeft: '15px',
              fontWeight: 900,
              fontFamily: 'Raleway, sans-serif',
              color: '#fcd0a5',
              fontSize: isMobile ? '30px' : '50px',
              lineHeight: 1.1,
              letterSpacing: 0,
              cursor: 'pointer',
              transition: 'color 0.3s',
              '&:hover': {
                color: '#ff1955',
              },
            }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              paddingBottom: '25px',
              paddingLeft: '15px',
              fontWeight: 700,
              fontFamily: 'Raleway, sans-serif',
              color: '#fff',
              fontSize: '19px',
              lineHeight: 1.2,
              letterSpacing: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-word',
            }}
          >
            {artists}
          </Typography>
          <Typography
            sx={{
              paddingTop: '10px',
              paddingBottom: '15px',
              paddingLeft: '15px',
              fontWeight: 300,
              fontFamily: 'Raleway, sans-serif',
              color: '#fcd0a5',
              fontSize: '19px',
              lineHeight: 1.2,
              letterSpacing: 0,
            }}
          >
            {venue}
          </Typography>
          <Typography
            sx={{
              paddingTop: '10px',
              paddingBottom: '15px',
              paddingLeft: '15px',
              fontWeight: 300,
              fontFamily: 'Raleway, sans-serif',
              color: '#fcd0a5',
              fontSize: '19px',
              lineHeight: 1.2,
              letterSpacing: 0,
            }}
          >
            {tickets}
          </Typography>
        </Grid>
        <Grid
          item
          xs={12}
          sm={12}
          md={4}
          lg={4}
          xl={4}
          sx={{ textAlign: { xs: 'left', md: 'right' } }}
        >
          <Typography
            sx={{
              paddingTop: '15px',
              paddingBottom: '10px',
              paddingRight: { xs: '15px', md: '15px' },
              paddingLeft: { xs: '15px', md: 0 },
              fontWeight: 300,
              fontFamily: 'Raleway, sans-serif',
              color: '#fff',
              fontSize: '25px',
              lineHeight: 1.2,
              letterSpacing: 0,
            }}
          >
            {day}
          </Typography>
          <Typography
            sx={{
              paddingTop: '5px',
              paddingBottom: '20px',
              paddingRight: { xs: '15px', md: '15px' },
              paddingLeft: { xs: '15px', md: 0 },
              fontWeight: 300,
              fontFamily: 'Raleway, sans-serif',
              color: '#ff1955',
              fontSize: '40px',
              lineHeight: 1,
              letterSpacing: 0,
              '& strong': {
                fontWeight: 700,
              },
            }}
            dangerouslySetInnerHTML={{ __html: date }}
          />
          <Box
            sx={{
              paddingRight: { xs: '15px', md: '15px' },
              paddingLeft: { xs: '15px', md: 0 },
              paddingBottom: '25px',
            }}
          >
            <Button
              onClick={() => navigate(`/event/${slug || eventId}`)}
              sx={{
                fontFamily: 'Raleway, sans-serif',
                fontWeight: 700,
                color: '#fcd0a5 !important',
                padding: '1px 27px',
                lineHeight: '48px',
                border: '1px solid #fcd0a5',
                borderRadius: '25px',
                letterSpacing: '3.6px',
                backgroundColor: 'transparent',
                transition: 'all .3s',
                '&:hover': {
                  color: '#ffffff !important',
                  backgroundColor: '#ff1955',
                  borderColor: '#ff1955',
                },
              }}
            >
              TICKETS
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

const Home: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [events, setEvents] = useState<Event[]>([]);
  const [dealEvents, setDealEvents] = useState<Event[]>([]);
  const dealsScrollRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState<BannerResponse[]>([]);
  const [timeFilter, setTimeFilter] = useState<'this-month' | 'next-month'>('this-month');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const [logoutOpen, setLogoutOpen] = useState(false);

  // Show logout toast when arriving from logout
  useEffect(() => {
    const state = location.state as { loggedOut?: boolean } | undefined;
    if (state?.loggedOut) {
      setLogoutOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Get carousel images - use banners if available, fallback to default images
  const carouselImages = banners.length > 0 
    ? banners.map(banner => banner.imageUrl)
    : ['/images/1.jpg', '/images/2.jpg', '/images/3.jpg'];

  // Load banners on component mount - always fetch fresh data without cache
  useEffect(() => {
    const loadBanners = async () => {
      try {
        // Get list of active banners with metadata
        const activeBanners = await BannerService.getActiveBanners();
        if (activeBanners && activeBanners.length > 0) {
          // Sort by displayOrder to ensure correct carousel order
          const sortedBanners = activeBanners.sort((a, b) => a.displayOrder - b.displayOrder);
          
          // Fetch full banner data (with images) for each banner
          const fullBannersWithImages = await Promise.all(
            sortedBanners.map(banner => 
              BannerService.getBannerById(banner.bannerId)
                .catch((error) => {
                  return null; // Mark as failed, will be filtered out
                })
            )
          );
          
          // Filter out any banners that failed to load (e.g., deactivated)
          // and only keep banners with image data
          const validBanners = fullBannersWithImages.filter(
            (banner): banner is BannerResponse => banner !== null && banner.imageUrl !== undefined
          );
          
          setBanners(validBanners);
        } else {
          // If no active banners, use empty array (will fallback to default images)
          setBanners([]);
        }
      } catch (error) {
        // Fall back to default images silently
        setBanners([]);
      }
    };

    loadBanners();
    
    // Refresh banners every 15 seconds to catch real-time updates (was 30s, now faster)
    const refreshInterval = setInterval(loadBanners, 15000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Load upcoming events based on time filter
  useEffect(() => {
    const loadUpcomingEvents = async () => {
      try {
        setLoading(true);
        // Fetch more events so we don't miss deals that might be further down the list
        const response = await EventService.getUpcomingPublishedEvents(0, 50);
        
        // Separate deal events from regular events
        const allEvents = response.content || [];
        
        // Ensure events are sorted by newest first
        allEvents.sort((a: Event, b: Event) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        const eventsWithDeals = allEvents.filter((event: Event) => event.hasDeal);
        const eventsWithoutDeals = allEvents.filter((event: Event) => !event.hasDeal);
        
        setDealEvents(eventsWithDeals);
        
        // Filter regular events based on selected time period
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        let filteredEvents = allEvents;
        
        if (timeFilter === 'this-month') {
          filteredEvents = filteredEvents.filter((event: Event) => {
            if (!event.startDateTime) return false;
            const eventDate = new Date(event.startDateTime);
            return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
          });
        } else if (timeFilter === 'next-month') {
          const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
          const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
          filteredEvents = filteredEvents.filter((event: Event) => {
            if (!event.startDateTime) return false;
            const eventDate = new Date(event.startDateTime);
            return eventDate.getMonth() === nextMonth && eventDate.getFullYear() === nextMonthYear;
          });
        }
        
        // Limit the "What's happening" section to 10 events so it doesn't get too long
        setEvents(filteredEvents.slice(0, 10));
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    loadUpcomingEvents();
  }, [timeFilter]);

  // Auto-rotate carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [carouselImages.length]);

  const handleSlideChange = (index: number) => {
    setActiveSlide(index);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'TBA';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'TBA';
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric'
      });
    } catch (error) {
      return 'TBA';
    }
  };

  const formatPrice = (price: number | null | undefined) => {
    if (!price || price === 0) return 'Free';
    return `LKR ${price.toLocaleString()}`;
  };

  const handleDealScroll = (direction: 'left' | 'right') => {
    if (dealsScrollRef.current) {
      const cardWidth = isMobile ? 280 : 330;
      const gap = 24; // theme.spacing(3) is 24px
      const scrollAmount = direction === 'left' ? -(cardWidth + gap) : (cardWidth + gap);
      dealsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: '#242a33',
        minHeight: '100vh',
      }}
    >
      <PublicNavbar />

      {/* Carousel Wrapper / Frame */}
      <Box
        sx={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: { xs: '15px', md: '40px 20px' },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            overflow: 'hidden',
            height: { xs: '200px', sm: '280px', md: '350px', lg: '450px' },
            borderRadius: '20px',
            border: '2px solid rgba(255, 25, 85, 0.5)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 25, 85, 0.15)',
            backgroundColor: '#1a1e24',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              transition: 'transform 0.5s ease-in-out',
              transform: `translateX(-${activeSlide * 100}%)`,
              height: '100%',
            }}
          >
            {carouselImages.map((image, index) => (
              <Box
                key={index}
                component="img"
                src={image}
                alt={`Slide ${index + 1}`}
                sx={{
                  width: '100%',
                  height: '100%',
                  flexShrink: 0,
                  display: 'block',
                  objectFit: 'cover', // cover fills the frame perfectly
                  objectPosition: 'center',
                }}
              />
            ))}
          </Box>

        {/* Carousel Indicators */}
        <Box
          sx={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 1,
            zIndex: 1,
          }}
        >
          {carouselImages.map((_, index) => (
            <Box
              key={index}
              onClick={() => handleSlideChange(index)}
              sx={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: activeSlide === index ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                transition: 'background-color 0.3s',
                border: '1px solid #fff',
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>

      {/* My Tickets Deals Section */}
      {dealEvents.length > 0 && (
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                fontFamily: 'Raleway, sans-serif',
                color: '#fff',
                fontSize: isMobile ? '24px' : '32px',
              }}
            >
              Ticketer Deals
            </Typography>
            <Button
              onClick={() => navigate('/deals')}
              sx={{
                fontFamily: 'Raleway, sans-serif',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.7)',
                textTransform: 'none',
                '&:hover': {
                  color: '#ff1955',
                },
              }}
              endIcon={<span style={{ fontSize: '1.2rem' }}>→</span>}
            >
              View more
            </Button>
          </Box>

          <Box sx={{ position: 'relative' }}>
            {/* Scroll Left Button */}
            {!isMobile && dealEvents.length > 3 && (
              <IconButton
                onClick={() => handleDealScroll('left')}
                sx={{
                  position: 'absolute',
                  left: -20,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 2,
                  backgroundColor: 'rgba(255, 25, 85, 0.9)',
                  color: '#fff',
                  '&:hover': { backgroundColor: '#ff1955' },
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
              >
                <ChevronLeft />
              </IconButton>
            )}

            {/* Deals Cards Container */}
            <Box
              ref={dealsScrollRef}
              sx={{
                display: 'flex',
                gap: 3,
                overflowX: 'auto',
                overflowY: 'hidden',
                scrollSnapType: 'x mandatory',
                scrollBehavior: 'smooth',
                pb: 2,
                px: 1, // Add padding to avoid cutting off box shadows
                mx: -1,
                '&::-webkit-scrollbar': { display: 'none' },
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
              }}
            >
              {dealEvents.map((event) => {
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
                  <Card
                    key={event.id || event.eventId}
                    sx={{
                      minWidth: isMobile ? '280px' : '330px',
                      maxWidth: isMobile ? '280px' : '330px',
                      scrollSnapAlign: 'start',
                      flexShrink: 0,
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: 2,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 24px rgba(255, 25, 85, 0.3)',
                      },
                    }}
                    onClick={() => navigate(`/event/${event.slug || event.id || event.eventId}`)}
                  >
                    {/* Badges */}
                    <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1, display: 'flex', gap: 1 }}>
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
                    </Box>
                    
                    <CardMedia
                      component="img"
                      height="200"
                      image={getAssetUrl(event.imageUrl) || '/images/default-event.jpg'}
                      alt={event.name}
                      sx={{ objectFit: 'cover' }}
                    />
                    
                    <CardContent>
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
                          minHeight: '56px',
                        }}
                      >
                        {event.name}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CalendarToday sx={{ fontSize: 16, color: '#ff1955', mr: 1 }} />
                        <Typography variant="body2" sx={{ fontFamily: 'Raleway, sans-serif', color: '#666' }}>
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

                      <Box sx={{ borderTop: '1px solid rgba(0, 0, 0, 0.1)', pt: 2 }}>
                        <Typography variant="body2" sx={{ color: '#999', fontSize: '0.75rem', mb: 0.5 }}>
                          Starting from
                        </Typography>
                        {showDiscountedPrice ? (
                          <Box>
                            <Typography
                              variant="caption"
                              sx={{ fontFamily: 'Raleway, sans-serif', color: '#aaa', textDecoration: 'line-through', display: 'block', fontSize: '0.8rem' }}
                            >
                              {formatPrice(lowestOriginalPrice)} upwards
                            </Typography>
                            <Typography
                              variant="h6"
                              sx={{
                                fontFamily: 'Raleway, sans-serif',
                                fontWeight: 700,
                                color: '#ff1955',
                                fontSize: '1.1rem',
                                mb: 2,
                              }}
                            >
                              {formatPrice(lowestCurrentPrice)}{' '}
                              <span style={{ fontSize: '0.875rem', fontWeight: 400 }}>upwards</span>
                            </Typography>
                          </Box>
                        ) : (
                          <Typography
                            variant="h6"
                            sx={{
                              fontFamily: 'Raleway, sans-serif',
                              fontWeight: 700,
                              color: '#ff1955',
                              fontSize: '1.1rem',
                              mb: 2,
                            }}
                          >
                            {formatPrice(lowestCurrentPrice)} <span style={{ fontSize: '0.875rem', fontWeight: 400 }}>upwards</span>
                          </Typography>
                        )}

                        <Button
                          fullWidth
                          variant="contained"
                          sx={{
                            backgroundColor: '#0d6efd',
                            color: '#fff',
                            fontFamily: 'Raleway, sans-serif',
                            fontWeight: 600,
                            textTransform: 'none',
                            py: 1,
                            '&:hover': { backgroundColor: '#0b5ed7' },
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/event/${event.slug || event.id || event.eventId}`);
                          }}
                        >
                          {event.dealDescription || 'Book Now •'}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                  );
                })}
            </Box>

            {/* Scroll Right Button */}
            {!isMobile && dealEvents.length > 3 && (
              <IconButton
                onClick={() => handleDealScroll('right')}
                sx={{
                  position: 'absolute',
                  right: -20,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 2,
                  backgroundColor: 'rgba(255, 25, 85, 0.9)',
                  color: '#fff',
                  '&:hover': { backgroundColor: '#ff1955' },
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
              >
                <ChevronRight />
              </IconButton>
            )}
          </Box>
        </Container>
      )}

      {/* Upcoming Events Section */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography
          variant="h1"
          sx={{
            fontWeight: 900,
            fontFamily: 'Raleway, sans-serif',
            color: '#ff1955',
            fontSize: isMobile ? '32px' : '60px',
            lineHeight: 1.1,
            letterSpacing: 0,
            marginTop: isMobile ? '30px' : '50px',
            marginBottom: isMobile ? '20px' : '30px',
            textAlign: 'center',
          }}
        >
          What's happening
        </Typography>

        {/* Time Filter Buttons */}
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: 2, 
            mb: 4,
            flexWrap: 'wrap'
          }}
        >
          <Button
            onClick={() => setTimeFilter('this-month')}
            sx={{
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 600,
              fontSize: isMobile ? '0.875rem' : '1rem',
              color: timeFilter === 'this-month' ? '#ff1955' : 'rgba(255, 255, 255, 0.7)',
              padding: '10px 30px',
              border: timeFilter === 'this-month' ? '2px solid #ff1955' : '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '25px',
              backgroundColor: timeFilter === 'this-month' ? 'rgba(255, 25, 85, 0.1)' : 'transparent',
              transition: 'all 0.3s ease',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: 'rgba(255, 25, 85, 0.2)',
                borderColor: '#ff1955',
                color: '#ff1955',
              },
            }}
          >
            This Month
          </Button>
          
          <Button
            onClick={() => setTimeFilter('next-month')}
            sx={{
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 600,
              fontSize: isMobile ? '0.875rem' : '1rem',
              color: timeFilter === 'next-month' ? '#ff1955' : 'rgba(255, 255, 255, 0.7)',
              padding: '10px 30px',
              border: timeFilter === 'next-month' ? '2px solid #ff1955' : '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '25px',
              backgroundColor: timeFilter === 'next-month' ? 'rgba(255, 25, 85, 0.1)' : 'transparent',
              transition: 'all 0.3s ease',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: 'rgba(255, 25, 85, 0.2)',
                borderColor: '#ff1955',
                color: '#ff1955',
              },
            }}
          >
            Next Month
          </Button>

          <Button
            onClick={() => navigate('/events')}
            sx={{
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 600,
              fontSize: isMobile ? '0.875rem' : '1rem',
              color: 'rgba(255, 255, 255, 0.7)',
              padding: '10px 30px',
              textTransform: 'none',
              transition: 'all 0.3s ease',
              '&:hover': {
                color: '#ff1955',
              },
            }}
            endIcon={<span style={{ fontSize: '1.2rem' }}>→</span>}
          >
            View more
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#ff1955' }} />
          </Box>
        ) : events.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" sx={{ color: '#666', fontFamily: 'Raleway, sans-serif' }}>
              No upcoming events at the moment. Check back soon!
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
              {events.map((event) => {
                // Compute the true lowest current price across all categories
                const allCategoryPrices = (event.ticketCategories || []).map((tc: any) => {
                  const originalPrice = Number(tc.price) || 0;
                  const currentPrice = (tc.dealActive && tc.dealDiscountPercentage > 0)
                    ? originalPrice * (1 - tc.dealDiscountPercentage / 100)
                    : originalPrice;
                  return { originalPrice, currentPrice };
                });

                const lowestCurrentPrice = allCategoryPrices.length > 0
                  ? Math.min(...allCategoryPrices.map(p => p.currentPrice))
                  : Number(event.basePrice) || 0;

                return (
                <Grid item xs={12} key={event.id || event.eventId}>
                  <EventCard
                    title={event.name}
                    artists={event.description?.substring(0, 100) || ''}
                    venue={event.venue?.name || 'TBA'}
                    tickets={`From ${formatPrice(lowestCurrentPrice)}`}
                    date={event.startDateTime ? new Date(event.startDateTime).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) : 'TBA'}
                    day={event.startDateTime ? new Date(event.startDateTime).toLocaleDateString('en-US', { weekday: 'long' }) : 'TBA'}
                    backgroundImage={getAssetUrl(event.imageUrl) || '/images/default-event.jpg'}
                    eventId={event.id || event.eventId}
                    slug={event.slug}
                  />
                </Grid>
                );
              })}
          </Grid>
        )}

        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button
            variant="contained"
            onClick={() => navigate('/events')}
            sx={{
              backgroundColor: '#ff1955',
              color: '#fff',
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 700,
              fontSize: '1.1rem',
              px: 4,
              py: 1.5,
              '&:hover': {
                backgroundColor: '#e01545',
              },
            }}
          >
            View All Events
          </Button>
        </Box>
      </Container>
      <PublicFooter />

      {/* Logout confirmation Toast */}
      <Snackbar
        open={logoutOpen}
        autoHideDuration={5000}
        onClose={() => setLogoutOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={() => setLogoutOpen(false)}
          severity="info"
          variant="filled"
          elevation={6}
          sx={{
            fontFamily: 'Raleway, sans-serif',
            fontWeight: 600,
            fontSize: '1rem',
            minWidth: 320,
          }}
        >
          You've been signed out. See you next time!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Home;
