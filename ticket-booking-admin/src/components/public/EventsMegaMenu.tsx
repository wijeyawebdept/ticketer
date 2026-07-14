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
            mt: 1,
            display: 'flex',
            width: '750px',
            minHeight: '400px',
            maxHeight: '550px',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            borderRadius: '8px',
          },
        }
      }}
    >
      {/* Left Column: Categories */}
      <Box
        sx={{
          width: '250px',
          bgcolor: '#f8f9fa',
          borderRight: '1px solid #eee',
          overflowY: 'auto',
          py: 2,
        }}
      >
        <List disablePadding>
          <ListItem
            button
            onClick={() => handleCategoryClick('all')}
            onMouseEnter={() => handleCategoryHover('all')}
            sx={{
              bgcolor: activeCategoryId === 'all' ? 'rgba(255, 25, 85, 0.08)' : 'transparent',
              borderRight: activeCategoryId === 'all' ? '3px solid #ff1955' : '3px solid transparent',
              mb: 1,
            }}
          >
            <ListItemText
              primary="All Events"
              sx={{
                '& .MuiTypography-root': {
                  fontFamily: 'Raleway, sans-serif',
                  fontWeight: activeCategoryId === 'all' ? 700 : 600,
                  color: activeCategoryId === 'all' ? '#ff1955' : '#333',
                },
              }}
            />
          </ListItem>
          
          <Divider sx={{ mb: 1, mx: 2 }} />

          {categories.map((category) => (
            <ListItem
              button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              onMouseEnter={() => handleCategoryHover(category.id)}
              sx={{
                bgcolor: activeCategoryId === category.id ? 'rgba(255, 25, 85, 0.08)' : 'transparent',
                borderRight: activeCategoryId === category.id ? '3px solid #ff1955' : '3px solid transparent',
              }}
            >
              <ListItemText
                primary={category.categoryName}
                sx={{
                  '& .MuiTypography-root': {
                    fontFamily: 'Raleway, sans-serif',
                    fontWeight: activeCategoryId === category.id ? 600 : 400,
                    color: activeCategoryId === category.id ? '#ff1955' : '#555',
                    fontSize: '0.95rem',
                  },
                }}
              />
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Right Column: Events Grid */}
      <Box sx={{ flex: 1, p: 3, bgcolor: '#fff', overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography
            variant="h5"
            sx={{
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 700,
              color: '#333',
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
          <Typography sx={{ color: '#777', fontFamily: 'Raleway, sans-serif' }}>
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
                    bgcolor: 'transparent',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.02)',
                    },
                  }}
                >
                  <CardMedia
                    component="img"
                    sx={{ width: 70, height: 70, objectFit: 'cover', borderRadius: '8px' }}
                    image={event.imageUrl || 'https://via.placeholder.com/80?text=No+Image'}
                    alt={event.name}
                  />
                  <CardContent sx={{ flex: 1, p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography
                      variant="subtitle2"
                      noWrap
                      sx={{
                        fontFamily: 'Raleway, sans-serif',
                        fontWeight: 700,
                        color: '#333',
                        mb: 0.5,
                        textTransform: 'uppercase'
                      }}
                    >
                      {event.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.8rem', mb: 0.5 }}
                    >
                      {event.startDateTime ? format(new Date(event.startDateTime), 'EEE dd MMM') : 'TBA'} 
                      {event.basePrice ? ` • ${event.basePrice} LKR` : ''}
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
