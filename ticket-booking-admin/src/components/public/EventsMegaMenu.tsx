import React, { useState, useEffect } from 'react';
import {
  Box,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { EventCategory, Event } from '../../types';
import eventService from '../../services/event.service';
import { format } from 'date-fns';
import { getAssetUrl } from '../../utils/formatters';
import { useCurrency } from '../../context/CurrencyContext';

interface EventsMegaMenuProps {
  anchorEl: HTMLElement | null;
  isOpen: boolean;
  onClose: () => void;
  categories: EventCategory[];
  onMouseEnter?: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLElement>) => void;
}

const EventsMegaMenu: React.FC<EventsMegaMenuProps> = ({
  anchorEl,
  isOpen,
  onClose,
  categories,
  onMouseEnter,
  onMouseLeave,
}) => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [eventsCache, setEventsCache] = useState<Record<string, Event[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // When menu opens, or categories load, set the first category as active by default
  useEffect(() => {
    if (isOpen && !activeCategoryId && categories.length > 0) {
      setActiveCategoryId('all');
    }
  }, [isOpen, categories, activeCategoryId]);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!activeCategoryId || !isOpen) return;
      
      // If we already have the events cached, don't fetch again
      if (eventsCache[activeCategoryId]) {
        return;
      }

      setIsLoading(true);
      try {
        let fetchedEvents = [];
        if (activeCategoryId === 'all') {
          const res = await eventService.getUpcomingPublishedEvents(0, 6);
          fetchedEvents = res.content || [];
        } else {
          const res = await eventService.getPublishedEvents(0, 6, activeCategoryId);
          fetchedEvents = res.content || [];
        }
        
        setEventsCache((prev) => ({
          ...prev,
          [activeCategoryId]: fetchedEvents,
        }));
      } catch (error) {
        console.error('Failed to fetch events for category', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [activeCategoryId, isOpen, eventsCache]);

  const handleCategoryHover = (categoryId: string) => {
    setActiveCategoryId(categoryId);
  };

  const handleCategoryClick = (categoryId: string) => {
    if (categoryId === 'all') {
      navigate('/events');
    } else {
      navigate(`/events?category=${categoryId}`);
    }
    onClose();
  };

  const handleEventClick = (eventId: string) => {
    navigate(`/event/${eventId}`);
    onClose();
  };

  const displayedEvents = activeCategoryId ? eventsCache[activeCategoryId] || [] : [];

  return (
    <Popover
      open={isOpen}
      anchorEl={anchorEl}
      onClose={onClose}
      disableRestoreFocus
      sx={{ pointerEvents: 'none' }}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      slotProps={{
        paper: {
          onMouseEnter: onMouseEnter,
          onMouseLeave: onMouseLeave,
          sx: {
            pointerEvents: 'auto',
            mt: 1.5,
            display: 'flex',
            width: '780px',
            minHeight: '400px',
            maxHeight: '550px',
            overflow: 'hidden',
            backgroundColor: '#1b222c',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)',
            borderRadius: '16px',
          },
        }
      }}
    >
      {/* Left Column: Categories Sidebar */}
      <Box
        sx={{
          width: '240px',
          bgcolor: '#151a22',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          overflowY: 'auto',
          py: 2,
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px' },
        }}
      >
        <List disablePadding>
          <ListItem
            button
            onClick={() => handleCategoryClick('all')}
            onMouseEnter={() => handleCategoryHover('all')}
            sx={{
              bgcolor: activeCategoryId === 'all' ? 'rgba(255, 25, 85, 0.12)' : 'transparent',
              borderRight: activeCategoryId === 'all' ? '3px solid #ff1955' : '3px solid transparent',
              mb: 0.5,
              py: 1.2,
              px: 2.5,
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: activeCategoryId === 'all' ? 'rgba(255, 25, 85, 0.16)' : 'rgba(255, 255, 255, 0.05)',
              },
            }}
          >
            <ListItemText
              primary="All Events"
              sx={{
                '& .MuiTypography-root': {
                  fontFamily: 'Raleway, sans-serif',
                  fontWeight: activeCategoryId === 'all' ? 700 : 600,
                  color: activeCategoryId === 'all' ? '#ff1955' : 'rgba(255, 255, 255, 0.85)',
                  fontSize: '0.95rem',
                },
              }}
            />
          </ListItem>
          
          <Divider sx={{ mb: 1, my: 1, mx: 2, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

          {categories.map((category) => (
            <ListItem
              button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              onMouseEnter={() => handleCategoryHover(category.id)}
              sx={{
                bgcolor: activeCategoryId === category.id ? 'rgba(255, 25, 85, 0.12)' : 'transparent',
                borderRight: activeCategoryId === category.id ? '3px solid #ff1955' : '3px solid transparent',
                py: 1,
                px: 2.5,
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: activeCategoryId === category.id ? 'rgba(255, 25, 85, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                },
              }}
            >
              <ListItemText
                primary={category.categoryName}
                sx={{
                  '& .MuiTypography-root': {
                    fontFamily: 'Raleway, sans-serif',
                    fontWeight: activeCategoryId === category.id ? 700 : 500,
                    color: activeCategoryId === category.id ? '#ff1955' : 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.92rem',
                  },
                }}
              />
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Right Column: Events Grid */}
      <Box sx={{ flex: 1, p: 3, bgcolor: '#1b222c', overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 800,
              color: '#fff',
              fontSize: '1.1rem',
              letterSpacing: '0.5px',
            }}
          >
            {activeCategoryId === 'all'
              ? 'Most Popular Events'
              : categories.find((c) => c.id === activeCategoryId)?.categoryName || 'Events'}
          </Typography>
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <CircularProgress sx={{ color: '#ff1955' }} />
          </Box>
        ) : displayedEvents.length === 0 ? (
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'Raleway, sans-serif', py: 4, textAlign: 'center' }}>
            No events found for this category.
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {displayedEvents.map((event) => (
              <Grid item xs={12} sm={6} key={event.id}>
                <Card
                  onClick={() => handleEventClick(event.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    boxShadow: 'none',
                    bgcolor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    p: 1,
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      bgcolor: 'rgba(255, 25, 85, 0.08)',
                      borderColor: 'rgba(255, 25, 85, 0.35)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <CardMedia
                    component="img"
                    sx={{ width: 64, height: 64, objectFit: 'cover', borderRadius: '8px' }}
                    image={getAssetUrl(event.imageUrl) || '/images/default-event.jpg'}
                    alt={event.name}
                  />
                  <CardContent sx={{ flex: 1, p: '8px 12px !important' }}>
                    <Typography
                      variant="subtitle2"
                      noWrap
                      sx={{
                        fontFamily: 'Raleway, sans-serif',
                        fontWeight: 700,
                        color: '#fff',
                        mb: 0.5,
                        fontSize: '0.85rem',
                      }}
                    >
                      {event.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.78rem', color: '#fcd0a5' }}
                    >
                      {event.startDateTime ? format(new Date(event.startDateTime), 'EEE dd MMM') : 'TBA'} 
                      {event.basePrice ? ` • ${formatCurrency(event.basePrice)}` : ''}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Popover>
  );
};

export default EventsMegaMenu;
