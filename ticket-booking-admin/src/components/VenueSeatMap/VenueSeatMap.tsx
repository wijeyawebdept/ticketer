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
        <svg
          ref={svgRef}
          viewBox="0 0 1000 700"
          className="venue-svg"
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
          }}
        >
          {/* Stage */}
          <rect
            x="300"
            y="20"
            width="400"
            height="50"
            fill="#D3D3D3"
            stroke="#999"
            strokeWidth="2"
            rx="5"
          />
          <text
            x="500"
            y="50"
            textAnchor="middle"
            fontSize="20"
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

          {/* Balcony */}
          <rect
            x="100"
            y="520"
            width="800"
            height="120"
            fill="rgba(169, 169, 169, 0.2)"
            stroke="#999"
            strokeWidth="2"
            rx="5"
          />
          <text
            x="500"
            y="650"
            textAnchor="middle"
            fontSize="24"
            fontWeight="bold"
            fill="#666"
          >
            BALCONY
          </text>
        </svg>
      </div>

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
