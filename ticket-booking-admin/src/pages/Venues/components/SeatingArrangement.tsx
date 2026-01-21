import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  ButtonGroup,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Snackbar
} from '@mui/material';
import { 
  ZoomIn, 
  ZoomOut, 
  CenterFocusStrong, 
  Close,
  Lock,
  LockOpen,
  Block,
  CheckCircle,
  Schedule,
  Cancel,
  EventSeat,
  Info
} from '@mui/icons-material';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { UserRole } from '../../../types';

interface VenueSeat {
  seatId: string;
  section: string;
  rowLabel: string;
  seatNumber: number;
  categoryId: number;
  categoryName: string;
  colorCode: string;
  xposition: number;
  yposition: number;
  notes?: string | null;
  status?: string;
  currentPrice?: number;
}

const SeatingArrangement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const eventScheduleId = searchParams.get('eventScheduleId');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seats, setSeats] = useState<VenueSeat[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Zoom and Pan state
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [isBalconyHovered, setIsBalconyHovered] = useState(false);
  
  // Balcony dialog state
  const [balconyDialogOpen, setBalconyDialogOpen] = useState(false);
  const [selectedTicketCount, setSelectedTicketCount] = useState<number | null>(null);
  
  // Seat management state
  const [seatActionDialog, setSeatActionDialog] = useState<{ open: boolean; seat: VenueSeat | null }>({ open: false, seat: null });
  const [selectedSeat, setSelectedSeat] = useState<VenueSeat | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Check if user is admin or organizer
  const isAdminOrOrganizer = user && (
    user.role === UserRole.ADMIN || 
    user.role === UserRole.ROLE_ADMIN || 
    user.role === UserRole.ORGANIZER || 
    user.role === UserRole.ROLE_ORGANIZER || 
    user.role === UserRole.ORGANIZER_EMPLOYEE || 
    user.role === UserRole.ROLE_ORGANIZER_EMPLOYEE ||
    user.role === UserRole.SUPER_ADMIN ||
    user.role === UserRole.ROLE_SUPER_ADMIN
  );

  // Helper function to get seat status and color
  const getSeatStatusAndColor = (seat: VenueSeat) => {
    const notes = seat.notes?.toLowerCase() || '';
    const categoryName = seat.categoryName?.toLowerCase() || '';
    
    // Check actual status from backend first (for booked seats from availability API)
    if (seat.status) {
      if (seat.status === 'BOOKED') {
        return { status: 'Sold', color: '#ff5722' }; // Orange-red for sold
      }
      if (seat.status === 'LOCKED') {
        return { status: 'Locked', color: '#6c757d' }; // Gray
      }
      if (seat.status === 'VIP_RESERVED') {
        // Determine VIP tier by category
        if (categoryName.includes('platinum') || notes.includes('platinum')) {
          return { status: 'VIP Platinum', color: '#dc3545' }; // Red
        } else if (categoryName.includes('gold') || notes.includes('gold')) {
          return { status: 'VIP Gold', color: '#9c27b0' }; // Purple
        } else if (categoryName.includes('silver') || notes.includes('silver')) {
          return { status: 'VIP Silver', color: '#2196f3' }; // Blue
        }
        return { status: 'VIP Reserved', color: '#dc3545' }; // Default red
      }
      if (seat.status === 'TEMPORARY_HOLD') {
        return { status: 'On Hold', color: '#FFD700' }; // Gold
      }
    }
    
    // Fallback to checking notes (for layout-only view)
    if (notes.includes('[locked]')) {
      return { status: 'Locked', color: '#6c757d' }; // Gray
    }
    
    // Check VIP reservations by notes
    if (notes.includes('[vip]')) {
      // Determine VIP tier by category if available
      if (categoryName.includes('platinum') || seat.categoryName === 'VIP Platinum') {
        return { status: 'VIP Platinum', color: '#dc3545' }; // Red
      } else if (categoryName.includes('gold') || seat.categoryName === 'VIP Gold') {
        return { status: 'VIP Gold', color: '#9c27b0' }; // Purple
      } else if (categoryName.includes('silver') || seat.categoryName === 'VIP Silver') {
        return { status: 'VIP Silver', color: '#2196f3' }; // Blue
      }
      // Default VIP color if tier not specified
      return { status: 'VIP Reserved', color: '#dc3545' }; // Red
    }
    
    // Return original category color for available seats
    return { status: 'Available', color: seat.colorCode || '#999' };
  };

  useEffect(() => {
    fetchHardcodedSeats();
  }, []);

  const handleBalconyClick = () => {
    setBalconyDialogOpen(true);
  };

  const handleCloseBalconyDialog = () => {
    setBalconyDialogOpen(false);
    setSelectedTicketCount(null);
  };

  const handleTicketCountSelect = (count: number) => {
    setSelectedTicketCount(count);
  };

  const handleSelectTickets = () => {
    if (selectedTicketCount) {
      console.log(`Selected ${selectedTicketCount} tickets for Balcony area`);
      // Add your logic here to handle the ticket selection
      // For example: navigate to booking page, add to cart, etc.
      alert(`${selectedTicketCount} ticket(s) selected for Balcony (Standing Area)`);
      handleCloseBalconyDialog();
    }
  };

  const fetchHardcodedSeats = async () => {
    try {
      setLoading(true);
      
      // If eventScheduleId is provided, fetch seat availability with booking status
      if (eventScheduleId) {
        const response = await api.get<{
          seats: any[];
          totalSeats: number;
          availableSeats: number;
          bookedSeats: number;
          temporaryHolds: number;
        }>(`/api/venue-seats/availability/${eventScheduleId}`);
        
        // Transform availability response to match VenueSeat interface
        const availabilitySeats = response.data.seats.map((seat: any) => ({
          seatId: seat.seatId,
          section: seat.section,
          rowLabel: seat.rowLabel,
          seatNumber: seat.seatNumber,
          categoryId: 0, // Not provided in availability response
          categoryName: seat.categoryName,
          colorCode: seat.colorCode,
          xposition: parseFloat(seat.xPosition) || 0,
          yposition: parseFloat(seat.yPosition) || 0,
          notes: seat.notes,
          status: seat.status,
          currentPrice: seat.currentPrice
        }));
        
        setSeats(availabilitySeats);
        
        console.log('Loaded seats with availability:', availabilitySeats.length);
        console.log('Booked seats:', availabilitySeats.filter((s: VenueSeat) => s.status === 'BOOKED').length);
        console.log('Locked seats:', availabilitySeats.filter((s: VenueSeat) => s.status === 'LOCKED').length);
        console.log('VIP Reserved seats:', availabilitySeats.filter((s: VenueSeat) => s.status === 'VIP_RESERVED').length);
        
        // Extract unique categories from availability response
        const uniqueCategories = Array.from(
          new Set(availabilitySeats.map((seat: VenueSeat) => seat.categoryName))
        ).map(name => {
          const seat = availabilitySeats.find((s: VenueSeat) => s.categoryName === name);
          return {
            name: seat?.categoryName,
            color: seat?.colorCode
          };
        });
        
        setCategories(uniqueCategories);
      } else {
        // Otherwise, fetch hardcoded venue seats layout
        const response = await api.get<VenueSeat[]>('/api/venue-seats/layout');
        setSeats(response.data);
        
        console.log('Loaded seats:', response.data.length);
        console.log('Sample seats:', response.data.slice(0, 5));
        
        // Extract unique categories from layout response
        const uniqueCategories = Array.from(
          new Set(response.data.map((seat: VenueSeat) => seat.categoryName))
        ).map(name => {
          const seat = response.data.find((s: VenueSeat) => s.categoryName === name);
          return {
            name: seat?.categoryName,
            color: seat?.colorCode
          };
        });
        
        setCategories(uniqueCategories);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching seats:', err);
      setError('Failed to load venue seating layout');
    } finally {
      setLoading(false);
    }
  };

  // Zoom and Pan handlers
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleResetView = () => {
    setScale(1);
    setPanX(0);
    setPanY(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start dragging if clicking on an interactive element
    const target = e.target as SVGElement;
    if (target.closest('[data-clickable]')) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Handle seat click to show action menu
  const handleSeatClick = (seat: VenueSeat, e: React.MouseEvent) => {
    if (!isAdminOrOrganizer) {
      return; // Only admin/organizer can manage seats
    }
    e.stopPropagation();
    
    // In multi-select mode, toggle selection instead of opening dialog
    if (multiSelectMode) {
      toggleSeatSelection(seat.seatId);
      return;
    }
    
    setSelectedSeat(seat);
    setSeatActionDialog({ open: true, seat });
  };

  // Toggle seat selection in multi-select mode
  const toggleSeatSelection = (seatId: string) => {
    setSelectedSeats(prev => {
      if (prev.includes(seatId)) {
        return prev.filter(id => id !== seatId);
      } else {
        return [...prev, seatId];
      }
    });
  };

  // Close seat action dialog
  const closeSeatActionDialog = () => {
    setSeatActionDialog({ open: false, seat: null });
    setSelectedSeat(null);
  };

  // Lock seat (make unavailable)
  const lockSeat = async (seat: VenueSeat) => {
    try {
      await api.put(`/api/venue-seats/${seat.seatId}/lock`);
      setSuccess(`Seat ${seat.section}-${seat.rowLabel}${seat.seatNumber} locked successfully`);
      await fetchHardcodedSeats();
      closeSeatActionDialog();
    } catch (err: any) {
      console.error('Error locking seat:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to lock seat. This feature requires backend API implementation.';
      setActionError(errorMsg);
    }
  };

  // Unlock seat (make available)
  const unlockSeat = async (seat: VenueSeat) => {
    try {
      await api.put(`/api/venue-seats/${seat.seatId}/unlock`);
      setSuccess(`Seat ${seat.section}-${seat.rowLabel}${seat.seatNumber} unlocked successfully`);
      await fetchHardcodedSeats();
      closeSeatActionDialog();
    } catch (err: any) {
      console.error('Error unlocking seat:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to unlock seat. This feature requires backend API implementation.';
      setActionError(errorMsg);
    }
  };

  // Mark as accessible
  const markAccessible = async (seat: VenueSeat) => {
    try {
      await api.put(`/api/venue-seats/${seat.seatId}/accessible`, { isAccessible: true });
      setSuccess(`Seat ${seat.section}-${seat.rowLabel}${seat.seatNumber} marked as accessible`);
      await fetchHardcodedSeats();
      closeSeatActionDialog();
    } catch (err: any) {
      console.error('Error marking seat accessible:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to mark seat as accessible. This feature requires backend API implementation.';
      setActionError(errorMsg);
    }
  };

  // Reserve seat for VIP
  const reserveForVIP = async (seat: VenueSeat) => {
    try {
      await api.put(`/api/venue-seats/${seat.seatId}/reserve-vip`);
      setSuccess(`Seat ${seat.section}-${seat.rowLabel}${seat.seatNumber} reserved for VIP`);
      await fetchHardcodedSeats();
      closeSeatActionDialog();
    } catch (err: any) {
      console.error('Error reserving seat:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to reserve seat for VIP. This feature requires backend API implementation.';
      setActionError(errorMsg);
    }
  };

  // Get available actions for a seat
  const getSeatActions = (seat: VenueSeat) => {
    const actions: Array<{ label: string; action: string; icon: React.ReactNode; color?: string }> = [];

    // Select Multiple option (first in list)
    actions.push({ label: 'Select Multiple Seats', action: 'select-multiple', icon: <EventSeat />, color: 'primary' });

    // All roles can view seat info
    actions.push({ label: 'View Seat Details', action: 'view-details', icon: <Info />, color: 'info' });

    // Lock/Unlock
    actions.push({ label: 'Lock Seat', action: 'lock', icon: <Lock />, color: 'error' });
    actions.push({ label: 'Unlock Seat', action: 'unlock', icon: <LockOpen />, color: 'success' });

    // Reserve for VIP
    actions.push({ label: 'Reserve for VIP', action: 'reserve-vip', icon: <CheckCircle />, color: 'secondary' });

    // Mark as accessible
    actions.push({ label: 'Mark as Accessible', action: 'mark-accessible', icon: <EventSeat />, color: 'primary' });

    return actions;
  };

  // Handle seat action from dialog
  const handleSeatAction = async (action: string, seat: VenueSeat) => {
    switch (action) {
      case 'select-multiple':
        // Enter multi-select mode and select this seat
        setMultiSelectMode(true);
        setSelectedSeats([seat.seatId]);
        closeSeatActionDialog();
        setSuccess('Multi-select mode enabled. Click seats to select them, then use batch actions.');
        break;
      case 'lock':
        await lockSeat(seat);
        break;
      case 'unlock':
        await unlockSeat(seat);
        break;
      case 'reserve-vip':
        await reserveForVIP(seat);
        break;
      case 'mark-accessible':
        await markAccessible(seat);
        break;
      case 'view-details':
        // Just keep the dialog open to show details
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // Calculate SVG dimensions based on seat positions
  const getViewBox = () => {
    if (seats.length === 0) return "0 0 1200 800";
    
    const xPositions = seats.map(s => Number(s.xposition) || 0).filter(x => x > 0);
    const yPositions = seats.map(s => Number(s.yposition) || 0).filter(y => y > 0);
    
    if (xPositions.length === 0 || yPositions.length === 0) {
      console.error('No valid seat positions found!');
      return "0 0 1200 800";
    }
    
    const minX = Math.min(...xPositions);
    const maxX = Math.max(...xPositions);
    const minY = Math.min(...yPositions);
    const maxY = Math.max(...yPositions);
    
    console.log('Seat position range:', { minX, maxX, minY, maxY });
    
    // Add padding for stage area at top and sides
    const padding = 50;
    const topPadding = 100; // Extra space for stage
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding + topPadding;
    
    return `${minX - padding} ${minY - topPadding} ${width} ${height}`;
  };

  return (
    <Box p={3}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Venue Seating Layout (Kularathna Auditorium)
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          This is the venue seating layout with <strong>{seats.length} seats</strong>. 
          {eventScheduleId ? (
            <span> Showing real-time seat availability for this event including customer bookings.</span>
          ) : (
            <span> This layout is used for all events at this venue.</span>
          )}
        </Alert>

        {/* Status Legend for Admin/Organizer */}
        {isAdminOrOrganizer && (
          <Box sx={{ mb: 3, p: 2, bgcolor: '#2c3e50', borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: '#fff' }}>
              Seat Status Legend:
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#dc3545', border: '2px solid #fff' }} />
                <Typography variant="body2" sx={{ color: '#fff' }}>VIP Platinum</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#9c27b0', border: '2px solid #fff' }} />
                <Typography variant="body2" sx={{ color: '#fff' }}>VIP Gold</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#2196f3', border: '2px solid #fff' }} />
                <Typography variant="body2" sx={{ color: '#fff' }}>VIP Silver</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#ff5722', border: '2px solid #fff' }} />
                <Typography variant="body2" sx={{ color: '#fff' }}>Sold</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#6c757d', border: '2px solid #fff' }} />
                <Typography variant="body2" sx={{ color: '#fff' }}>Locked</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#ffc107', border: '2px solid #fff' }} />
                <Typography variant="body2" sx={{ color: '#fff' }}>Selected</Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Category Legend (for reference) */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mr: 2 }}>
            Seat Categories:
          </Typography>
          {categories.map((cat, index) => (
            <Chip
              key={index}
              label={cat.name}
              sx={{
                backgroundColor: cat.color,
                color: '#fff',
                fontWeight: 600
              }}
            />
          ))}
        </Box>

        {/* Multi-Select Controls */}
        {multiSelectMode && (
          <Alert 
            severity="info" 
            sx={{ mb: 3 }}
            action={
              <Button 
                color="inherit" 
                size="small"
                onClick={() => {
                  setMultiSelectMode(false);
                  setSelectedSeats([]);
                }}
              >
                Exit Multi-Select
              </Button>
            }
          >
            <Typography variant="body2">
              <strong>Multi-Select Mode Active:</strong> {selectedSeats.length} seat(s) selected. Click seats to select/deselect them.
            </Typography>
            {selectedSeats.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                <Button 
                  size="small" 
                  variant="outlined" 
                  color="error"
                  onClick={() => setSelectedSeats([])}
                >
                  Clear Selection
                </Button>
              </Box>
            )}
          </Alert>
        )}

        {/* SVG Seat Map with Zoom Controls */}
        <Box sx={{ position: 'relative' }}>
          {/* Zoom Controls */}
          <Box sx={{ 
            position: 'absolute', 
            top: 16, 
            right: 16, 
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            backgroundColor: 'rgba(255,255,255,0.9)',
            borderRadius: 2,
            p: 1,
            boxShadow: 2
          }}>
            <Tooltip title="Zoom In" placement="left">
              <IconButton onClick={handleZoomIn} size="small" sx={{ bgcolor: 'white' }}>
                <ZoomIn />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom Out" placement="left">
              <IconButton onClick={handleZoomOut} size="small" sx={{ bgcolor: 'white' }}>
                <ZoomOut />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset View" placement="left">
              <IconButton onClick={handleResetView} size="small" sx={{ bgcolor: 'white' }}>
                <CenterFocusStrong />
              </IconButton>
            </Tooltip>
            <Typography variant="caption" sx={{ textAlign: 'center', px: 1, fontWeight: 600 }}>
              {Math.round(scale * 100)}%
            </Typography>
          </Box>

          <Box 
            ref={svgContainerRef}
            sx={{ 
              border: '2px solid #ddd', 
              borderRadius: 2, 
              overflow: 'hidden', 
              backgroundColor: '#ffffff',
              cursor: isDragging ? 'grabbing' : 'grab',
              height: '700px',
              position: 'relative'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <Box
              sx={{
                transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              {seats.length > 0 ? (
                <svg
                  width="100%"
                  height="700"
                  viewBox={getViewBox()}
                  preserveAspectRatio="xMidYMid meet"
                  style={{ display: 'block', pointerEvents: isDragging ? 'none' : 'auto' }}
                >
                  {/* Stage area at top center */}
                  <rect x="400" y="50" width="700" height="70" fill="#d3d3d3" stroke="#666" strokeWidth="3" rx="8" />
                  <text x="750" y="95" fontSize="28" fontWeight="bold" fill="#333" textAnchor="middle">
                    STAGE
                  </text>
                  
                  {/* Render all seats as circles */}
                  {seats.map((seat) => {
                    const x = Number(seat.xposition) || 0;
                    const y = Number(seat.yposition) || 0;
                    
                    if (x === 0 || y === 0) return null; // Skip invalid positions
                    
                    const isSingleSelected = selectedSeat?.seatId === seat.seatId;
                    const isMultiSelected = selectedSeats.includes(seat.seatId);
                    
                    // Get status-based color for admin/organizer view
                    const { status, color } = isAdminOrOrganizer ? getSeatStatusAndColor(seat) : { status: 'Available', color: seat.colorCode || '#999' };
                    
                    // Override color if seat is selected
                    const finalColor = isSingleSelected || isMultiSelected ? '#ffc107' : color; // Yellow for selected
                    
                    return (
                      <circle
                        key={seat.seatId}
                        cx={x}
                        cy={y}
                        r="6"
                        fill={finalColor}
                        stroke={isMultiSelected ? '#2196f3' : (isSingleSelected ? '#ff1955' : '#333')}
                        strokeWidth={isMultiSelected || isSingleSelected ? '3' : '1'}
                        opacity="0.9"
                        style={{ cursor: isAdminOrOrganizer ? 'pointer' : 'default' }}
                        onClick={(e) => handleSeatClick(seat, e as any)}
                        onMouseDown={(e) => {
                          if (isAdminOrOrganizer) {
                            e.stopPropagation();
                          }
                        }}
                      >
                        <title>{`${seat.section} ${seat.rowLabel}${seat.seatNumber}\n${seat.categoryName}${isAdminOrOrganizer ? `\nStatus: ${status}` : ''}${isAdminOrOrganizer ? (multiSelectMode ? '\n(Click to select)' : '\n(Click to manage)') : ''}`}</title>
                      </circle>
                    );
                  })}

                  {/* Balcony (Standing Area) at bottom center - Interactive Button */}
                  <g 
                    data-clickable="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleBalconyClick();
                    }}
                    onMouseEnter={() => setIsBalconyHovered(true)}
                    onMouseLeave={() => setIsBalconyHovered(false)}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                    style={{ 
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      pointerEvents: 'all'
                    }}
                  >
                    <rect 
                      x="350" 
                      y="580" 
                      width="800" 
                      height="90" 
                      fill={isBalconyHovered ? '#ffe4b3' : '#f5e6d3'}
                      stroke={isBalconyHovered ? '#a0825a' : '#8b7355'}
                      strokeWidth={isBalconyHovered ? '4' : '3'}
                      rx="10"
                      style={{
                        filter: isBalconyHovered ? 'drop-shadow(0px 4px 8px rgba(0,0,0,0.3))' : 'none',
                        transition: 'all 0.3s ease'
                      }}
                    />
                    <text 
                      x="750" 
                      y="610" 
                      fontSize="26" 
                      fontWeight="bold" 
                      fill="#5d4e37" 
                      textAnchor="middle"
                      style={{ pointerEvents: 'none' }}
                    >
                      BALCONY
                    </text>
                    <text 
                      x="750" 
                      y="640" 
                      fontSize="18" 
                      fontStyle="italic" 
                      fill="#6b5d4f" 
                      textAnchor="middle"
                      style={{ pointerEvents: 'none' }}
                    >
                      Shared Space - Standing Area
                    </text>
                    <text 
                      x="750" 
                      y="660" 
                      fontSize="14" 
                      fill="#7a6a57" 
                      textAnchor="middle"
                      style={{ pointerEvents: 'none' }}
                    >
                      {isBalconyHovered ? '(Click for details)' : '(No Fixed Seating)'}
                    </text>
                  </g>
                </svg>
              ) : (
                <Box sx={{ textAlign: 'center', py: 10 }}>
                  <Typography variant="h6" color="text.secondary">
                    No seats found in the layout
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {/* Statistics */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>Statistics:</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                <Typography variant="h4" color="primary">{seats.length}</Typography>
                <Typography variant="body2" color="text.secondary">Total Seats</Typography>
              </Paper>
            </Grid>
            {categories.map((cat, index) => {
              const count = seats.filter(s => s.categoryName === cat.name).length;
              return (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Paper sx={{ 
                    p: 2, 
                    textAlign: 'center', 
                    bgcolor: cat.color,
                    color: '#fff'
                  }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{count}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>{cat.name}</Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </Paper>
      {/* Seat Action Dialog */}
      <Dialog open={seatActionDialog.open} onClose={closeSeatActionDialog} maxWidth="xs" fullWidth>
        <DialogTitle>
          {seatActionDialog.seat && (
            <Box>
              <Typography variant="h6">
                Seat {seatActionDialog.seat.section} - Row {seatActionDialog.seat.rowLabel} - {seatActionDialog.seat.seatNumber}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {seatActionDialog.seat.categoryName}
              </Typography>
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          {seatActionDialog.seat && (
            <List>
              {getSeatActions(seatActionDialog.seat).length > 0 ? (
                getSeatActions(seatActionDialog.seat).map((actionItem, index) => (
                  <React.Fragment key={actionItem.action}>
                    <ListItem disablePadding>
                      <ListItemButton onClick={() => handleSeatAction(actionItem.action, seatActionDialog.seat!)}>
                        <ListItemIcon sx={{ color: actionItem.color ? `${actionItem.color}.main` : 'inherit' }}>
                          {actionItem.icon}
                        </ListItemIcon>
                        <ListItemText primary={actionItem.label} />
                      </ListItemButton>
                    </ListItem>
                    {index < getSeatActions(seatActionDialog.seat!).length - 1 && <Divider />}
                  </React.Fragment>
                ))
              ) : (
                <ListItem>
                  <ListItemText 
                    primary="No actions available" 
                    secondary="No management actions available for this seat"
                  />
                </ListItem>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSeatActionDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Messages */}
      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!actionError}
        autoHideDuration={5000}
        onClose={() => setActionError(null)}
      >
        <Alert severity="error" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      </Snackbar>
      {/* Balcony Ticket Selection Dialog */}
      <Dialog 
        open={balconyDialogOpen} 
        onClose={handleCloseBalconyDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 2
          }
        }}
      >
        <DialogTitle sx={{ position: 'relative', pb: 1 }}>
          <IconButton
            onClick={handleCloseBalconyDialog}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'grey.500'
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ textAlign: 'center', pt: 1 }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            This section is a <strong>*Shared Space*</strong> and does not have any allocated seats.
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
            How many tickets do you want?
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', mb: 4 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
              <Button
                key={count}
                variant={selectedTicketCount === count ? 'contained' : 'outlined'}
                onClick={() => handleTicketCountSelect(count)}
                sx={{
                  minWidth: '60px',
                  height: '50px',
                  fontSize: '18px',
                  fontWeight: 600,
                  borderRadius: 2,
                  border: selectedTicketCount === count ? 'none' : '2px solid #ddd',
                  '&:hover': {
                    backgroundColor: selectedTicketCount === count ? 'primary.dark' : 'grey.100'
                  }
                }}
              >
                {count}
              </Button>
            ))}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              fullWidth
              disabled={!selectedTicketCount}
              onClick={handleSelectTickets}
              sx={{
                py: 1.5,
                fontSize: '16px',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2,
                backgroundColor: '#6B8CFF',
                '&:hover': {
                  backgroundColor: '#5a7ae6'
                }
              }}
            >
              Select tickets
            </Button>
          </Box>
          
          <Button
            onClick={handleCloseBalconyDialog}
            sx={{
              mt: 2,
              color: 'text.secondary',
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SeatingArrangement;