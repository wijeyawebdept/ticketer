import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Button,
  Fade,
  CircularProgress,
  Alert,
} from '@mui/material';
import PublicNavbar from '../../../components/public/PublicNavbar';
import GalleryService, { GalleryImage } from '../../../services/GalleryService';

const Gallery: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [galleryItems, setGalleryItems] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const items = await GalleryService.getPublicGallery();
        setGalleryItems(items);
      } catch (error) {
        console.error('Failed to load gallery', error);
        setFetchError('Failed to load gallery images.');
      } finally {
        setLoading(false);
      }
    };
    fetchGallery();
  }, []);

  // Extract unique categories from items
  const uniqueCategories = Array.from(new Set(galleryItems.map((item) => item.category)));
  const filters = ['All', ...uniqueCategories];

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
  };

  const filteredItems =
    selectedFilter === 'All'
      ? galleryItems
      : galleryItems.filter((item) => item.category === selectedFilter);

  return (
    <Box
      sx={{
        backgroundImage: 'url(/images/mt-0390-tickets-bg.jpg)',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'top center',
        backgroundSize: 'cover',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <PublicNavbar />

      <Container maxWidth="lg" sx={{ py: 4, flexGrow: 1 }}>
        <Grid container sx={{ mt: 4 }}>
          {/* Page Title */}
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

          {loading ? (
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', my: 10 }}>
              <CircularProgress color="primary" />
            </Grid>
          ) : fetchError ? (
            <Grid item xs={12} sx={{ mt: 4 }}>
              <Alert severity="error">{fetchError}</Alert>
            </Grid>
          ) : (
            <>
              {/* Filter Buttons */}
              <Grid
                item xs={12}
                sx={{ display: 'flex', justifyContent: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}
              >
                {filters.map((filter) => (
                  <Button
                    key={filter}
                    onClick={() => handleFilterChange(filter)}
                    sx={{
                      fontSize: '18px',
                      border: '1px solid #ff1955',
                      borderRadius: '5px',
                      textAlign: 'center',
                      color: selectedFilter === filter ? '#ffffff' : '#ff1955',
                      backgroundColor: selectedFilter === filter ? '#ff1955' : 'transparent',
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
                    {filter}
                  </Button>
                ))}
              </Grid>

              {/* Gallery Grid */}
              <Grid item xs={12}>
                <Grid container spacing={4}>
                  {filteredItems.map((item) => (
                    <Grid key={item.galleryId} item xs={12} sm={6} md={4}>
                      <Fade in={true} timeout={1000}>
                        <div>
                          <Box
                            component="img"
                            src={item.imageBase64 || ''}
                            alt={item.title || 'Gallery photo'}
                            sx={{
                              width: '100%',
                              height: '250px',
                              objectFit: 'cover',
                              display: 'block',
                              borderRadius: 2,
                              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                            }}
                          />
                          {(item.title || item.description) && (
                            <Box sx={{ mt: 2, px: 1 }}>
                              {item.title && (
                                <Typography
                                  variant="h6"
                                  sx={{
                                    color: '#ffffff',
                                    fontFamily: 'Raleway, sans-serif',
                                    fontWeight: 700,
                                    fontSize: '1.1rem',
                                    mb: 0.5,
                                  }}
                                >
                                  {item.title}
                                </Typography>
                              )}
                              {item.description && (
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    fontFamily: 'Raleway, sans-serif',
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {item.description}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </div>
                      </Fade>
                    </Grid>
                  ))}

                  {filteredItems.length === 0 && (
                    <Grid item xs={12}>
                      <Typography
                        sx={{
                          color: '#fff', textAlign: 'center', py: 5,
                          fontFamily: 'Raleway, sans-serif',
                        }}
                      >
                        No photos available in this category.
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Grid>
            </>
          )}
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
          mt: 'auto',
          textAlign: 'center',
          fontFamily: 'Raleway, sans-serif',
        }}
      >
        <Typography variant="body2">
          © 2026 Ticketer.lk - All Rights Reserved
        </Typography>
      </Box>
    </Box>
  );
};

export default Gallery;
