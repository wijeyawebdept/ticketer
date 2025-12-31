import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  useMediaQuery,
  useTheme,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../../../components/public/PublicNavbar';
import EventService from '../../../services/event.service';
import { Event } from '../../../types';

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
              onClick={() => navigate(`/event/${eventId}`)}
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
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  // Load upcoming events
  useEffect(() => {
    const loadUpcomingEvents = async () => {
      try {
        setLoading(true);
        const response = await EventService.getUpcomingPublishedEvents(0, 6);
        console.log('Upcoming events response:', response);
        console.log('First upcoming event:', response.content?.[0]);
        setEvents(response.content || []);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUpcomingEvents();
  }, []);

  // Auto-rotate carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSlideChange = (index: number) => {
    setActiveSlide(index);
  };

  return (
    <Box
      sx={{
        backgroundColor: '#242a33',
        minHeight: '100vh',
      }}
    >
      <PublicNavbar />

      {/* Carousel */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            transition: 'transform 0.5s ease-in-out',
            transform: `translateX(-${activeSlide * 100}%)`,
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
                height: 'auto',
                flexShrink: 0,
                display: 'block',
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
            marginBottom: isMobile ? '20px' : '40px',
            textAlign: 'center',
          }}
        >
          Upcoming Events
        </Typography>

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
            {events.map((event) => (
              <Grid item xs={12} key={event.id || event.eventId}>
                <EventCard
                  title={event.name}
                  artists={event.description?.substring(0, 100) || ''}
                  venue={event.venue?.name || 'TBA'}
                  tickets={`From LKR ${event.basePrice || 'TBA'}`}
                  date={new Date(event.startDateTime).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                  day={new Date(event.startDateTime).toLocaleDateString('en-US', { weekday: 'long' })}
                  backgroundImage={event.imageUrl || '/images/default-event.jpg'}
                  eventId={event.id || event.eventId}
                />
              </Grid>
            ))}
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
    </Box>
  );
};

export default Home;
