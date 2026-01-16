import React, { useEffect, useState, useRef } from 'react';
import { VENUE_SEATING_LAYOUT, SEAT_CATEGORIES, VenueSeat } from '../../data/venueSeatingLayout';
import './VenueSeatMap.css';

interface SeatStatus {
  seatId: string;
  status: 'AVAILABLE' | 'BOOKED' | 'TEMPORARY_HOLD' | 'LOCKED' | 'NOT_FOR_SALE' | 'SELECTED';
  currentPrice: number;
}

interface VenueSeatMapProps {
  eventScheduleId: number;
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
  const [seatStatuses, setSeatStatuses] = useState<Map<string, SeatStatus>>(new Map());
  const [localSelectedSeats, setLocalSelectedSeats] = useState<Set<string>>(new Set(selectedSeats));
  const [hoveredSeat, setHoveredSeat] = useState<VenueSeat | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [showBalconyDialog, setShowBalconyDialog] = useState(false);
  const [balconyTicketCount, setBalconyTicketCount] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  const isPanning = useRef(false);
  const lastPanPosition = useRef({ x: 0, y: 0 });

  // Fetch seat availability from backend
  useEffect(() => {
    fetchSeatAvailability();
  }, [eventScheduleId]);

  const fetchSeatAvailability = async () => {
    try {
      const response = await fetch(`/api/venue-seats/availability/${eventScheduleId}`);
      const data = await response.json();
      
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
    }
  };

  const handleSeatClick = (seat: VenueSeat) => {
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

  const getSeatColor = (seat: VenueSeat): string => {
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
    
    // Category-based colors (available seats)
    return SEAT_CATEGORIES[seat.category].color;
  };

  const getSeatCursor = (seat: VenueSeat): string => {
    const status = seatStatuses.get(seat.seatId);
    
    if (status && ['BOOKED', 'LOCKED', 'NOT_FOR_SALE', 'TEMPORARY_HOLD'].includes(status.status)) {
      return 'not-allowed';
    }
    
    return 'pointer';
  };

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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return;
    
    const deltaX = e.clientX - lastPanPosition.current.x;
    const deltaY = e.clientY - lastPanPosition.current.y;
    
    setPanOffset(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }));
    
    lastPanPosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isPanning.current = false;
  };

  const handleBalconyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowBalconyDialog(true);
  };

  const handleBalconyTicketSelect = () => {
    // Handle balcony ticket selection - you can integrate this with your booking system
    console.log(`Selected ${balconyTicketCount} balcony tickets`);
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
      {/* Controls */}
      <div className="venue-controls">
        <button onClick={handleZoomIn} className="control-btn">🔍+</button>
        <button onClick={handleZoomOut} className="control-btn">🔍-</button>
        <button onClick={handleResetView} className="control-btn">↺ Reset</button>
        <span className="selected-count">
          Selected: {localSelectedSeats.size} / {maxSelection}
        </span>
      </div>

      {/* Legend */}
      <div className="venue-legend">
        {Object.entries(SEAT_CATEGORIES).map(([key, cat]) => (
          <div key={key} className="legend-item">
            <span 
              className="legend-color" 
              style={{ backgroundColor: (cat as { color: string; name: string }).color }}
            />
            <span>{(cat as { color: string; name: string }).name}</span>
          </div>
        ))}
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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Balcony Button Overlay */}
        <button 
          className="balcony-button-overlay"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Balcony clicked!');
            handleBalconyClick(e);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          title="Click to book balcony tickets"
        >
          <span className="balcony-button-text">BALCONY</span>
          <span className="balcony-button-subtext">Shared Space - Standing Area</span>
          <span className="balcony-button-info">(Click to book tickets)</span>
        </button>

        <svg
          ref={svgRef}
          viewBox="0 0 1500 700"
          className="venue-svg"
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
            pointerEvents: 'auto',
          }}
        >
          {/* Stage */}
          <rect
            x="500"
            y="20"
            width="500"
            height="60"
            fill="#D3D3D3"
            stroke="#999"
            strokeWidth="2"
            rx="5"
          />
          <text
            x="750"
            y="60"
            textAnchor="middle"
            fontSize="24"
            fontWeight="bold"
            fill="#333"
          >
            STAGE
          </text>

          {/* Seats */}
          {VENUE_SEATING_LAYOUT.map((seat: VenueSeat) => (
            <circle
              key={seat.seatId}
              cx={seat.x}
              cy={seat.y}
              r="6"
              fill={getSeatColor(seat)}
              stroke={localSelectedSeats.has(seat.seatId) ? '#000' : 'none'}
              strokeWidth="2"
              style={{ cursor: getSeatCursor(seat) }}
              onClick={() => handleSeatClick(seat)}
              onMouseEnter={() => setHoveredSeat(seat)}
              onMouseLeave={() => setHoveredSeat(null)}
            />
          ))}

          {/* Balcony (Standing Area) at bottom center */}
          <g 
            className="balcony-area"
            onClick={handleBalconyClick}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ cursor: 'pointer' }}
          >
            <rect 
              x="350" 
              y="580" 
              width="800" 
              height="90" 
              fill="#f5e6d3" 
              stroke="#8b7355" 
              strokeWidth="3" 
              rx="10"
              onClick={handleBalconyClick}
              style={{ cursor: 'pointer' }}
            />
            <text x="750" y="610" fontSize="26" fontWeight="bold" fill="#5d4e37" textAnchor="middle" style={{ pointerEvents: 'none' }}>
              BALCONY
            </text>
            <text x="750" y="640" fontSize="18" fontStyle="italic" fill="#6b5d4f" textAnchor="middle" style={{ pointerEvents: 'none' }}>
              Shared Space - Standing Area
            </text>
            <text x="750" y="660" fontSize="14" fill="#7a6a57" textAnchor="middle" style={{ pointerEvents: 'none' }}>
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
          <div>Row: {hoveredSeat.row}, Seat: {hoveredSeat.number}</div>
          <div>Category: {SEAT_CATEGORIES[hoveredSeat.category].name}</div>
          {seatStatuses.get(hoveredSeat.seatId)?.currentPrice && (
            <div>Price: {seatStatuses.get(hoveredSeat.seatId)?.currentPrice.toLocaleString()} LKR</div>
          )}
          <div>Status: {seatStatuses.get(hoveredSeat.seatId)?.status || 'AVAILABLE'}</div>
        </div>
      )}
    </div>
  );
};

export default VenueSeatMap;
