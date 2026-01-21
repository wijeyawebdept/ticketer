import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
  status: 'AVAILABLE' | 'BOOKED' | 'TEMPORARY_HOLD' | 'LOCKED' | 'NOT_FOR_SALE' | 'SELECTED';
  currentPrice: number;
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
    status: 'AVAILABLE' | 'BOOKED' | 'TEMPORARY_HOLD' | 'LOCKED' | 'NOT_FOR_SALE';
    currentPrice: number;
  }[];
  totalSeats: number;
  availableSeats: number;
  bookedSeats: number;
  temporaryHolds: number;
}

interface VenueSeatMapProps {
  eventScheduleId: string | number;
  onSeatSelect?: (selectedSeats: string[]) => void;
  maxSelection?: number;
  selectedSeats?: string[];
  bookedSeats?: string[];
}

export const VenueSeatMap: React.FC<VenueSeatMapProps> = ({
  eventScheduleId,
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
  const [showBalconyDialog, setShowBalconyDialog] = useState(false);
  const [balconyTicketCount, setBalconyTicketCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const isPanning = useRef(false);
  const lastPanPosition = useRef({ x: 0, y: 0 });
  const animationFrameId = useRef<number | null>(null);

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
    
    // Don't allow selection of booked/locked/held seats
    if (status && ['BOOKED', 'LOCKED', 'NOT_FOR_SALE', 'TEMPORARY_HOLD'].includes(status.status)) {
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
          return '#000000'; // Black for locked
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
    // Don't start panning if clicking on balcony or seats
    const target = e.target as SVGElement;
    if (target.closest('.balcony-area') || target.tagName === 'circle') {
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

  const handleBalconyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowBalconyDialog(true);
  };

  const handleBalconyTicketSelect = () => {
    // Handle balcony ticket selection - you can integrate this with your booking system
    // TODO: Add logic to handle balcony ticket booking
    setShowBalconyDialog(false);
    setBalconyTicketCount(1);
  };

  const handleBalconyDialogClose = () => {
    setShowBalconyDialog(false);
    setBalconyTicketCount(1);
  };

  return (
    <div className="venue-seat-map-container">
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          Loading venue layout...
        </div>
      )}
      
      {!loading && (
        <>
          {/* Controls */}
          <div className="venue-controls">
            <button onClick={handleZoomIn} className="control-btn">🔍+</button>
            <button onClick={handleZoomOut} className="control-btn">🔍-</button>
            <button onClick={handleResetView} className="control-btn">↺ Reset</button>
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
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#f5e6d3' }} />
              <span>Balcony (Standing)</span>
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
            x="600"
            y="30"
            width="600"
            height="70"
            fill="#D3D3D3"
            stroke="#999"
            strokeWidth="2"
            rx="5"
          />
          <text
            x="900"
            y="75"
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

          {/* Balcony (Standing Area) at bottom center */}
          <g 
            className="balcony-area"
            onClick={handleBalconyClick}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ cursor: 'pointer' }}
          >
            <rect 
              x="400" 
              y="750" 
              width="1000" 
              height="110" 
              fill="#f5e6d3" 
              stroke="#8b7355" 
              strokeWidth="3" 
              rx="10"
              onClick={handleBalconyClick}
              style={{ cursor: 'pointer' }}
            />
            <text x="900" y="790" fontSize="30" fontWeight="bold" fill="#5d4e37" textAnchor="middle" style={{ pointerEvents: 'none' }}>
              BALCONY
            </text>
            <text x="900" y="825" fontSize="20" fontStyle="italic" fill="#6b5d4f" textAnchor="middle" style={{ pointerEvents: 'none' }}>
              Shared Space - Standing Area
            </text>
            <text x="900" y="850" fontSize="16" fill="#7a6a57" textAnchor="middle" style={{ pointerEvents: 'none' }}>
              (No Fixed Seating)
            </text>
          </g>

        </svg>
      </div>

      {/* Balcony Ticket Selection Dialog */}
      {showBalconyDialog && (
        <div className="balcony-dialog-overlay" onClick={handleBalconyDialogClose}>
          <div className="balcony-dialog" onClick={(e) => e.stopPropagation()}>
            <button className="dialog-close-btn" onClick={handleBalconyDialogClose}>×</button>
            <h3>This section is a *Shared Space* and does not have any allocated seats.</h3>
            <p className="dialog-question">How many tickets do you want?</p>
            <div className="ticket-number-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <button
                  key={num}
                  className={`ticket-number-btn ${balconyTicketCount === num ? 'selected' : ''}`}
                  onClick={() => setBalconyTicketCount(num)}
                >
                  {num}
                </button>
              ))}
            </div>
            <button className="dialog-select-btn" onClick={handleBalconyTicketSelect}>
              Select tickets
            </button>
            <button className="dialog-cancel-btn" onClick={handleBalconyDialogClose}>
              Cancel
            </button>
          </div>
        </div>
      )}

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
        </>
      )}
    </div>
  );
};

export default VenueSeatMap;
