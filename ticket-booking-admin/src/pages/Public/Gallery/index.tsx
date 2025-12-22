import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Button,
  Card,
  CardMedia,
  Fade,
} from '@mui/material';
import PublicNavbar from '../../../components/public/PublicNavbar';

interface GalleryItem {
  id: number;
  category: string;
  imageUrl: string;
}

const Gallery: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Gallery items with categories
  const galleryItems: GalleryItem[] = [
    { id: 1, category: 'hdpe', imageUrl: 'http://fakeimg.pl/365x365/' },
    { id: 2, category: 'sprinkle', imageUrl: 'http://fakeimg.pl/365x365/' },
    { id: 3, category: 'hdpe', imageUrl: 'http://fakeimg.pl/365x365/' },
    { id: 4, category: 'irrigation', imageUrl: 'http://fakeimg.pl/365x365/' },
    { id: 5, category: 'spray', imageUrl: 'http://fakeimg.pl/365x365/' },
    { id: 6, category: 'irrigation', imageUrl: 'http://fakeimg.pl/365x365/' },
    { id: 7, category: 'spray', imageUrl: 'http://fakeimg.pl/365x365/' },
    { id: 8, category: 'irrigation', imageUrl: 'http://fakeimg.pl/365x365/' },
    { id: 9, category: 'irrigation', imageUrl: 'http://fakeimg.pl/365x365/' },
    { id: 10, category: 'hdpe', imageUrl: 'http://fakeimg.pl/365x365/' },
    { id: 11, category: 'spray', imageUrl: 'http://fakeimg.pl/365x365/' },
    { id: 12, category: 'sprinkle', imageUrl: 'http://fakeimg.pl/365x365/' },
  ];

  const filters = [
    { label: 'All', value: 'all' },
    { label: 'HDPE Pipes', value: 'hdpe' },
    { label: 'Sprinkle Pipes', value: 'sprinkle' },
    { label: 'Spray Nozzle', value: 'spray' },
    { label: 'Irrigation Pipes', value: 'irrigation' },
  ];

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
  };

  const filteredItems = selectedFilter === 'all' 
    ? galleryItems 
    : galleryItems.filter(item => item.category === selectedFilter);

  return (
    <Box
      sx={{
        backgroundImage: 'url(/images/mt-0390-tickets-bg.jpg)',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'top center',
        backgroundSize: 'cover',
        minHeight: '100vh',
        width: '100%',
      }}
    >
      <PublicNavbar />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container sx={{ mt: 4 }}>
          <Grid item xs={12}>
            <Box sx={{ position: 'relative', mb: 4, mt: 4 }}>
              <Typography
                variant="h3"
                sx={{
                  fontSize: '36px',
                  textAlign: 'center',
                  fontWeight: 900,
                  marginBottom: '30px',
                  marginTop: '30px',
                  color: '#fff',
                  fontFamily: 'Raleway, sans-serif',
                }}
              >
                Photos
              </Typography>
              <Box
                sx={{
                  content: '""',
                  position: 'absolute',
                  width: '7.5%',
                  left: '46.5%',
                  height: '45px',
                  borderBottom: '1px solid #5e5e5e',
                  bottom: '-15px',
                }}
              />
            </Box>
          </Grid>

          {/* Filter Buttons */}
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
            {filters.map((filter) => (
              <Button
                key={filter.value}
                onClick={() => handleFilterChange(filter.value)}
                sx={{
                  fontSize: '18px',
                  border: '1px solid #ff1955',
                  borderRadius: '5px',
                  textAlign: 'center',
                  color: selectedFilter === filter.value ? '#ffffff' : '#ff1955',
                  backgroundColor: selectedFilter === filter.value ? '#ff1955' : '#ffffff',
                  fontFamily: 'Raleway, sans-serif',
                  textTransform: 'none',
                  px: 3,
                  py: 1,
                  transition: 'all 0.3s',
                  '&:hover': {
                    color: '#ffffff',
                    backgroundColor: '#ff1955',
                    borderColor: '#ff1955',
                  },
                }}
              >
                {filter.label}
              </Button>
            ))}
          </Grid>

          {/* Gallery Grid */}
          <Grid item xs={12}>
            <Grid container spacing={3}>
              {filteredItems.map((item) => (
                <Fade key={item.id} in={true} timeout={1000}>
                  <Grid item xs={6} sm={6} md={4} lg={4}>
                    <Box
                      sx={{
                        marginBottom: '30px',
                      }}
                    >
                      <Box
                        component="img"
                        src={item.imageUrl}
                        alt={`Gallery item ${item.id}`}
                        sx={{
                          width: '100%',
                          height: 'auto',
                          display: 'block',
                          borderRadius: 1,
                        }}
                      />
                    </Box>
                  </Grid>
                </Fade>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Container>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          backgroundColor: 'transparent',
          color: '#fff',
          py: 3,
          px: 2,
          mt: 4,
          textAlign: 'center',
          fontFamily: 'Raleway, sans-serif',
        }}
      >
        <Typography variant="body2">
          © 2025 Tickets.lk - All Rights Reserved
        </Typography>
      </Box>
    </Box>
  );
};

export default Gallery;
