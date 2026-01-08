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
  Tooltip
} from '@mui/material';
import { ZoomIn, ZoomOut, CenterFocusStrong } from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import api from '../../../services/api';

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
}

const SeatingArrangement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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

  useEffect(() => {
    fetchHardcodedSeats();
  }, []);

  const fetchHardcodedSeats = async () => {
    try {
      setLoading(true);
      
      // Fetch hardcoded venue seats layout using the configured API client
      const response = await api.get<VenueSeat[]>('/api/venue-seats/layout');
      
      setSeats(response.data);
      
      // Debug: Log first few seats to check data
      console.log('Loaded seats:', response.data.length);
      console.log('Sample seats:', response.data.slice(0, 5));
      console.log('First seat full details:', JSON.stringify(response.data[0], null, 2));
      console.log('First seat xposition:', response.data[0]?.xposition);
      console.log('First seat yposition:', response.data[0]?.yposition);
      
      // Extract unique categories
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
      setError(null);
    } catch (err) {
      console.error('Error fetching hardcoded seats:', err);
      setError('Failed to load hardcoded venue seating layout');
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

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.min(Math.max(prev + delta, 0.5), 5));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
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
          Hardcoded Venue Seating Layout (Kularathna Auditorium)
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          This is the hardcoded seating layout with <strong>{seats.length} seats</strong>. 
          This layout is used for all events at this venue. Prices are set per event, not per venue.
        </Alert>

        {/* Legend */}
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
            onWheel={handleWheel}
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
                  <rect x="250" y="-50" width="300" height="60" fill="#d3d3d3" stroke="#666" strokeWidth="2" rx="5" />
                  <text x="400" y="-15" fontSize="24" fontWeight="bold" fill="#333" textAnchor="middle">
                    STAGE
                  </text>
                  
                  {/* Render all seats as circles */}
                  {seats.map((seat) => {
                    const x = Number(seat.xposition) || 0;
                    const y = Number(seat.yposition) || 0;
                    
                    if (x === 0 || y === 0) return null; // Skip invalid positions
                    
                    return (
                      <circle
                        key={seat.seatId}
                        cx={x}
                        cy={y}
                        r="6"
                        fill={seat.colorCode || '#999'}
                        stroke="#333"
                        strokeWidth="1"
                        opacity="0.9"
                        style={{ cursor: 'pointer' }}
                      >
                        <title>{`${seat.section} ${seat.rowLabel}${seat.seatNumber}\n${seat.categoryName}`}</title>
                      </circle>
                    );
                  })}
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
    </Box>
  );
};

export default SeatingArrangement;