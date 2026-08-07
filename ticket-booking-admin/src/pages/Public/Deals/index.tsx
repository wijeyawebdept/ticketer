import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { LocationOn, LocalOffer } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../../../components/public/PublicNavbar';
import PublicFooter from '../../../components/public/PublicFooter';
import dealService from '../../../services/deal.service';
import { getAssetUrl } from '../../../utils/formatters';
import { TicketCategoryDeal } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';

// Group deals by eventId
function groupByEvent(deals: TicketCategoryDeal[]): Record<string, TicketCategoryDeal[]> {
  return deals.reduce((acc, deal) => {
    if (!acc[deal.eventId]) acc[deal.eventId] = [];
    acc[deal.eventId].push(deal);
    return acc;
  }, {} as Record<string, TicketCategoryDeal[]>);
}

const Deals: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [deals, setDeals] = useState<TicketCategoryDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const data = await dealService.getPublicDeals();
        setDeals(data);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    fetchDeals();
  }, []);

  const formatPrice = (price: number) => formatCurrency(price);


  const eventGroups = groupByEvent(deals);
  const eventIds = Object.keys(eventGroups);

  return (
    <Box sx={{ backgroundColor: '#242a33', minHeight: '100vh' }}>
      <PublicNavbar />

      {/* Hero Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1a2035 0%, #242a33 60%, #1a2035 100%)',
          borderBottom: '1px solid rgba(0, 200, 83, 0.2)',
          pt: { xs: 10, sm: 12, md: 14 },
          pb: { xs: 4, md: 6 },
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'radial-gradient(ellipse at 50% 0%, rgba(0,200,83,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, mb: 1 }}>
            <LocalOffer sx={{ color: '#00c853', fontSize: { xs: 32, sm: 40 } }} />
            <Typography
              variant="h1"
              sx={{
                fontFamily: 'Raleway, sans-serif',
                fontWeight: 900,
                color: '#fff',
                fontSize: { xs: '28px', sm: '42px', md: '56px' },
                lineHeight: 1.1,
              }}
            >
              Deals
            </Typography>
          </Box>
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Raleway, sans-serif',
              color: 'rgba(255,255,255,0.7)',
              fontWeight: 400,
              fontSize: { xs: '0.9rem', sm: '1.1rem', md: '1.25rem' },
              ml: { xs: 0, sm: 7 },
              mb: 2,
            }}
          >
            Exclusive discounts on selected event tickets — book before they're gone!
          </Typography>
          {/* Green underline accent */}
          <Box
            sx={{
              ml: { xs: 0, sm: 7 },
              width: { xs: 60, sm: 80 },
              height: 4,
              borderRadius: 2,
              background: 'linear-gradient(90deg, #00c853, #69f0ae)',
            }}
          />
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 6 }, px: { xs: 1.5, sm: 3 } }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 8, md: 12 } }}>
            <CircularProgress sx={{ color: '#00c853' }} size={56} />
          </Box>
        ) : eventIds.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: { xs: 6, md: 10 }, px: 2 }}>
            <LocalOffer sx={{ fontSize: { xs: 56, sm: 72 }, color: 'rgba(255,255,255,0.15)', mb: 2.5 }} />
            <Typography
              variant="h5"
              sx={{
                fontFamily: 'Raleway, sans-serif',
                color: 'rgba(255,255,255,0.7)',
                fontSize: { xs: '1.2rem', sm: '1.5rem' },
                fontWeight: 700,
                mb: 1.5,
              }}
            >
              No active deals right now
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontFamily: 'Raleway, sans-serif',
                color: 'rgba(255,255,255,0.4)',
                fontSize: { xs: '0.85rem', sm: '1rem' },
                mb: 3.5,
                maxWidth: '420px',
                mx: 'auto',
              }}
            >
              Check back soon — new deals are added regularly!
            </Typography>
            <Button
              variant="outlined"
              onClick={() => navigate('/events')}
              sx={{
                color: '#00c853',
                borderColor: '#00c853',
                fontFamily: 'Raleway, sans-serif',
                fontWeight: 600,
                textTransform: 'none',
                px: { xs: 3, sm: 4 },
                py: 1.25,
                borderRadius: '12px',
                '&:hover': { backgroundColor: 'rgba(0,200,83,0.1)', borderColor: '#00e676' },
              }}
            >
              Browse All Events
            </Button>
          </Box>
        ) : (
          <Grid container spacing={{ xs: 2, sm: 3 }} justifyContent={{ xs: 'center', sm: 'flex-start' }} sx={{ pt: 1.5 }}>
            {eventIds.map((eventId) => {
              const categoryDeals = eventGroups[eventId];
              const firstDeal = categoryDeals[0];
              const lowestOriginal = firstDeal.eventMinPrice ?? Math.min(...categoryDeals.map((d) => d.originalPrice));

              return (
                <Grid item xs={12} sm={6} md={4} key={eventId} sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'stretch' } }}>
                  <Card
                    sx={{
                      height: '100%',
                      maxWidth: { xs: '260px', sm: '100%' },
                      width: '100%',
                      mx: { xs: 'auto', sm: 0 },
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: '#1b222c',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: 'none',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        borderColor: 'rgba(0, 200, 83, 0.35)',
                        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
                      },
                    }}
                    onClick={() => navigate(`/event/${firstDeal.eventSlug || eventId}`)}
                  >
                    {/* Badge Row */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        right: 8,
                        zIndex: 2,
                        display: 'flex',
                        gap: 0.5,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Chip
                        icon={<LocalOffer sx={{ fontSize: '13px !important' }} />}
                        label="Deal"
                        size="small"
                        sx={{
                          backgroundColor: '#00c853',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: '0.7rem',
                          height: 24,
                          '& .MuiChip-icon': { color: '#fff' },
                        }}
                      />
                      {categoryDeals.map((d) =>
                        d.dealLabel ? (
                          <Chip
                            key={d.categoryId}
                            label={d.dealLabel}
                            size="small"
                            sx={{
                              backgroundColor: '#1565c0',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '0.68rem',
                              height: 24,
                            }}
                          />
                        ) : (
                          <Chip
                            key={d.categoryId}
                            label={`${d.dealDiscountPercentage}% OFF`}
                            size="small"
                            sx={{
                              backgroundColor: '#ff6f00',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '0.68rem',
                              height: 24,
                            }}
                          />
                        )
                      )}
                    </Box>

                    {/* Event Image Container with Locked Height */}
                    <Box
                      sx={{
                        width: '100%',
                        height: { xs: '160px', sm: '180px', md: '220px' },
                        minHeight: { xs: '160px', sm: '180px', md: '220px' },
                        maxHeight: { xs: '160px', sm: '180px', md: '220px' },
                        overflow: 'hidden',
                        position: 'relative',
                        backgroundColor: '#0f131a',
                      }}
                    >
                      <CardMedia
                        component="img"
                        image={
                          firstDeal.eventImageUrl
                            ? getAssetUrl(firstDeal.eventImageUrl)
                            : '/images/default-event.jpg'
                        }
                        alt={firstDeal.eventName}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center center',
                        }}
                      />
                    </Box>

                    <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: { xs: 1.5, sm: 2, md: 2.5 } }}>
                      {/* Event Name */}
                      <Typography
                        variant="h6"
                        sx={{
                          fontFamily: 'Raleway, sans-serif',
                          fontWeight: 700,
                          color: '#ffffff',
                          mb: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          fontSize: { xs: '1rem', sm: '1.15rem' },
                          lineHeight: 1.25,
                        }}
                      >
                        {firstDeal.eventName}
                      </Typography>

                      {/* Venue */}
                      {firstDeal.venueName && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <LocationOn sx={{ fontSize: 13, color: '#fcd0a5', mr: 0.4 }} />
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: 'Raleway, sans-serif',
                              color: '#fcd0a5',
                              fontSize: '0.78rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {firstDeal.venueName}
                          </Typography>
                        </Box>
                      )}

                      {/* Compact Event Deal Details */}
                      <Box
                        sx={{
                          my: 1,
                          p: { xs: '6px 10px', sm: '8px 12px' },
                          backgroundColor: 'rgba(0, 200, 83, 0.08)',
                          borderRadius: '8px',
                          border: '1px solid rgba(0, 200, 83, 0.3)',
                        }}
                      >
                        {categoryDeals.map((d) => (
                          <Box
                            key={d.categoryId}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 1,
                              py: 0.2,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: 'Raleway, sans-serif',
                                color: '#00e676',
                                fontWeight: 700,
                                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {d.categoryName}
                            </Typography>
                            {d.dealType === 'BUY_X_GET_Y_FREE' ? (
                              <Typography
                                variant="body2"
                                sx={{
                                  fontFamily: 'Raleway, sans-serif',
                                  color: '#ff1955',
                                  fontWeight: 800,
                                  fontSize: { xs: '0.72rem', sm: '0.8rem' },
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                }}
                              >
                                Buy {d.dealBuyQuantity} Get {d.dealFreeQuantity} Free
                              </Typography>
                            ) : (
                              <Typography
                                variant="body2"
                                sx={{
                                  fontFamily: 'Raleway, sans-serif',
                                  color: '#ff1955',
                                  fontWeight: 800,
                                  fontSize: { xs: '0.75rem', sm: '0.85rem' },
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                }}
                              >
                                {d.dealDiscountPercentage}% OFF
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Box>

                      {/* Starting From & Book Button Row */}
                      <Box
                        sx={{
                          mt: 'auto',
                          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                          pt: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                        }}
                      >
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{ color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'Raleway, sans-serif', display: 'block', fontSize: '0.65rem', lineHeight: 1 }}
                          >
                            Starting from
                          </Typography>
                          <Typography
                            variant="h6"
                            sx={{
                              fontFamily: 'Raleway, sans-serif',
                              fontWeight: 800,
                              color: '#ff1955',
                              fontSize: { xs: '0.9rem', sm: '1.1rem' },
                              lineHeight: 1.2,
                            }}
                          >
                            {formatPrice(lowestOriginal)}
                          </Typography>
                        </Box>

                        <Button
                          variant="contained"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/event/${firstDeal.eventSlug || eventId}`);
                          }}
                          sx={{
                            backgroundColor: '#ff1955',
                            color: '#fff',
                            fontFamily: 'Raleway, sans-serif',
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: '16px',
                            py: { xs: 0.4, sm: 0.8 },
                            px: { xs: 1.5, sm: 2.5 },
                            fontSize: { xs: '0.75rem', sm: '0.9rem' },
                            boxShadow: 'none',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            minHeight: { xs: 28, sm: 36 },
                            '&:hover': { backgroundColor: '#e01545', boxShadow: '0 4px 12px rgba(255,25,85,0.4)' },
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
        )}
      </Container>

      <PublicFooter />
    </Box>
  );
};

export default Deals;
