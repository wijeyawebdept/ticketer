import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle, Button, Box, Typography, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import axiosInstance from '../../services/api';
import './VenueSeatMap.css';

interface VenueSeatData {
  seatId: string;
  section: string;
  rowLabel: string;
  seatNumber: number;
  categoryName: string;
  colorCode: string;
  xPosition: number;
  yPosition: number;
  isAisleSeat: boolean;
  isAccessible: boolean;
}

interface SeatStatus {
  seatId: string;
  status: 'AVAILABLE' | 'BOOKED' | 'TEMPORARY_HOLD' | 'LOCKED' | 'NOT_FOR_SALE' | 'SELECTED' | 'VIP_RESERVED';
  currentPrice: number;
  notes?: string;
}

interface SeatAvailabilityResponse {
  seats: {
    seatId: string;
    section: string;
    rowLabel: string;
    seatNumber: number;
    categoryName: string;
    colorCode: string;
    xPosition: number;
    yPosition: number;
    isAisleSeat: boolean;
    isAccessible: boolean;
    status: 'AVAILABLE' | 'BOOKED' | 'TEMPORARY_HOLD' | 'LOCKED' | 'NOT_FOR_SALE' | 'VIP_RESERVED';
    currentPrice: number;
    notes?: string;
  }[];
  totalSeats: number;
  availableSeats: number;
  bookedSeats: number;
  temporaryHolds: number;
}

interface VenueSeatMapProps {
  eventScheduleId: string | number;
  venueId?: string;
  onSeatSelect?: (selectedSeats: string[]) => void;
  maxSelection?: number;
  selectedSeats?: string[];
  bookedSeats?: string[];
}

export const VenueSeatMap: React.FC<VenueSeatMapProps> = ({
  eventScheduleId,
  venueId,
  onSeatSelect,
  maxSelection = 10,
  selectedSeats = [],
  bookedSeats = [],
}) => {
  const [venueSeats, setVenueSeats] = useState<VenueSeatData[]>([]);
  const [seatStatuses, setSeatStatuses] = useState<Map<string, SeatStatus>>(new Map());
  const [localSelectedSeats, setLocalSelectedSeats] = useState<Set<string>>(new Set(selectedSeats));
  const [hoveredSeat, setHoveredSeat] = useState<VenueSeatData | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const [showBalconyDialog, setShowBalconyDialog] = useState(false);
  const [balconyTicketCount, setBalconyTicketCount] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isPanning = useRef(false);
  const lastPanPosition = useRef({ x: 0, y: 0 });
  const animationFrameId = useRef<number | null>(null);
  
  // Kularathna Stadium venue ID
  const KULARATHNA_STADIUM_ID = '54fd37e5-5a1c-4834-af83-ad9c8bf1f300';
  const shouldShowBalcony = venueId === KULARATHNA_STADIUM_ID;

  // Debug: Log venue ID changes
  useEffect(() => {
    console.log('VenueSeatMap received venueId:', venueId);
    console.log('Kularathna Stadium ID:', KULARATHNA_STADIUM_ID);
    console.log('Should show balcony:', shouldShowBalcony);
  }, [venueId, shouldShowBalcony]);

  // Fetch seat availability from backend
  useEffect(() => {
    fetchSeatAvailability();
  }, [eventScheduleId]);

  // Sync localSelectedSeats with selectedSeats prop when it changes externally
  useEffect(() => {
    setLocalSelectedSeats(new Set(selectedSeats));
  }, [selectedSeats]);

  const fetchSeatAvailability = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get<SeatAvailabilityResponse>(`/api/venue-seats/availability/${eventScheduleId}`);
      const data = response.data;
      
      // Debug: Log the first seat to see the actual data structure
      if (data.seats && data.seats.length > 0) {
        console.log('First seat data:', data.seats[0]);
        console.log('xPosition type:', typeof data.seats[0].xPosition);
        console.log('yPosition type:', typeof data.seats[0].yPosition);
      }
      
      // Store venue seats with coordinates
      const seats: VenueSeatData[] = data.seats.map((seat: any) => {
        const xPos = seat.xPosition ? parseFloat(String(seat.xPosition)) : 0;
        const yPos = seat.yPosition ? parseFloat(String(seat.yPosition)) : 0;
        
        return {
          seatId: seat.seatId,
          section: seat.section,
          rowLabel: seat.rowLabel,
          seatNumber: seat.seatNumber,
          categoryName: seat.categoryName || seat.category,
          colorCode: seat.colorCode,
          xPosition: xPos,
          yPosition: yPos,
          isAisleSeat: seat.isAisleSeat || false,
          isAccessible: seat.isAccessible || false,
        };
      });
      
      // Filter out any seats with invalid coordinates
      const validSeats = seats.filter(s => !isNaN(s.xPosition) && !isNaN(s.yPosition));
      
      console.log('Total seats from API:', data.seats.length);
      console.log('Valid seats after filtering:', validSeats.length);
      if (validSeats.length === 0 && data.seats.length > 0) {
        console.error('All seats filtered out! Sample seat:', seats[0]);
      }
      
      setVenueSeats(validSeats);
      
      // Store seat statuses
      const statusMap = new Map<string, SeatStatus>();
      data.seats.forEach((seat: any) => {
        statusMap.set(seat.seatId, {
          seatId: seat.seatId,
          status: seat.status,
          currentPrice: seat.currentPrice,
          notes: seat.notes,
        });
      });
      
      setSeatStatuses(statusMap);
    } catch (error) {
      console.error('Failed to fetch seat availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeatClick = (seat: VenueSeatData, e?: React.MouseEvent) => {
    // Stop event propagation to prevent panning
    if (e) {
      e.stopPropagation();
    }
    
    const status = seatStatuses.get(seat.seatId);
    
    // Don't allow selection of booked/locked/held/VIP reserved seats
    if (status && ['BOOKED', 'LOCKED', 'NOT_FOR_SALE', 'TEMPORARY_HOLD', 'VIP_RESERVED'].includes(status.status)) {
      return;
    }

    const newSelected = new Set(localSelectedSeats);
    
    if (newSelected.has(seat.seatId)) {
      newSelected.delete(seat.seatId);
    } else {
      if (newSelected.size >= maxSelection) {
        alert(`You can only select up to ${maxSelection} seats`);
        return;
      }
      newSelected.add(seat.seatId);
    }
    
    setLocalSelectedSeats(newSelected);
    onSeatSelect?.(Array.from(newSelected));
  };

  // Pan handlers - Define handleMouseMove first since handleSVGMouseMove depends on it
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    
    // Throttle with requestAnimationFrame for smooth performance
    if (animationFrameId.current) return;
    
    animationFrameId.current = requestAnimationFrame(() => {
      const deltaX = e.clientX - lastPanPosition.current.x;
      const deltaY = e.clientY - lastPanPosition.current.y;
      
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));
      
      lastPanPosition.current = { x: e.clientX, y: e.clientY };
      animationFrameId.current = null;
    });
  }, []);

  // Handle seat interactions through event delegation
  const handleSVGClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning.current) return;
    
    const target = e.target as SVGElement;
    if (target.tagName === 'circle' && target.hasAttribute('data-seat-id')) {
      const seatId = target.getAttribute('data-seat-id');
      const seat = venueSeats.find(s => s.seatId === seatId);
      if (seat) {
        handleSeatClick(seat, e);
      }
    }
  }, [venueSeats, handleSeatClick]);

  const handleSVGMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning.current) {
      handleMouseMove(e);
      setHoveredSeat(null);
      return;
    }

    const target = e.target as SVGElement;
    if (target.tagName === 'circle' && target.hasAttribute('data-seat-id')) {
      const seatId = target.getAttribute('data-seat-id');
      const seat = venueSeats.find(s => s.seatId === seatId);
      setHoveredSeat(seat || null);
    } else {
      setHoveredSeat(null);
    }
  }, [venueSeats, handleMouseMove]);

  const getSeatColor = useCallback((seat: VenueSeatData): string => {
    const status = seatStatuses.get(seat.seatId);
    
    // Selected seats
    if (localSelectedSeats.has(seat.seatId)) {
      return '#FFA500'; // Orange for selected
    }
    
    // Status-based colors
    if (status) {
      switch (status.status) {
        case 'BOOKED':
          return '#FF4444'; // Red for sold
        case 'LOCKED':
          return '#6c757d'; // Gray for locked
        case 'VIP_RESERVED':
          // Determine VIP tier by category name and notes
          const notes = status.notes?.toLowerCase() || '';
          const categoryName = seat.categoryName?.toLowerCase() || '';
          
          if (categoryName.includes('platinum') || notes.includes('platinum')) {
            return '#dc3545'; // Red for VIP Platinum
          } else if (categoryName.includes('gold') || notes.includes('gold')) {
            return '#9c27b0'; // Purple for VIP Gold
          } else if (categoryName.includes('silver') || notes.includes('silver')) {
            return '#2196f3'; // Blue for VIP Silver
          }
          // Default VIP color
          return '#dc3545'; // Red
        case 'TEMPORARY_HOLD':
          return '#FFD700'; // Gold for temporary hold
        case 'NOT_FOR_SALE':
          return '#E0E0E0'; // Light gray for not for sale
      }
    }
    
    // Use color code from database (category-based colors)
    return seat.colorCode || '#4CAF50';
  }, [seatStatuses, localSelectedSeats]);

  const getSeatCursor = useCallback((seat: VenueSeatData): string => {
    const status = seatStatuses.get(seat.seatId);
    
    if (status && ['BOOKED', 'LOCKED', 'NOT_FOR_SALE', 'TEMPORARY_HOLD'].includes(status.status)) {
      return 'not-allowed';
    }
    
    return 'pointer';
  }, [seatStatuses]);

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start panning if clicking on seats
    const target = e.target as SVGElement;
    if (target.tagName === 'circle') {
      return;
    }
    isPanning.current = true;
    lastPanPosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  }, []);

  const handleBalconyClick = () => {
    console.log('Balcony clicked!');
    setShowBalconyDialog(true);
  };

  const handleBalconyDialogClose = () => {
    setShowBalconyDialog(false);
    setBalconyTicketCount(null);
  };

  const handleBalconyTicketSelect = (count: number) => {
    setBalconyTicketCount(count);
  };

  const handleBalconyConfirm = () => {
    if (balconyTicketCount) {
      console.log(`Selected ${balconyTicketCount} tickets for Balcony area`);
      alert(`${balconyTicketCount} ticket(s) selected for Balcony (Standing Area)`);
      handleBalconyDialogClose();
    }
  };

  return (
    <div className="venue-seat-map-container">
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          Loading venue layout... is sucks
        </div>
      )}
      
      {!loading && (
        <>
          {/* Controls */}
          <div className="venue-controls">
            <button onClick={handleZoomIn} className="control-btn">+</button>
            <button onClick={handleZoomOut} className="control-btn">-</button>
            <button onClick={handleResetView} className="control-btn">Reset</button>
            <span className="selected-count">
              Selected: {localSelectedSeats.size} / {venueSeats.length}
            </span>
          </div>

          {/* Legend - Dynamic from database */}
          <div className="venue-legend">
            {/* Get unique categories from venue seats */}
            {Array.from(new Set(venueSeats.map(s => s.categoryName))).map((categoryName, index) => {
              const seat = venueSeats.find(s => s.categoryName === categoryName);
              return (
                <div key={`category-${index}-${categoryName}`} className="legend-item">
                  <span 
                    className="legend-color" 
                    style={{ backgroundColor: seat?.colorCode || '#4CAF50' }}
                  />
                  <span>{categoryName}</span>
                </div>
              );
            })}
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#FF4444' }} />
              <span>Sold</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#000000' }} />
              <span>Locked</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#FFA500' }} />
              <span>Selected</span>
            </div>
          </div>

      {/* SVG Seat Map */}
      <div 
        className="venue-svg-container"
      >
        <svg
          ref={svgRef}
          viewBox="0 0 1800 900"
          className="venue-svg"
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
            pointerEvents: 'auto',
            willChange: 'transform',
            transition: isPanning.current ? 'none' : 'transform 0.1s ease-out',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleSVGMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleSVGClick}
        >
          {/* Stage */}
          <rect
            x="400"
            y="50"
            width="700"
            height="70"
            fill="#d3d3d3"
            stroke="#666"
            strokeWidth="3"
            rx="8"
          />
          <text
            x="750"
            y="95"
            textAnchor="middle"
            fontSize="28"
            fontWeight="bold"
            fill="#333"
          >
            STAGE
          </text>

          {/* Seats - Render from database */}
          <g id="seats-container">
            {venueSeats.map((seat: VenueSeatData) => (
              <circle
                key={seat.seatId}
                data-seat-id={seat.seatId}
                cx={seat.xPosition}
                cy={seat.yPosition}
                r="6"
                fill={getSeatColor(seat)}
                stroke={localSelectedSeats.has(seat.seatId) ? '#000' : 'none'}
                strokeWidth="2"
                className="seat-circle"
                style={{ 
                  cursor: getSeatCursor(seat),
                  pointerEvents: isPanning.current ? 'none' : 'auto'
                }}
              />
            ))}
          </g>

          {/* Balcony - Only for Kularathna Stadium */}
          {shouldShowBalcony && (
            <>
              <rect
                x="350"
                y="580"
                width="900"
                height="80"
                fill="#FFE082"
                fillOpacity="0.4"
                stroke="#FFA000"
                strokeWidth="3"
                className="balcony-area"
                style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleBalconyClick();
                }}
              />
              <text
                x="800"
                y="630"
                textAnchor="middle"
                fontSize="24"
                fontWeight="bold"
                fill="#FF6F00"
                className="balcony-label"
                style={{ cursor: 'pointer', pointerEvents: 'none' }}
              >
                BALCONY (Standing Area)
              </text>
            </>
          )}



        </svg>
      </div>

      {/* Hover tooltip */}
      {hoveredSeat && (
        <div className="seat-tooltip">
          <strong>{hoveredSeat.seatId}</strong>
          <div>Section: {hoveredSeat.section}</div>
          <div>Row: {hoveredSeat.rowLabel}, Seat: {hoveredSeat.seatNumber}</div>
          <div>Category: {hoveredSeat.categoryName}</div>
          {seatStatuses.get(hoveredSeat.seatId)?.currentPrice && (
            <div>Price: Rs.{seatStatuses.get(hoveredSeat.seatId)?.currentPrice.toLocaleString()}</div>
          )}
          <div>Status: {seatStatuses.get(hoveredSeat.seatId)?.status || 'AVAILABLE'}</div>
        </div>
      )}

      {/* Balcony Dialog - Only for Kularathna Stadium */}
      <Dialog 
        open={showBalconyDialog && shouldShowBalcony} 
        onClose={handleBalconyDialogClose}
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
            onClick={handleBalconyDialogClose}
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
                variant={balconyTicketCount === count ? 'contained' : 'outlined'}
                onClick={() => handleBalconyTicketSelect(count)}
                sx={{
                  minWidth: '60px',
                  height: '50px',
                  fontSize: '18px',
                  fontWeight: 600,
                  borderRadius: 2,
                  border: balconyTicketCount === count ? 'none' : '2px solid #ddd',
                  '&:hover': {
                    backgroundColor: balconyTicketCount === count ? 'primary.dark' : 'grey.100'
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
              disabled={!balconyTicketCount}
              onClick={handleBalconyConfirm}
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
            onClick={handleBalconyDialogClose}
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
        </>
      )}
    </div>
  );
};

export default VenueSeatMap;
