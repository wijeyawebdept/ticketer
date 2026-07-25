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
          pt: { xs: 12, md: 14 },
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
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <LocalOffer sx={{ color: '#00c853', fontSize: 40 }} />
            <Typography
              variant="h1"
              sx={{
                fontFamily: 'Raleway, sans-serif',
                fontWeight: 900,
                color: '#fff',
                fontSize: isMobile ? '36px' : '56px',
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
              color: 'rgba(255,255,255,0.6)',
              fontWeight: 400,
              ml: 7,
              mb: 2,
            }}
          >
            Exclusive discounts on selected event tickets — book before they're gone!
          </Typography>
          {/* Green underline accent */}
          <Box
            sx={{
              ml: 7,
              width: 80,
              height: 4,
              borderRadius: 2,
              background: 'linear-gradient(90deg, #00c853, #69f0ae)',
            }}
          />
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
            <CircularProgress sx={{ color: '#00c853' }} size={56} />
          </Box>
        ) : eventIds.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 12 }}>
            <LocalOffer sx={{ fontSize: 72, color: 'rgba(255,255,255,0.15)', mb: 3 }} />
            <Typography
              variant="h5"
              sx={{ fontFamily: 'Raleway, sans-serif', color: 'rgba(255,255,255,0.5)', mb: 2 }}
            >
              No active deals right now
            </Typography>
            <Typography
              variant="body1"
              sx={{ fontFamily: 'Raleway, sans-serif', color: 'rgba(255,255,255,0.3)', mb: 4 }}
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
                px: 4,
                py: 1.5,
                '&:hover': { backgroundColor: 'rgba(0,200,83,0.1)', borderColor: '#00e676' },
              }}
            >
              Browse All Events
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {eventIds.map((eventId) => {
              const categoryDeals = eventGroups[eventId];
              const firstDeal = categoryDeals[0];
              const lowestOriginal = firstDeal.eventMinPrice ?? Math.min(...categoryDeals.map((d) => d.originalPrice));

              return (
                <Grid item xs={12} sm={6} md={4} key={eventId}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: '#fff',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                      '&:hover': {
                        transform: 'translateY(-6px)',
                        boxShadow: '0 16px 40px rgba(0,200,83,0.25)',
                      },
                    }}
                    onClick={() => navigate(`/event/${firstDeal.eventSlug || eventId}`)}
                  >
                    {/* Badge Row */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        zIndex: 2,
                        display: 'flex',
                        gap: 0.75,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Chip
                        icon={<LocalOffer sx={{ fontSize: '14px !important' }} />}
                        label="Deal"
                        size="small"
                        sx={{
                          backgroundColor: '#00c853',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          height: 26,
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
                              fontSize: '0.7rem',
                              height: 26,
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
                              fontSize: '0.7rem',
                              height: 26,
                            }}
                          />
                        )
                      )}
                    </Box>

                    {/* Event Image */}
                    <CardMedia
                      component="img"
                      height="210"
                      image={
                        firstDeal.eventImageUrl
                          ? getAssetUrl(firstDeal.eventImageUrl)
                          : '/images/default-event.jpg'
                      }
                      alt={firstDeal.eventName}
                      sx={{ objectFit: 'cover' }}
                    />

                    <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2.5 }}>
                      {/* Event Name */}
                      <Typography
                        variant="h6"
                        sx={{
                          fontFamily: 'Raleway, sans-serif',
                          fontWeight: 700,
                          color: '#1a2035',
                          mb: 1.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          minHeight: '52px',
                          lineHeight: 1.3,
                        }}
                      >
                        {firstDeal.eventName}
                      </Typography>

                      {/* Venue */}
                      {firstDeal.venueName && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <LocationOn sx={{ fontSize: 15, color: '#ff1955', mr: 0.75 }} />
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: 'Raleway, sans-serif',
                              color: '#555',
                              fontSize: '0.8rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {firstDeal.venueName}
                          </Typography>
                        </Box>
                      )}

                      {/* Ticket Category Deals */}
                      <Box
                        sx={{
                          mt: 1,
                          mb: 2,
                          p: 1.5,
                          backgroundColor: '#f8fffe',
                          borderRadius: 2,
                          border: '1px solid rgba(0,200,83,0.2)',
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#00c853',
                            fontWeight: 700,
                            fontFamily: 'Raleway, sans-serif',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            display: 'block',
                            mb: 1,
                          }}
                        >
                          {categoryDeals.length} Deal{categoryDeals.length > 1 ? 's' : ''} Available
                        </Typography>
                        {categoryDeals.map((d) => (
                          <Box
                            key={d.categoryId}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              py: 0.5,
                              borderBottom: '1px solid rgba(0,0,0,0.05)',
                              '&:last-child': { borderBottom: 'none', pb: 0 },
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontFamily: 'Raleway, sans-serif', color: '#333', fontWeight: 600, fontSize: '0.8rem' }}
                            >
                              {d.categoryName}
                            </Typography>
                            {d.dealType === 'BUY_X_GET_Y_FREE' ? (
                              <Box sx={{ textAlign: 'right' }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontFamily: 'Raleway, sans-serif',
                                    color: '#ff1955',
                                    fontWeight: 800,
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  Buy {d.dealBuyQuantity} Get {d.dealFreeQuantity} Free
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontFamily: 'Raleway, sans-serif',
                                    color: '#999',
                                    display: 'block',
                                    fontSize: '0.7rem',
                                  }}
                                >
                                  {formatPrice(d.originalPrice)} each
                                </Typography>
                              </Box>
                            ) : (
                              <Box sx={{ textAlign: 'right' }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontFamily: 'Raleway, sans-serif',
                                    color: '#999',
                                    textDecoration: 'line-through',
                                    display: 'block',
                                    fontSize: '0.7rem',
                                  }}
                                >
                                  {formatPrice(d.originalPrice)}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontFamily: 'Raleway, sans-serif',
                                    color: '#ff1955',
                                    fontWeight: 800,
                                    fontSize: '0.9rem',
                                  }}
                                >
                                  {formatPrice(d.discountedPrice)}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        ))}
                      </Box>

                      {/* Starting From */}
                      <Box sx={{ mt: 'auto', borderTop: '1px solid rgba(0,0,0,0.08)', pt: 1.5 }}>
                        <Typography
                          variant="caption"
                          sx={{ color: '#999', fontFamily: 'Raleway, sans-serif', display: 'block', mb: 0.25 }}
                        >
                          Starting from
                        </Typography>
                        <Typography
                          variant="h6"
                          sx={{
                            fontFamily: 'Raleway, sans-serif',
                            fontWeight: 800,
                            color: '#ff1955',
                            fontSize: '1.1rem',
                            mb: 1.5,
                          }}
                        >
                          {formatPrice(lowestOriginal)}{' '}
                          <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#999' }}>upwards</span>
                        </Typography>

                        <Button
                          fullWidth
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
                            borderRadius: '8px',
                            py: 1.25,
                            fontSize: '0.9rem',
                            boxShadow: 'none',
                            '&:hover': { backgroundColor: '#e01545', boxShadow: '0 4px 12px rgba(255,25,85,0.4)' },
                          }}
                        >
                          Book Now • {categoryDeals.length}+ Deal{categoryDeals.length > 1 ? 's' : ''}
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
