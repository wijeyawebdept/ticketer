import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import PublicNavbar from '../../../components/public/PublicNavbar';
import PublicFooter from '../../../components/public/PublicFooter';

const About: React.FC = () => {
  return (
    <Box>
      <PublicNavbar />
      
      {/* Hero Section */}
      <Box
        sx={{
          backgroundImage: "url('/images/party 1.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: 'white',
          py: { xs: 6, md: 10 },
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
          <Grid container spacing={4} alignItems="center" justifyContent="center">
            <Grid item xs={12} md={8}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  fontFamily: 'Raleway, sans-serif',
                  fontSize: { xs: '1.75rem', md: '2.5rem' },
                  color: '#fcd0a5',
                }}
              >
                About Ticketer.lk
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 300,
                  mb: 3,
                  opacity: 0.9,
                  fontFamily: 'Raleway, sans-serif',
                  lineHeight: 1.6,
                  color: '#fff',
                }}
              >
                Your premier digital platform for discovering, booking, and managing event tickets. 
                We connect event organizers with enthusiastic attendees, making ticket booking 
                simple, secure, and enjoyable.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  opacity: 0.85,
                  fontFamily: 'Raleway, sans-serif',
                  lineHeight: 1.8,
                  color: '#fff',
                }}
              >
                Whether you're looking for concerts, theater shows, sports events, or conferences, 
                Ticketer.lk is your one-stop destination for all your ticketing needs.
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Mission & Vision Section */}
      <Box sx={{ backgroundColor: '#242a33', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
        <Grid container spacing={4} sx={{ mb: 8 }}>
          <Grid item xs={12}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                textAlign: 'center',
                mb: 6,
                fontFamily: 'Raleway, sans-serif',
                color: '#fcd0a5',
              }}
            >
              Our Mission & Vision
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: '100%',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    mb: 2,
                    color: '#ff1955',
                    fontFamily: 'Raleway, sans-serif',
                  }}
                >
                  Our Mission
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: '#ccc',
                    lineHeight: 1.8,
                    fontFamily: 'Raleway, sans-serif',
                  }}
                >
                  To revolutionize the event ticketing industry by providing a secure, user-friendly, 
                  and innovative platform that connects event organizers with attendees worldwide. 
                  We strive to make ticket purchasing accessible, transparent, and rewarding for everyone.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: '100%',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    mb: 2,
                    color: '#ff1955',
                    fontFamily: 'Raleway, sans-serif',
                  }}
                >
                  Our Vision
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: '#ccc',
                    lineHeight: 1.8,
                    fontFamily: 'Raleway, sans-serif',
                  }}
                >
                  To become the most trusted and preferred ticketing platform in the region, 
                  known for excellence, innovation, and customer satisfaction. We envision a future 
                  where booking tickets is effortless and attending events is an enriching experience.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        </Container>
      </Box>
      <PublicFooter />
    </Box>
  );
};

export default About;
