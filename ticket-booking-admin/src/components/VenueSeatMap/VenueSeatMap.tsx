import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, Button, Box, Typography, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import axiosInstance from '../../services/api';
import { useAuth } from '../../context/AuthContext';
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

// Shared area ticket category from database
interface SharedAreaCategory {
  categoryId: string;
  categoryName: string;
  price: number;
  capacity: number;
  sharedAreaNumber: number;
  availableTickets: number;
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
  // Shared area data from venue and ticket categories
  sharedAreas?: SharedAreaCategory[];
}

interface VenueSeatMapProps {
  eventScheduleId: string | number;
  venueId?: string;
  onSeatSelect?: (selectedSeats: string[]) => void;
  onSharedAreaSelect?: (areaNumber: number, count: number, price: number, categoryName: string) => void;
  maxSelection?: number;
  selectedSeats?: string[];
  bookedSeats?: string[];
}

export const VenueSeatMap: React.FC<VenueSeatMapProps> = ({
  eventScheduleId,
  venueId,
  onSeatSelect,
  onSharedAreaSelect,
  maxSelection = 10,
  selectedSeats = [],
  bookedSeats = [],
}) => {
  const { isRestrictedUser } = useAuth();
  const [venueSeats, setVenueSeats] = useState<VenueSeatData[]>([]);
  const [seatStatuses, setSeatStatuses] = useState<Map<string, SeatStatus>>(new Map());
  const [localSelectedSeats, setLocalSelectedSeats] = useState<Set<string>>(new Set(selectedSeats));
  const [hoveredSeat, setHoveredSeat] = useState<VenueSeatData | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const [showSharedAreaDialog, setShowSharedAreaDialog] = useState(false);
  const [selectedSharedArea, setSelectedSharedArea] = useState<SharedAreaCategory | null>(null);
  const [sharedAreaTicketCount, setSharedAreaTicketCount] = useState<number | null>(null);
  const [sharedAreas, setSharedAreas] = useState<SharedAreaCategory[]>([]);
  const [totalOccupiedSeats, setTotalOccupiedSeats] = useState(0);
  const [customerFacingTotal, setCustomerFacingTotal] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const isPanning = useRef(false);
  const lastPanPosition = useRef({ x: 0, y: 0 });
  const animationFrameId = useRef<number | null>(null);
  
  // Check if venue has shared areas from database
  const hasSharedAreas = sharedAreas.length > 0;

  // Debug: Log venue ID changes
  useEffect(() => {
  }, [venueId, hasSharedAreas, sharedAreas]);

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
      
      if (validSeats.length === 0 && data.seats.length > 0) {
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

      // Permanently excluded seats (admin-locked / not-for-sale) — never counted in totals
      const permanentlyExcludedStatuses = ['LOCKED', 'NOT_FOR_SALE'];

      // Total seats available to customers (excludes permanently locked/not-for-sale)
      const customerFacing = data.seats.filter(
        (seat: any) => !permanentlyExcludedStatuses.includes(seat.status)
      ).length;
      setCustomerFacingTotal(customerFacing);

      // Occupied = truly reserved seats only (booked, temporarily held, VIP reserved)
      const occupiedStatuses = ['BOOKED', 'TEMPORARY_HOLD', 'VIP_RESERVED'];
      const occupied = data.seats.filter((seat: any) => occupiedStatuses.includes(seat.status)).length;
      setTotalOccupiedSeats(occupied);
      
      // Store shared areas if available from API response
      if (data.sharedAreas && data.sharedAreas.length > 0) {
        setSharedAreas(data.sharedAreas);
      }
    } catch (error) {
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

    // Selected by the current user
    if (localSelectedSeats.has(seat.seatId)) return '#FF0000';

    // Status-based colours – same for everyone
    if (status) {
      switch (status.status) {
        case 'BOOKED':
        case 'VIP_RESERVED':
          return '#FF0000'; // Red – sold
        case 'LOCKED':
          // Nelum Pokuna Outdoor Arena: locked seats invisible to customers
          if (venueId === 'f2ca9b05-b1c6-4cf5-9083-1194543d5898' && !isRestrictedUser())
            return 'transparent';
          return '#6c757d'; // Grey – locked
        case 'TEMPORARY_HOLD':
          return '#FFD700'; // Yellow – temporarily held
        case 'NOT_FOR_SALE':
          return 'transparent'; // Hidden
      }
    }

    // Available seats: admin/organizer = category colour, customers = white
    if (isRestrictedUser()) return seat.colorCode || '#4CAF50';
    return '#FFFFFF';
  }, [seatStatuses, localSelectedSeats, venueId, isRestrictedUser]);

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

  const handleSharedAreaClick = (area: SharedAreaCategory) => {
    setSelectedSharedArea(area);
    setShowSharedAreaDialog(true);
  };

  const handleSharedAreaDialogClose = () => {
    setShowSharedAreaDialog(false);
    setSelectedSharedArea(null);
    setSharedAreaTicketCount(null);
  };

  const handleSharedAreaTicketSelect = (count: number) => {
    setSharedAreaTicketCount(count);
  };

  const handleSharedAreaConfirm = () => {
    if (sharedAreaTicketCount && selectedSharedArea) {
      onSharedAreaSelect?.(
        selectedSharedArea.sharedAreaNumber,
        sharedAreaTicketCount, 
        selectedSharedArea.price,
        selectedSharedArea.categoryName
      );
      handleSharedAreaDialogClose();
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
              Selected: {totalOccupiedSeats} / {customerFacingTotal || venueSeats.length}
            </span>
          </div>

          {/* Legend */}
          <div className="venue-legend">
            {isRestrictedUser() ? (
              // Admin / Organizer – seat category colours + status indicators
              <>
                {Array.from(new Set(venueSeats.map(s => s.categoryName))).map((categoryName, index) => {
                  const seat = venueSeats.find(s => s.categoryName === categoryName);
                  return (
                    <div key={`cat-${index}`} className="legend-item">
                      <span className="legend-color" style={{ backgroundColor: seat?.colorCode || '#4CAF50' }} />
                      <span>{categoryName}</span>
                    </div>
                  );
                })}
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#FF0000' }} />
                  <span>Sold / Selected</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#6c757d' }} />
                  <span>Locked</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#FFD700' }} />
                  <span>Temporarily Hold</span>
                </div>
              </>
            ) : (
              // Customer – simplified status legend
              <>
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(255,255,255,0.4)' }} />
                  <span>Available</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#FF0000' }} />
                  <span>Sold / Selected</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#6c757d' }} />
                  <span>Locked</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#FFD700' }} />
                  <span>Temporarily Hold</span>
                </div>
              </>
            )}
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
          {/* Stage - Calculated based on seat alignment */}
          {venueSeats.length > 0 && (() => {
            // Calculate stage bounds from seats
            const xPositions = venueSeats.map(s => s.xPosition).filter(x => !isNaN(x));
            const minX = Math.min(...xPositions);
            const maxX = Math.max(...xPositions);
            const centerX = (minX + maxX) / 2;
            const stageWidth = (maxX - minX) * 1.05; // 5% padding on each side
            const stageX = centerX - (stageWidth / 2);
            const stageY = 30;
            const stageHeight = 80;
            
            return (
              <>
                <rect
                  x={stageX}
                  y={stageY}
                  width={stageWidth}
                  height={stageHeight}
                  fill="#d3d3d3"
                  stroke="#666"
                  strokeWidth="3"
                  rx="8"
                />
                <text
                  x={centerX}
                  y={stageY + stageHeight - 18}
                  textAnchor="middle"
                  fontSize="28"
                  fontWeight="bold"
                  fill="#333"
                >
                  STAGE
                </text>
              </>
            );
          })()}

          {/* Seats - Render from database */}
          <g id="seats-container">
            {venueSeats.map((seat: VenueSeatData) => {
              const status = seatStatuses.get(seat.seatId);
              const isUnavailable = status && ['BOOKED', 'LOCKED', 'NOT_FOR_SALE', 'TEMPORARY_HOLD', 'VIP_RESERVED'].includes(status.status);
              // For Nelum Pokuna Outdoor Arena: locked seats are invisible to customers — disable all interaction
              const isHiddenLockedSeat =
                status?.status === 'LOCKED' &&
                venueId === 'f2ca9b05-b1c6-4cf5-9083-1194543d5898' &&
                !isRestrictedUser();
              
              return (
                <circle
                  key={seat.seatId}
                  data-seat-id={seat.seatId}
                  cx={seat.xPosition}
                  cy={seat.yPosition}
                  r="6"
                  fill={getSeatColor(seat)}
                  stroke={
                    localSelectedSeats.has(seat.seatId)
                      ? '#cc0000'
                      : (!isRestrictedUser() && (!seatStatuses.get(seat.seatId) || seatStatuses.get(seat.seatId)?.status === 'AVAILABLE')
                          ? 'rgba(255,255,255,0.35)'
                          : 'none')
                  }
                  strokeWidth="1.5"
                  className="seat-circle"
                  style={{ 
                    cursor: isHiddenLockedSeat ? 'default' : isUnavailable ? 'not-allowed' : 'pointer',
                    pointerEvents: isPanning.current || isHiddenLockedSeat ? 'none' : 'auto'
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                />
              );
            })}
          </g>

          {/* Dynamic Shared/Standing Areas - Rendered from database */}
          {hasSharedAreas && sharedAreas.map((area, index) => {
            // Calculate position for each shared area
            const xPositions = venueSeats.map(s => s.xPosition).filter(x => !isNaN(x));
            const minX = xPositions.length > 0 ? Math.min(...xPositions) : 200;
            const maxX = xPositions.length > 0 ? Math.max(...xPositions) : 1600;
            const yPositions = venueSeats.map(s => s.yPosition).filter(y => !isNaN(y));
            const maxY = yPositions.length > 0 ? Math.max(...yPositions) : 500;
            
            // Calculate area dimensions based on number of shared areas
            const totalWidth = maxX - minX;
            const areaWidth = sharedAreas.length > 1 
              ? (totalWidth - (sharedAreas.length - 1) * 20) / sharedAreas.length 
              : totalWidth * 0.5;
            const areaX = sharedAreas.length > 1 
              ? minX + index * (areaWidth + 20)
              : minX + totalWidth * 0.25;
            const areaY = maxY + 60;
            const areaHeight = 80;
            
            // Color palette for different areas
            const areaColors = ['#FFE082', '#B3E5FC', '#C8E6C9', '#F8BBD9', '#D1C4E9'];
            const borderColors = ['#FFA000', '#0288D1', '#388E3C', '#C2185B', '#7B1FA2'];
            const textColors = ['#FF6F00', '#01579B', '#1B5E20', '#880E4F', '#4A148C'];
            
            return (
              <g key={`shared-area-${area.sharedAreaNumber}`}>
                <rect
                  x={areaX}
                  y={areaY}
                  width={areaWidth}
                  height={areaHeight}
                  fill={areaColors[index % areaColors.length]}
                  fillOpacity="0.4"
                  stroke={borderColors[index % borderColors.length]}
                  strokeWidth="3"
                  className="shared-area"
                  style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSharedAreaClick(area);
                  }}
                />
                <text
                  x={areaX + areaWidth / 2}
                  y={areaY + areaHeight / 2 - 10}
                  textAnchor="middle"
                  fontSize="18"
                  fontWeight="bold"
                  fill={textColors[index % textColors.length]}
                  style={{ cursor: 'pointer', pointerEvents: 'none' }}
                >
                  {area.categoryName}
                </text>
                <text
                  x={areaX + areaWidth / 2}
                  y={areaY + areaHeight / 2 + 12}
                  textAnchor="middle"
                  fontSize="14"
                  fill={textColors[index % textColors.length]}
                  style={{ cursor: 'pointer', pointerEvents: 'none' }}
                >
                  LKR {area.price.toLocaleString()} • {area.availableTickets} available
                </text>
              </g>
            );
          })}



        </svg>
      </div>

      {/* Hover tooltip - hide locked seat details from customers */}
      {hoveredSeat && (() => {
        const hoveredStatus = seatStatuses.get(hoveredSeat.seatId)?.status;
        // Customers and unauthenticated users should not see details of locked seats
        if (hoveredStatus === 'LOCKED' && !isRestrictedUser()) return null;
        return (
          <div className="seat-tooltip">
            <strong>{hoveredSeat.seatId}</strong>
            <div>Section: {hoveredSeat.section}</div>
            <div>Row: {hoveredSeat.rowLabel}, Seat: {hoveredSeat.seatNumber}</div>
            <div>Category: {hoveredSeat.categoryName}</div>
            {seatStatuses.get(hoveredSeat.seatId)?.currentPrice && (
              <div>Price: Rs.{seatStatuses.get(hoveredSeat.seatId)?.currentPrice.toLocaleString()}</div>
            )}
            <div>Status: {hoveredStatus || 'AVAILABLE'}</div>
          </div>
        );
      })()}

      {/* Dynamic Shared Area Dialog */}
      <Dialog 
        open={showSharedAreaDialog && selectedSharedArea !== null} 
        onClose={handleSharedAreaDialogClose}
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
            onClick={handleSharedAreaDialogClose}
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
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            {selectedSharedArea?.categoryName || 'Standing Area'}
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
            This section is a <strong>*Shared Space*</strong> and does not have any allocated seats.
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
            Price per ticket: <strong>LKR {selectedSharedArea?.price.toLocaleString()}</strong>
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            Available: <strong>{selectedSharedArea?.availableTickets}</strong> tickets
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
            How many tickets do you want?
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', mb: 4 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(count => count <= (selectedSharedArea?.availableTickets || 10)).map((count) => (
              <Button
                key={count}
                variant={sharedAreaTicketCount === count ? 'contained' : 'outlined'}
                onClick={() => handleSharedAreaTicketSelect(count)}
                sx={{
                  minWidth: '60px',
                  height: '50px',
                  fontSize: '18px',
                  fontWeight: 600,
                  borderRadius: 2,
                  border: sharedAreaTicketCount === count ? 'none' : '2px solid #ddd',
                  '&:hover': {
                    backgroundColor: sharedAreaTicketCount === count ? 'primary.dark' : 'grey.100'
                  }
                }}
              >
                {count}
              </Button>
            ))}
          </Box>
          
          {sharedAreaTicketCount && selectedSharedArea && (
            <Typography variant="h6" sx={{ mb: 3, color: 'primary.main' }}>
              Total: LKR {(sharedAreaTicketCount * selectedSharedArea.price).toLocaleString()}
            </Typography>
          )}
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              fullWidth
              disabled={!sharedAreaTicketCount}
              onClick={handleSharedAreaConfirm}
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
            onClick={handleSharedAreaDialogClose}
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
