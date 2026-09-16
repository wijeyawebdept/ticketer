import React, { useState, useEffect, useMemo } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Event as EventIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as PriceIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { EventService } from '../services';
import { Event, EventStatus } from '../types';

interface EventDropdownProps {
  value?: Event | null;
  onChange: (event: Event | null) => void;
  placeholder?: string;
  disabled?: boolean;
  showRefreshButton?: boolean;
  filterByStatus?: EventStatus[];
  excludeEventIds?: string[];
  onRefresh?: () => void;
  error?: string;
  helperText?: string;
}

const EventDropdown: React.FC<EventDropdownProps> = ({
  value,
  onChange,
  placeholder = "Search and select an event...",
  disabled = false,
  showRefreshButton = true,
  filterByStatus,
  excludeEventIds = [],
  onRefresh,
  error,
  helperText
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [open, setOpen] = useState<boolean>(false);

  // Fetch events from the API
  const fetchEvents = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      const response: any = await EventService.getAllEvents();
      
      // Handle Page response from backend
      let eventsData: any[] = [];
      if (response && response.content) {
        eventsData = response.content;
      } else if (Array.isArray(response)) {
        eventsData = response;
      } else {
        eventsData = [];
      }
      
      setEvents(eventsData);
    } catch (error) {
      setErrorMessage('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchEvents();
  }, []);

  // Filter events based on props
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Filter by status
    if (filterByStatus && filterByStatus.length > 0) {
      filtered = filtered.filter(event => filterByStatus.includes(event.status));
    }

    // Exclude specific event IDs
    if (excludeEventIds.length > 0) {
      filtered = filtered.filter(event => !excludeEventIds.includes(event.id));
    }

    return filtered;
  }, [events, filterByStatus, excludeEventIds]);

  // Handle refresh
  const handleRefresh = async () => {
    await fetchEvents(true);
    if (onRefresh) {
      onRefresh();
    }
  };

  // Get status chip color
  const getStatusChipColor = (status: EventStatus) => {
    switch (status) {
      case EventStatus.PUBLISHED:
        return 'success';
      case EventStatus.DRAFT:
        return 'warning';
      case EventStatus.CANCELLED:
        return 'error';
      case EventStatus.COMPLETED:
        return 'info';
      default:
        return 'default';
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Format price for display
  const formatPrice = (price: number) => {
    return `LKR ${price.toLocaleString()}`;
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Autocomplete
        value={value || null}
        onChange={(_, newValue) => onChange(newValue)}
        options={filteredEvents}
        getOptionLabel={(option) => option.name || ''}
        isOptionEqualToValue={(option, val) => !!option && !!val && option.id === val.id}
        loading={loading}
        disabled={disabled}
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        filterOptions={(options, { inputValue }) => {
          const filtered = options.filter(option =>
            option.name.toLowerCase().includes(inputValue.toLowerCase()) ||
            (option.venue && option.venue.name.toLowerCase().includes(inputValue.toLowerCase())) ||
            (option.description && option.description.toLowerCase().includes(inputValue.toLowerCase()))
          );
          return filtered;
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder}
            error={!!error}
            helperText={error || helperText}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                  <SearchIcon color="action" />
                  {showRefreshButton && (
                    <Tooltip title="Refresh events">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRefresh();
                        }}
                        disabled={refreshing}
                        sx={{ ml: 0.5 }}
                      >
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              ),
              endAdornment: (
                <>
                  {loading && <CircularProgress color="inherit" size={20} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => {
          const { key, ...otherProps } = props;
          return (
            <Box
              key={key}
              {...otherProps}
              component="li"
              sx={{
                borderRadius: 1.5,
                mb: 0.75,
                p: 1.5,
                display: 'flex',
                alignItems: 'flex-start',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                transition: 'all 0.15s ease-in-out',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.06) !important',
                  borderColor: '#93c5fd',
                },
                '&[aria-selected="true"]': {
                  backgroundColor: 'rgba(25, 118, 210, 0.12) !important',
                  borderColor: '#3b82f6',
                },
              }}
            >
              <EventIcon color="primary" sx={{ mr: 1.5, flexShrink: 0, mt: 0.5 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {option.name}
                  </Typography>
                  <Chip
                    label={option.status}
                    color={getStatusChipColor(option.status)}
                    size="small"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                  {option.venue && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationIcon sx={{ fontSize: 15, color: '#64748b' }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        {option.venue.name}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarIcon sx={{ fontSize: 15, color: '#64748b' }} />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(option.startDateTime)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PriceIcon sx={{ fontSize: 15, color: '#64748b' }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, color: '#0f766e' }}>
                      {option.ticketCategories && option.ticketCategories.length > 0
                        ? (() => {
                            const currentPrices = option.ticketCategories.filter(tc => !tc.isSharedArea).map(tc => {
                              const originalPrice = Number(tc.price) || 0;
                              const discount = Number(tc.dealDiscountPercentage) || 0;
                              return (tc.dealActive && discount > 0)
                                ? originalPrice * (1 - discount / 100)
                                : originalPrice;
                            });
                            return currentPrices.length > 0 
                              ? `From ${formatPrice(Math.min(...currentPrices))}`
                              : option.basePrice !== undefined ? formatPrice(option.basePrice) : 'Price TBA';
                          })()
                        : option.basePrice !== undefined ? formatPrice(option.basePrice) : 'Price TBA'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          );
        }}
        componentsProps={{
          paper: {
            elevation: 6,
            sx: {
              borderRadius: 2,
              mt: 1,
              border: '1px solid #e2e8f0',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            }
          }
        }}
        ListboxProps={{
          sx: {
            maxHeight: '380px',
            overflowY: 'auto',
            p: 1,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f5f9',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#cbd5e1',
              borderRadius: '4px',
              '&:hover': {
                background: '#94a3b8',
              },
            },
          }
        }}
        noOptionsText={
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No events found. Try adjusting your search criteria.
            </Typography>
          </Box>
        }
      />

      {/* Error Alert */}
      {errorMessage && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {errorMessage}
        </Alert>
      )}

      {/* Loading indicator for refresh */}
      {refreshing && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Refreshing events...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default EventDropdown;
