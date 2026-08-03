import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { useCurrency } from '../../../context/CurrencyContext';

const SlideTransition = (props: SlideProps) => <Slide {...props} direction="down" />;


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
  useMediaQuery(theme.breakpoints.down('sm'));

  // Helper to format clean date string without HTML tags for badges
  const cleanDateText = (date || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  return (
    <Box
      sx={{
        marginBottom: '40px',
        backgroundColor: '#1b222c',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: 'rgba(255, 25, 85, 0.35)',
          boxShadow: '0 14px 40px rgba(0, 0, 0, 0.5)',
        },
      }}
    >
      <Grid container alignItems="stretch">
        {/* Left Column: 100% Clean Event Banner Image (Non-clickable) */}
        <Grid item xs={12} md={8.5} lg={9}>
          <Box
            sx={{
              height: { xs: '260px', sm: '340px', md: '100%' },
              minHeight: { md: '320px' },
              backgroundImage: `url(${backgroundImage})`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center center',
              backgroundSize: 'cover',
            }}
          />
        </Grid>

        {/* Right Column: Compact Dedicated Info Panel */}
        <Grid item xs={12} md={3.5} lg={3}>
          <Box
            sx={{
              p: { xs: 2.5, sm: 2.5, md: 2.5 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
              boxSizing: 'border-box',
            }}
          >
            <Box>
              {/* Event Title */}
              <Typography
                sx={{
                  fontWeight: 800,
                  fontFamily: 'Raleway, sans-serif',
                  color: '#fff',
                  fontSize: { xs: '18px', sm: '20px', md: '21px' },
                  lineHeight: 1.25,
                  mb: 2,
                }}
              >
                {title}
              </Typography>

              {/* Date & Time */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <CalendarToday sx={{ fontSize: 18, color: '#ff1955', mr: 1.2, flexShrink: 0 }} />
                <Typography
                  sx={{
                    fontFamily: 'Raleway, sans-serif',
                    fontWeight: 600,
                    color: '#e2e8f0',
                    fontSize: '0.88rem',
                  }}
                >
                  {day ? `${day}, ` : ''}{cleanDateText}
                </Typography>
              </Box>

              {/* Venue */}
              {venue && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <LocationOn sx={{ fontSize: 18, color: '#fcd0a5', mr: 1.2, flexShrink: 0 }} />
                  <Typography
                    sx={{
                      fontFamily: 'Raleway, sans-serif',
                      fontWeight: 600,
                      color: '#fcd0a5',
                      fontSize: '0.88rem',
                    }}
                  >
                    {venue}
                  </Typography>
                </Box>
              )}

              {/* Tickets / Pricing */}
              {tickets && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography
                    sx={{
                      fontFamily: 'Raleway, sans-serif',
                      fontWeight: 700,
                      color: '#00e676',
                      fontSize: '0.92rem',
                    }}
                  >
                    {tickets}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Book Button */}
            <Button
              onClick={() => navigate(`/event/${slug || eventId}`)}
              variant="contained"
              fullWidth
              sx={{
                fontFamily: 'Raleway, sans-serif',
                fontWeight: 700,
                fontSize: '0.9rem',
                textTransform: 'none',
                backgroundColor: '#ff1955',
                color: '#fff',
                borderRadius: '25px',
                py: 1,
                letterSpacing: '0.5px',
                boxShadow: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  backgroundColor: '#ff1955',
                  boxShadow: '0 0 22px 5px rgba(255, 25, 85, 0.7), 0 4px 15px rgba(255, 25, 85, 0.4)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              Book Your Seat
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

const Home: React.FC = () => {
  const { formatCurrency } = useCurrency();
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

  const [publishedEvents, setPublishedEvents] = useState<Event[]>([]);

  // Show logout toast when arriving from logout
  useEffect(() => {
    const state = location.state as { loggedOut?: boolean } | undefined;
    if (state?.loggedOut) {
      setLogoutOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Load banners on component mount - always fetch fresh data without cache
  useEffect(() => {
    const loadBanners = async () => {
      try {
        const activeBanners = await BannerService.getActiveBanners();
        if (activeBanners && activeBanners.length > 0) {
          const sortedBanners = activeBanners.sort((a, b) => a.displayOrder - b.displayOrder);
          const fullBannersWithImages = await Promise.all(
            sortedBanners.map(banner =>
              BannerService.getBannerById(banner.bannerId)
                .catch(() => null)
            )
          );
          const validBanners = fullBannersWithImages.filter(
            (banner): banner is BannerResponse => banner !== null && banner.imageUrl !== undefined
          );
          setBanners(validBanners);
        } else {
          setBanners([]);
        }
      } catch (error) {
        setBanners([]);
      }
    };

    loadBanners();
    const refreshInterval = setInterval(loadBanners, 15000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Load upcoming events based on time filter
  useEffect(() => {
    const loadUpcomingEvents = async () => {
      try {
        setLoading(true);
        const response = await EventService.getUpcomingPublishedEvents(0, 50);
        const allEvents = response.content || [];

        allEvents.sort((a: Event, b: Event) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        setPublishedEvents(allEvents);

        const eventsWithDeals = allEvents.filter((event: Event) => event.hasDeal);
        setDealEvents(eventsWithDeals);

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

        setEvents(filteredEvents.slice(0, 10));
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    loadUpcomingEvents();
  }, [timeFilter]);

  // Auto-rotate carousel based on published events
  useEffect(() => {
    if (publishedEvents.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % publishedEvents.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [publishedEvents.length]);

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

  const formatShortDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'TBA';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'TBA';
      const day = date.getDate();
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      return `${day} ${month}`;
    } catch (error) {
      return 'TBA';
    }
  };

  const getMinPrice = (eventItem: Event): number => {
    if (eventItem.ticketCategories && eventItem.ticketCategories.length > 0) {
      const prices = eventItem.ticketCategories.map((cat: any) => {
        const originalPrice = Number(cat.price) || 0;
        const discount = Number(cat.dealDiscountPercentage) || 0;
        return (cat.dealActive && discount > 0)
          ? originalPrice * (1 - discount / 100)
          : originalPrice;
      });
      return Math.min(...prices);
    }
    return Number(eventItem.basePrice || eventItem.ticketPrice || 0);
  };

  const formatPrice = (price: number | null | undefined) => {
    if (!price || price === 0) return 'Free';
    return formatCurrency(price);
  };

  // Unified hero slides merging custom admin banners and published events
  const heroSlides = useMemo(() => {
    const slides: Array<{
      id: string | number;
      imageUrl: string;
      title?: string;
      venueName?: string;
      eventDateStr?: string;
      minPrice?: number;
      targetUrl?: string;
      buttonText?: string;
      isCustomAdminBanner?: boolean;
    }> = [];

    const processedEventIds = new Set<string | number>();

    // 1. Process custom admin banners first (standalone admin-uploaded banners show without text/button overlays)
    banners.forEach((banner: BannerResponse) => {
      const targetId = banner.targetEventId;
      const linkedEvent = targetId
        ? publishedEvents.find((e: Event) => String(e.id) === String(targetId) || String(e.eventId) === String(targetId))
        : undefined;

      if (linkedEvent) {
        const eId = linkedEvent.id || linkedEvent.eventId || '';
        if (eId) processedEventIds.add(eId);
        slides.push({
          id: `admin-banner-${banner.bannerId}`,
          imageUrl: getAssetUrl(banner.imageUrl || linkedEvent.imageUrl || '') || '',
          title: linkedEvent.name,
          venueName: linkedEvent.venue?.name || 'Venue TBA',
          eventDateStr: formatShortDate(linkedEvent.startDateTime || linkedEvent.nextSchedule?.scheduleDate),
          minPrice: getMinPrice(linkedEvent),
          targetUrl: `/event/${linkedEvent.slug || linkedEvent.id || linkedEvent.eventId}`,
          buttonText: 'Tickets',
          isCustomAdminBanner: false,
        });
      } else if (banner.imageUrl) {
        slides.push({
          id: `admin-banner-${banner.bannerId}`,
          imageUrl: getAssetUrl(banner.imageUrl || '') || '',
          targetUrl: banner.linkUrl || undefined,
          isCustomAdminBanner: true,
        });
      }
    });

    // 2. Add published events that were not already linked by a custom admin banner
    publishedEvents.forEach((eventItem: Event) => {
      const eventId = eventItem.id || eventItem.eventId || '';
      if (!eventId || !processedEventIds.has(eventId)) {
        slides.push({
          id: `event-${eventId || Math.random()}`,
          imageUrl: getAssetUrl(eventItem.imageUrl || '') || '',
          title: eventItem.name,
          venueName: eventItem.venue?.name || 'Venue TBA',
          eventDateStr: formatShortDate(eventItem.startDateTime || eventItem.nextSchedule?.scheduleDate),
          minPrice: getMinPrice(eventItem),
          targetUrl: `/event/${eventItem.slug || eventItem.id || eventItem.eventId}`,
          buttonText: 'Tickets',
          isCustomAdminBanner: false,
        });
      }
    });

    return slides;
  }, [banners, publishedEvents]);

  const handleDealScroll = (direction: 'left' | 'right') => {
    if (dealsScrollRef.current) {
      const cardWidth = isMobile ? 280 : 330;
      const gap = 24;
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

      {/* Hero Banner Carousel Frame */}
      <Box
        sx={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: { xs: '30px 15px 15px', md: '55px 20px 15px' },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            overflow: 'hidden',
            height: { xs: '300px', sm: '370px', md: '440px', lg: '480px' },
            borderRadius: '18px',
            border: '1.5px solid #ff1955',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
            backgroundColor: '#12161f',
          }}
        >
          {heroSlides.length > 0 ? (
            <>
              {/* Slides Track */}
              <Box
                sx={{
                  display: 'flex',
                  transition: 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)',
                  transform: `translateX(-${activeSlide * 100}%)`,
                  height: '100%',
                }}
              >
                {heroSlides.map((slide: any, index: number) => {
                  const bannerImg = slide.imageUrl;
                  const minPrice = slide.minPrice;
                  const eventDateStr = slide.eventDateStr;

                  return (
                    <Box
                      key={slide.id || index}
                      onClick={() => {
                        if (slide.targetUrl) {
                          if (slide.targetUrl.startsWith('http')) {
                            window.open(slide.targetUrl, '_blank');
                          } else {
                            navigate(slide.targetUrl);
                          }
                        }
                      }}
                      sx={{
                        width: '100%',
                        minWidth: '100%',
                        height: { xs: '300px', sm: '370px', md: '440px', lg: '480px' },
                        flexShrink: 0,
                        position: 'relative',
                        backgroundImage: `url(${bannerImg})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center center',
                        backgroundRepeat: 'no-repeat',
                        display: 'flex',
                        alignItems: 'flex-end',
                        cursor: slide.targetUrl ? 'pointer' : 'default',
                      }}
                    >
                      {/* Gradient Overlay for text contrast (only when slide has title or card) */}
                      {!slide.isCustomAdminBanner && (
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            background: {
                              xs: 'linear-gradient(to top, rgba(10, 14, 22, 0.92) 0%, rgba(10, 14, 22, 0.5) 60%, rgba(10, 14, 22, 0.05) 100%)',
                              md: 'linear-gradient(to right, rgba(10, 14, 22, 0.9) 0%, rgba(10, 14, 22, 0.35) 50%, rgba(10, 14, 22, 0.7) 100%)',
                            },
                            zIndex: 1,
                          }}
                        />
                      )}

                      {/* Content Overlay (only for event banners or banners with info) */}
                      {!slide.isCustomAdminBanner && (
                        <Box
                          sx={{
                            position: 'relative',
                            zIndex: 2,
                            width: '100%',
                            p: { xs: 1.5, sm: 2.5, md: 2.5 },
                            pb: { xs: 2, sm: 2.5, md: 2.5 },
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            justifyContent: 'space-between',
                            alignItems: { xs: 'stretch', md: 'flex-end' },
                            gap: { xs: 1.5, md: 2.5 },
                          }}
                        >
                          {/* Bottom Left: Event Title */}
                          {slide.title && (
                            <Box sx={{ maxWidth: { xs: '100%', md: '55%' }, mb: { xs: 0, md: 0.5 } }}>
                              <Typography
                                component="h1"
                                sx={{
                                  fontFamily: 'Raleway, sans-serif',
                                  fontWeight: 900,
                                  color: '#ffffff',
                                  fontSize: { xs: '16px', sm: '22px', md: '26px' },
                                  lineHeight: 1.15,
                                  letterSpacing: '-0.5px',
                                  textShadow: '0 4px 16px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.8)',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {slide.title}
                              </Typography>
                            </Box>
                          )}

                          {/* Bottom Right: Floating Card */}
                          {(slide.venueName || slide.buttonText) && (
                            <Box
                              sx={{
                                width: { xs: '100%', sm: '270px', md: '285px' },
                                backgroundColor: 'rgba(23, 28, 38, 0.85)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                borderRadius: '14px',
                                border: '1px solid rgba(255, 25, 85, 0.25)',
                                p: 1.5,
                                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.65), 0 0 15px rgba(255, 25, 85, 0.15)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.9,
                                flexShrink: 0,
                              }}
                            >
                              {/* WHERE Pill (if venueName present) */}
                              {slide.venueName && (
                                <Box
                                  sx={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    borderRadius: '8px',
                                    p: '6px 10px',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: '9px',
                                      fontWeight: 800,
                                      color: 'rgba(255, 255, 255, 0.5)',
                                      letterSpacing: '1px',
                                      textTransform: 'uppercase',
                                      mb: '1px',
                                      fontFamily: 'Raleway, sans-serif',
                                    }}
                                  >
                                    WHERE
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      color: '#ffffff',
                                      fontFamily: 'Raleway, sans-serif',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {slide.venueName}
                                  </Typography>
                                </Box>
                              )}

                              {/* WHEN & FROM Row (if eventDateStr or minPrice present) */}
                              {(eventDateStr || minPrice !== undefined) && (
                                <Box sx={{ display: 'flex', gap: 0.9 }}>
                                  {eventDateStr && (
                                    <Box
                                      sx={{
                                        flex: 1,
                                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                        borderRadius: '8px',
                                        p: '6px 10px',
                                        border: '1px solid rgba(255, 255, 255, 0.06)',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: '9px',
                                          fontWeight: 800,
                                          color: 'rgba(255, 255, 255, 0.5)',
                                          letterSpacing: '1px',
                                          textTransform: 'uppercase',
                                          mb: '1px',
                                          fontFamily: 'Raleway, sans-serif',
                                        }}
                                      >
                                        WHEN
                                      </Typography>
                                      <Typography
                                        sx={{
                                          fontSize: '12px',
                                          fontWeight: 700,
                                          color: '#ffffff',
                                          fontFamily: 'Raleway, sans-serif',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {eventDateStr}
                                      </Typography>
                                    </Box>
                                  )}

                                  {minPrice !== undefined && (
                                    <Box
                                      sx={{
                                        flex: 1,
                                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                        borderRadius: '8px',
                                        p: '6px 10px',
                                        border: '1px solid rgba(255, 255, 255, 0.06)',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: '9px',
                                          fontWeight: 800,
                                          color: 'rgba(255, 255, 255, 0.5)',
                                          letterSpacing: '1px',
                                          textTransform: 'uppercase',
                                          mb: '1px',
                                          fontFamily: 'Raleway, sans-serif',
                                        }}
                                      >
                                        FROM
                                      </Typography>
                                      <Typography
                                        sx={{
                                          fontSize: '12px',
                                          fontWeight: 700,
                                          color: '#ffffff',
                                          fontFamily: 'Raleway, sans-serif',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {formatPrice(minPrice)}
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              )}

                              {/* Action Button */}
                              <Button
                                onClick={() => {
                                  if (slide.targetUrl) {
                                    if (slide.targetUrl.startsWith('http')) {
                                      window.open(slide.targetUrl, '_blank');
                                    } else {
                                      navigate(slide.targetUrl);
                                    }
                                  }
                                }}
                                variant="contained"
                                fullWidth
                                sx={{
                                  background: 'linear-gradient(135deg, #ff1955 0%, #d01443 100%)',
                                  color: '#ffffff',
                                  borderRadius: '8px',
                                  py: 0.9,
                                  fontSize: '13px',
                                  fontWeight: 800,
                                  fontFamily: 'Raleway, sans-serif',
                                  textTransform: 'none',
                                  boxShadow: '0 6px 18px rgba(255, 25, 85, 0.45)',
                                  transition: 'all 0.3s ease',
                                  '&:hover': {
                                    background: 'linear-gradient(135deg, #ff3366 0%, #b80f39 100%)',
                                    boxShadow: '0 8px 22px rgba(255, 25, 85, 0.65)',
                                    transform: 'translateY(-2px)',
                                  },
                                }}
                              >
                                {slide.buttonText || 'Tickets'} &nbsp;→
                              </Button>
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>

              {/* Prev / Next Arrows */}
              {heroSlides.length > 1 && (
                <>
                  <IconButton
                    onClick={() => setActiveSlide((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1))}
                    sx={{
                      position: 'absolute',
                      left: { xs: 8, md: 16 },
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 10,
                      color: '#ffffff',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      backdropFilter: 'blur(8px)',
                      '&:hover': { backgroundColor: '#ff1955' },
                    }}
                  >
                    <ChevronLeft />
                  </IconButton>
                  <IconButton
                    onClick={() => setActiveSlide((prev) => (prev + 1) % heroSlides.length)}
                    sx={{
                      position: 'absolute',
                      right: { xs: 8, md: 16 },
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 10,
                      color: '#ffffff',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      backdropFilter: 'blur(8px)',
                      '&:hover': { backgroundColor: '#ff1955' },
                    }}
                  >
                    <ChevronRight />
                  </IconButton>
                </>
              )}

              {/* Carousel Indicator Dots */}
              {heroSlides.length > 1 && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: 1,
                    zIndex: 10,
                  }}
                >
                  {heroSlides.map((_, index) => (
                    <Box
                      key={index}
                      onClick={() => handleSlideChange(index)}
                      sx={{
                        width: activeSlide === index ? '24px' : '10px',
                        height: '10px',
                        borderRadius: '10px',
                        backgroundColor: activeSlide === index ? '#ff1955' : 'rgba(255, 255, 255, 0.4)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                      }}
                    />
                  ))}
                </Box>
              )}
            </>
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CircularProgress sx={{ color: '#ff1955' }} />
            </Box>
          )}
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
          <Box>
            {Object.entries(
              events.reduce<{ [key: string]: Event[] }>((acc, event) => {
                const categoryName = event.category?.categoryName || 'Other';
                if (!acc[categoryName]) {
                  acc[categoryName] = [];
                }
                acc[categoryName].push(event);
                return acc;
              }, {})
            ).map(([categoryName, categoryEvents]) => {
              const displayCategoryName = categoryName.toLowerCase() === 'other'
                ? 'Other'
                : categoryName
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                  .join(' ');

              return (
                <Box key={categoryName} sx={{ mb: 6 }}>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 700,
                      fontFamily: 'Raleway, sans-serif',
                      color: '#fff',
                      fontSize: isMobile ? '22px' : '28px',
                      mb: 3.5,
                      position: 'relative',
                      display: 'inline-block',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: '-8px',
                        left: 0,
                        width: '60px',
                        height: '4px',
                        backgroundColor: '#ff1955',
                        borderRadius: '2px',
                      }
                    }}
                  >
                    {displayCategoryName}
                  </Typography>

                  <Grid container spacing={3}>
                    {categoryEvents.map((event) => {
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
                            date={event.startDateTime ? new Date(event.startDateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBA'}
                            day={event.startDateTime ? new Date(event.startDateTime).toLocaleDateString('en-US', { weekday: 'long' }) : 'TBA'}
                            backgroundImage={getAssetUrl(event.imageUrl) || '/images/default-event.jpg'}
                            eventId={event.id || event.eventId}
                            slug={event.slug}
                          />
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              );
            })}
          </Box>
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
