import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
} from '@mui/material';
import {
  EventNote as EventNoteIcon,
  Payment as PaymentIcon,
  LocationOn as LocationIcon,
  ReceiptLong as ReceiptLongIcon,
  Verified as VerifiedIcon,
  Bolt as SpeedIcon,
  Lock as SecurityIcon,
  Groups as PeopleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../../../components/public/PublicNavbar';
import PublicFooter from '../../../components/public/PublicFooter';

const Services: React.FC = () => {
  const navigate = useNavigate();

  const services = [
    {
      icon: <EventNoteIcon sx={{ fontSize: 50, color: '#ff1955' }} />,
      title: 'Ticket Booking & Reservation',
      description: 'Reserve and book tickets for your favorite events with just a few clicks. Choose your preferred seats and complete your booking.',
      features: [
        'Quick reservation process',
        'Flexible booking options',
        'Real-time availability updates',
        'Booking confirmation',
      ],
    },
    {
      icon: <PaymentIcon sx={{ fontSize: 50, color: '#ff1955' }} />,
      title: 'Secure Payment Processing',
      description: 'Process payments securely using multiple payment methods. All transactions are encrypted and protected.',
      features: [
        'Multiple payment options',
        'Secure payment gateway (MPGS)',
        'Transaction encryption',
        'Fraud protection',
      ],
    },
    {
      icon: <LocationIcon sx={{ fontSize: 50, color: '#ff1955' }} />,
      title: 'Interactive Seat Selection',
      description: 'Visualize and select your preferred seats using our interactive seat map. See real-time availability and pricing.',
      features: [
        'Visual seat maps',
        'Real-time seat status',
        'Price information per seat',
        'Multiple venue layouts',
      ],
    },
    {
      icon: <ReceiptLongIcon sx={{ fontSize: 50, color: '#ff1955' }} />,
      title: 'Bookings & History',
      description: 'Manage your bookings and view your complete booking history. Access digital tickets anytime, anywhere.',
      features: [
        'Booking history tracking',
        'Digital ticket delivery',
        'Booking status updates',
        'Email and SMS notifications',
      ],
    }
  ];

  const benefits = [
    {
      icon: <SpeedIcon sx={{ fontSize: 30, color: '#ff1955' }} />,
      title: 'Fast & Efficient',
      description: 'Quick booking process from search to payment in just a few minutes.',
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 30, color: '#ff1955' }} />,
      title: 'Secure & Safe',
      description: 'Industry-leading security measures to protect your personal and payment information.',
    },
    {
      icon: <PeopleIcon sx={{ fontSize: 30, color: '#ff1955' }} />,
      title: 'User-Friendly',
      description: 'Intuitive interface designed for users of all technical levels.',
    },
  ];

  return (
    <Box sx={{ backgroundColor: '#242a33', color: '#fff' }}>
      <PublicNavbar />

      {/* Hero Section */}
      <Box
        sx={{
          backgroundImage: "url('/images/party 2.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: 'white',
          pt: { xs: 12, md: 16 },
          pb: { xs: 6, md: 10 },
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 1,
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: 2,
              fontFamily: 'Raleway, sans-serif',
              fontSize: { xs: '2rem', md: '3rem' },
              color: '#fcd0a5',
            }}
          >
            Our Services
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 300,
              opacity: 0.9,
              fontFamily: 'Raleway, sans-serif',
              lineHeight: 1.6,
              color: '#fff',
              maxWidth: '800px',
              mx: 'auto',
            }}
          >
            Explore the wide range of features we offer to make your event ticketing experience seamless and secure.
          </Typography>
        </Container>
      </Box>

      {/* Services Section */}
      <Box sx={{ py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {services.map((service, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 4, flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {service.icon}
                      <Typography
                        variant="h6"
                        component="div"
                        sx={{ fontWeight: 700, ml: 2, color: '#fcd0a5' }}
                      >
                        {service.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 2, opacity: 0.85, lineHeight: 1.7 }}>
                      {service.description}
                    </Typography>
                    <List dense>
                      {service.features.map((feature, i) => (
                        <ListItem key={i} sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: '30px' }}>
                            <VerifiedIcon sx={{ fontSize: 18, color: '#ff1955' }} />
                          </ListItemIcon>
                          <ListItemText primary={feature} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Benefits Section */}
      <Box sx={{ backgroundColor: 'rgba(0,0,0,0.2)', py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {benefits.map((benefit, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Box sx={{ textAlign: 'center' }}>
                  {benefit.icon}
                  <Typography variant="h6" sx={{ fontWeight: 700, mt: 1, color: '#fcd0a5' }}>
                    {benefit.title}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                    {benefit.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ py: { xs: 6, md: 10 }, textAlign: 'center' }}>
        <Container maxWidth="sm">
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: '#fcd0a5' }}>
            Ready to Get Started?
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 300, mb: 4, opacity: 0.9 }}>
            Join thousands of satisfied users and make your next event unforgettable.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/events')}
            sx={{
              backgroundColor: '#ff1955',
              color: '#fff',
              fontWeight: 600,
              px: 5,
              py: 1.5,
              '&:hover': {
                backgroundColor: '#e0003c',
              },
            }}
          >
            Browse Events
          </Button>
        </Container>
      </Box>
      <PublicFooter />
    </Box>
  );
};

export default Services;
