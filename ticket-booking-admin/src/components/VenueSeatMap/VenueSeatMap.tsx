import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, Button, Box, Typography, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import axiosInstance from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
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
  status: 'AVAILABLE' | 'BOOKED' | 'HELD' | 'LOCKED' | 'NOT_FOR_SALE' | 'SELECTED' | 'VIP_RESERVED';
  currentPrice: number;
  notes?: string;
  heldByUserId?: string;
}

// Shared area ticket category from database
interface SharedAreaCategory {
  categoryId: string;
  categoryName: string;
  price: number;
  capacity: number;
  sharedAreaNumber: number;
  availableTickets: number;
  dealActive?: boolean;
  dealType?: string;
  dealDiscountPercentage?: number;
  dealBuyQuantity?: number;
  dealFreeQuantity?: number;
  dealLabel?: string;
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
    status: 'AVAILABLE' | 'BOOKED' | 'HELD' | 'LOCKED' | 'NOT_FOR_SALE' | 'VIP_RESERVED';
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
  onSharedAreaSelect?: (
    areaNumber: number,
    count: number,
    price: number,
    categoryName: string,
    dealProperties?: {
      dealActive?: boolean;
      dealType?: string;
      dealDiscountPercentage?: number;
      dealBuyQuantity?: number;
      dealFreeQuantity?: number;
      dealLabel?: string;
    }
  ) => void;
  maxSelection?: number;
  selectedSeats?: string[];
  bookedSeats?: string[];
  isHolding?: boolean;
}

const getAreaColor = (index: number): string => {
  const mod = index % 5;
  if (mod === 0) return '#FFE082';
  if (mod === 1) return '#B3E5FC';
  if (mod === 2) return '#C8E6C9';
  if (mod === 3) return '#F8BBD9';
  return '#D1C4E9';
};

const getBorderColor = (index: number): string => {
  const mod = index % 5;
  if (mod === 0) return '#FFA000';
  if (mod === 1) return '#0288D1';
  if (mod === 2) return '#388E3C';
  if (mod === 3) return '#C2185B';
  return '#7B1FA2';
};

const getTextColor = (index: number): string => {
  const mod = index % 5;
  if (mod === 0) return '#FF6F00';
  if (mod === 1) return '#01579B';
  if (mod === 2) return '#1B5E20';
  if (mod === 3) return '#880E4F';
  return '#4A148C';
};

export const VenueSeatMap: React.FC<VenueSeatMapProps> = ({
  eventScheduleId,
  venueId,
  onSeatSelect,
  onSharedAreaSelect,
  maxSelection = 10,
  selectedSeats = [],
  bookedSeats = [],
  isHolding = false,
}) => {
  const { isRestrictedUser, user } = useAuth();
  const { t } = useTranslation();
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

  const fetchSeatAvailability = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get<SeatAvailabilityResponse>(`/api/venue-seats/availability/${eventScheduleId}`);
      const data = response.data;

      // Filter out locked seats for Nelum Pokuna Outdoor Arena
      let rawSeats = data.seats || [];
      if (venueId === 'f2ca9b05-b1c6-4cf5-9083-1194543d5898') {
        rawSeats = rawSeats.filter(
          (seat: any) => !(seat.status === 'LOCKED' || seat.notes?.toLowerCase().includes('[locked]'))
        );
      }

      // Store venue seats with coordinates
      const seats: VenueSeatData[] = rawSeats.map((seat: any) => {
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

      if (validSeats.length === 0 && rawSeats.length > 0) {
      }

      setVenueSeats(validSeats);

      // Store seat statuses
      const statusMap = new Map<string, SeatStatus>();
      rawSeats.forEach((seat: any) => {
        statusMap.set(seat.seatId, {
          seatId: seat.seatId,
          status: seat.status,
          currentPrice: seat.currentPrice,
          notes: seat.notes,
          heldByUserId: seat.heldByUserId,
        });
      });

      setSeatStatuses(statusMap);

      // Permanently excluded seats (admin-locked / not-for-sale) — never counted in totals
      const permanentlyExcludedStatuses = ['LOCKED', 'NOT_FOR_SALE'];

      // Total seats available to customers (excludes permanently locked/not-for-sale)
      const customerFacing = rawSeats.filter(
        (seat: any) => !permanentlyExcludedStatuses.includes(seat.status)
      ).length;
      setCustomerFacingTotal(customerFacing);

      // Occupied = truly reserved seats only (booked, temporarily held, VIP reserved)
      const occupiedStatuses = ['BOOKED', 'HELD', 'VIP_RESERVED'];
      const occupied = rawSeats.filter((seat: any) => occupiedStatuses.includes(seat.status)).length;
      setTotalOccupiedSeats(occupied);

      // Store shared areas if available from API response
      if (data.sharedAreas && data.sharedAreas.length > 0) {
        setSharedAreas(data.sharedAreas);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [eventScheduleId, venueId]);

  // Debug: Log venue ID changes
  useEffect(() => {
  }, [venueId, hasSharedAreas, sharedAreas]);

  // Fetch seat availability from backend
  useEffect(() => {
    fetchSeatAvailability();
  }, [fetchSeatAvailability]);

  // Sync localSelectedSeats with selectedSeats prop when it changes externally
  useEffect(() => {
    setLocalSelectedSeats(new Set(selectedSeats));
  }, [selectedSeats]);

  const handleSeatClick = useCallback((seat: VenueSeatData, e?: React.MouseEvent) => {
    // Stop event propagation to prevent panning
    if (e) {
      e.stopPropagation();
    }

    const status = seatStatuses.get(seat.seatId);

    // If it's already in our local selection, we should ALWAYS be able to click it to unselect it
    if (localSelectedSeats.has(seat.seatId)) {
      const newSelected = new Set(localSelectedSeats);
      newSelected.delete(seat.seatId);
      setLocalSelectedSeats(newSelected);
      onSeatSelect?.(Array.from(newSelected));
      return;
    }

    // Don't allow selection of booked/locked/held/VIP reserved seats
    if (status && ['BOOKED', 'LOCKED', 'NOT_FOR_SALE', 'HELD', 'VIP_RESERVED'].includes(status.status)) {
      if (!(status.status === 'HELD' && status.heldByUserId === user?.id)) {
        return;
      }
    }

    const newSelected = new Set(localSelectedSeats);
    if (newSelected.size >= maxSelection) {
      alert(`You can only select up to ${maxSelection} seats`);
      return;
    }
    newSelected.add(seat.seatId);

    setLocalSelectedSeats(newSelected);
    onSeatSelect?.(Array.from(newSelected));
  }, [seatStatuses, localSelectedSeats, maxSelection, onSeatSelect]);

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

    // Status-based colours – same for everyone
    if (status) {
      switch (status.status) {
        case 'BOOKED':
        case 'VIP_RESERVED':
          return '#FF0000'; // Red – sold
        case 'LOCKED':
          // Nelum Pokuna Outdoor Arena: locked seats physically do not exist and are invisible to everyone
          if (venueId === 'f2ca9b05-b1c6-4cf5-9083-1194543d5898')
            return 'transparent';
          return '#6c757d'; // Grey – locked
        case 'HELD':
          return '#FFD700'; // Yellow – temporarily held
        case 'NOT_FOR_SALE':
          return 'transparent'; // Hidden
      }
    }

    // Selected by the current user
    if (localSelectedSeats.has(seat.seatId)) return isHolding ? '#FFD700' : '#FF0000';

    // Available seats: category colour for everyone
    return seat.colorCode || '#4CAF50';
  }, [seatStatuses, localSelectedSeats, venueId, isRestrictedUser, isHolding]);

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
        selectedSharedArea.categoryName,
        {
          dealActive: selectedSharedArea.dealActive,
          dealType: selectedSharedArea.dealType,
          dealDiscountPercentage: selectedSharedArea.dealDiscountPercentage,
          dealBuyQuantity: selectedSharedArea.dealBuyQuantity,
          dealFreeQuantity: selectedSharedArea.dealFreeQuantity,
          dealLabel: selectedSharedArea.dealLabel,
        }
      );
      handleSharedAreaDialogClose();
    }
  };

  return (
    <div className="venue-seat-map-container">
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          {t('loadingVenueLayout', 'Loading venue layout...')}
        </div>
      )}

      {!loading && (
        <>
          {/* Controls */}
          <div className="venue-controls">
            <button onClick={handleZoomIn} className="control-btn">+</button>
            <button onClick={handleZoomOut} className="control-btn">-</button>
            <button onClick={handleResetView} className="control-btn">{t('reset', 'Reset')}</button>
            <span className="selected-count">
              {t('selectedLabel', 'Selected:')} {totalOccupiedSeats} / {customerFacingTotal || venueSeats.length}
            </span>
          </div>

          {/* Legend */}
          <div className="venue-legend">
            {Array.from(new Set(venueSeats.map(s => s.categoryName))).map((categoryName, index) => {
              const seat = venueSeats.find(s => s.categoryName === categoryName);
              const status = seat ? seatStatuses.get(seat.seatId) : null;
              const priceStr = status?.currentPrice ? ` - ${status.currentPrice.toLocaleString()} LKR` : '';
              return (
                <div key={`cat-${index}`} className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: seat?.colorCode || '#4CAF50' }} />
                  <span>{categoryName}{priceStr}</span>
                </div>
              );
            })}
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#FF0000' }} />
              <span>{t('soldSelected', 'Sold / Selected')}</span>
            </div>
            {venueId !== 'f2ca9b05-b1c6-4cf5-9083-1194543d5898' && (
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#6c757d' }} />
                <span>{t('locked', 'Locked')}</span>
              </div>
            )}
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#FFD700' }} />
              <span>{t('temporarilyHold', 'Temporarily Hold')}</span>
            </div>
          </div>

          {/* SVG Seat Map */}
          <div className="venue-svg-container">
            {(() => {
              const xPos = venueSeats.length > 0 ? venueSeats.map(s => s.xPosition).filter(x => !isNaN(x)) : [0, 1800];
              const yPos = venueSeats.length > 0 ? venueSeats.map(s => s.yPosition).filter(y => !isNaN(y)) : [0, 900];
              const minX = Math.min(...xPos);
              const maxX = Math.max(...xPos);
              const minY = Math.min(...yPos);
              const maxY = Math.max(...yPos);

              // Position stage dynamically above minY (first row of seats)
              const stageWidth = Math.max(400, Math.min(800, (maxX - minX) * 0.75));
              const stageHeight = 65;
              const stageGap = 50;
              const stageY = minY - stageHeight - stageGap;
              const stageX = ((minX + maxX) / 2) - (stageWidth / 2);
              const stageCenterX = (minX + maxX) / 2;
              const stageCenterY = stageY + stageHeight / 2 + 8;

              // The top of our viewport should be slightly above the stage top
              const contentTop = stageY - 40; 
              const centerX = (minX + maxX) / 2;
              const centerY = (contentTop + maxY) / 2;

              const padding = 80;
              const vbWidth = Math.max(maxX - minX + padding * 2, 1400);
              const vbHeight = Math.max(maxY - contentTop + padding * 2, 800);

              const vbX = centerX - vbWidth / 2;
              const vbY = centerY - vbHeight / 2;

              return (
                <svg
                  ref={svgRef}
                  viewBox={`${vbX} ${vbY} ${vbWidth} ${vbHeight}`}
                  className="venue-svg"
                  preserveAspectRatio="xMidYMid meet"
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
                  <defs>
                    {/* Premium Drop Shadow for the Stage */}
                    <filter id="stageShadow" x="-10%" y="-10%" width="120%" height="130%">
                      <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000000" floodOpacity="0.25"/>
                    </filter>
                    
                    {/* Modern slate gradient for the Stage */}
                    <linearGradient id="stageGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#1e293b" />
                      <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>
                    
                    {/* Glowing front edge gradient for the stage */}
                    <linearGradient id="stageGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                      <stop offset="15%" stopColor="#3b82f6" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#60a5fa" stopOpacity="1" />
                      <stop offset="85%" stopColor="#3b82f6" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  <style>{`
                    .seat-circle {
                      transition: r 0.15s cubic-bezier(0.4, 0, 0.2, 1), 
                                  stroke 0.15s cubic-bezier(0.4, 0, 0.2, 1),
                                  stroke-width 0.15s cubic-bezier(0.4, 0, 0.2, 1), 
                                  filter 0.15s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    .seat-circle:hover {
                      r: 9.5px !important;
                      stroke: #ffffff !important;
                      stroke-width: 2px !important;
                      filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.4)) !important;
                    }
                  `}</style>

                  {/* Stage - Calculated based on seat alignment */}
                  {venueSeats.length > 0 && (
                    <g filter="url(#stageShadow)">
                      {/* Main Stage Rectangle */}
                      <rect 
                        x={stageX} 
                        y={stageY} 
                        width={stageWidth} 
                        height={stageHeight} 
                        fill="url(#stageGrad)" 
                        stroke="#334155" 
                        strokeWidth="2" 
                        rx="10" 
                      />
                      {/* Glowing Apron Highlight (bottom edge of the stage) */}
                      <rect 
                        x={stageX + 4} 
                        y={stageY + stageHeight - 4} 
                        width={stageWidth - 8} 
                        height="3" 
                        fill="url(#stageGlow)" 
                        rx="1.5" 
                      />
                      {/* Stage Text */}
                      <text 
                        x={stageCenterX} 
                        y={stageCenterY} 
                        fontSize="20" 
                        fontWeight="700" 
                        fill="#f8fafc" 
                        letterSpacing="5"
                        textAnchor="middle"
                        style={{ userSelect: 'none' }}
                      >
                        {t('stage', 'STAGE')}
                      </text>
                    </g>
                  )}

                  {/* Seats - Render from database */}
                  <g id="seats-container">
                    {venueSeats.map((seat: VenueSeatData) => {
                      const status = seatStatuses.get(seat.seatId);
                      const isUnavailable = status && ['BOOKED', 'LOCKED', 'NOT_FOR_SALE', 'HELD', 'VIP_RESERVED'].includes(status.status) && !localSelectedSeats.has(seat.seatId) && !(status.status === 'HELD' && status.heldByUserId === user?.id);
                      const isHiddenLockedSeat =
                        status?.status === 'LOCKED' &&
                        venueId === 'f2ca9b05-b1c6-4cf5-9083-1194543d5898';

                      if (isHiddenLockedSeat) {
                        return null;
                      }

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
                    const minX_shared = xPos.length > 0 ? Math.min(...xPos) : 200;
                    const maxX_shared = xPos.length > 0 ? Math.max(...xPos) : 1600;
                    const maxY_shared = yPos.length > 0 ? Math.max(...yPos) : 500;
                    const minY_shared = yPos.length > 0 ? Math.min(...yPos) : 100;

                    let areaWidth, areaX, areaY, areaHeight;

                    if (venueId === 'f2ca9b05-b1c6-4cf5-9083-1194543d5898') {
                      // Custom layout for Nelum Pokuna Outdoor Arena (Vertical sides)
                      const gap = 30;
                      areaWidth = 160;
                      areaHeight = Math.max(maxY_shared - minY_shared, 100);
                      areaY = minY_shared;

                      if (area.sharedAreaNumber === 2) {
                        areaX = minX_shared - areaWidth * 2 - gap * 2;
                      } else if (area.sharedAreaNumber === 1) {
                        areaX = minX_shared - areaWidth - gap;
                      } else if (area.sharedAreaNumber === 3) {
                        areaX = maxX_shared + gap;
                      } else if (area.sharedAreaNumber === 4) {
                        areaX = maxX_shared + areaWidth + gap * 2;
                      } else {
                        // Fallback
                        areaX = minX_shared + index * (areaWidth + gap);
                        areaY = maxY_shared + 60;
                        areaHeight = 80;
                      }
                    } else {
                      // Default horizontal layout
                      const totalWidth_shared = maxX_shared - minX_shared;
                      areaWidth = sharedAreas.length > 1
                        ? (totalWidth_shared - (sharedAreas.length - 1) * 20) / sharedAreas.length
                        : totalWidth_shared * 0.5;
                      areaX = sharedAreas.length > 1
                        ? minX_shared + index * (areaWidth + 20)
                        : minX_shared + totalWidth_shared * 0.25;
                      areaY = maxY_shared + 60;
                      areaHeight = 80;
                    }
                    return (
                      <g key={`shared-area-${area.sharedAreaNumber}`}>
                        <rect
                          x={areaX}
                          y={areaY}
                          width={areaWidth}
                          height={areaHeight}
                          fill={getAreaColor(index)}
                          fillOpacity="0.15"
                          stroke={getBorderColor(index)}
                          strokeWidth="2"
                          rx="8"
                          className="shared-area"
                          style={{ cursor: 'pointer', pointerEvents: 'auto', transition: 'all 0.2s ease' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSharedAreaClick(area);
                          }}
                          onMouseEnter={(e) => {
                            (e.target as SVGRectElement).style.fillOpacity = "0.25";
                            (e.target as SVGRectElement).style.strokeWidth = "3";
                          }}
                          onMouseLeave={(e) => {
                            (e.target as SVGRectElement).style.fillOpacity = "0.15";
                            (e.target as SVGRectElement).style.strokeWidth = "2";
                          }}
                        />
                        <text
                          x={areaX + areaWidth / 2}
                          y={areaY + areaHeight / 2 - 12}
                          textAnchor="middle"
                          fontSize="16"
                          fontWeight="600"
                          fill="#f8fafc"
                          style={{ cursor: 'pointer', pointerEvents: 'none', letterSpacing: '0.5px' }}
                        >
                          {area.categoryName}
                        </text>
                        <text
                          x={areaX + areaWidth / 2}
                          y={areaY + areaHeight / 2 + 16}
                          textAnchor="middle"
                          fontSize="13"
                          fontWeight="500"
                          fill="#cbd5e1"
                          style={{ cursor: 'pointer', pointerEvents: 'none' }}
                        >
                          {t('lkr', 'LKR')} {area.price.toLocaleString()} • {area.availableTickets} {t('availableLower', 'available')}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              );
            })()}
          </div>

          {/* Hover tooltip - hide locked seat details from customers */}
          {hoveredSeat && (() => {
            const hoveredStatus = seatStatuses.get(hoveredSeat.seatId)?.status;
            // Customers and unauthenticated users should not see details of locked seats
            if (hoveredStatus === 'LOCKED' && !isRestrictedUser()) return null;
            return (
              <div className="seat-tooltip">
                <strong>{hoveredSeat.seatId}</strong>
                <div>{t('sectionLabel', 'Section:')} {hoveredSeat.section}</div>
                <div>{t('rowLabelText', 'Row:')} {hoveredSeat.rowLabel}, {t('seatLabel', 'Seat:')} {hoveredSeat.seatNumber}</div>
                <div>{t('categoryLabel', 'Category:')} {hoveredSeat.categoryName}</div>
                {seatStatuses.get(hoveredSeat.seatId)?.currentPrice && (
                  <div>{t('priceRs', 'Price: Rs.')}{seatStatuses.get(hoveredSeat.seatId)?.currentPrice.toLocaleString()}</div>
                )}
                <div>{t('statusLabel', 'Status:')} {hoveredStatus || t('availableUpper', 'AVAILABLE')}</div>
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
                {selectedSharedArea?.categoryName || t('standingArea', 'Standing Area')}
              </Typography>

              <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                {t('sharedSpaceNoticeStart', 'This section is a')} <strong>{t('sharedSpaceNoticeStrong', '*Shared Space*')}</strong> {t('sharedSpaceNoticeEnd', 'and does not have any allocated seats.')}
              </Typography>

              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                {t('pricePerTicket', 'Price per ticket:')} <strong>{t('lkr', 'LKR')} {selectedSharedArea?.price.toLocaleString()}</strong>
              </Typography>

              <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                {t('availableLabel', 'Available:')} <strong>{selectedSharedArea?.availableTickets}</strong> {t('tickets', 'tickets')}
              </Typography>

              <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
                {t('howManyTickets', 'How many tickets do you want?')}
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
                  {t('totalLabel', 'Total:')} {t('lkr', 'LKR')} {(sharedAreaTicketCount * selectedSharedArea.price).toLocaleString()}
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
                  {t('selectTickets', 'Select tickets')}
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
                {t('cancel', 'Cancel')}
              </Button>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default VenueSeatMap;
