import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Switch,
  FormControlLabel,
  Chip
} from '@mui/material';
import {
  Chair as ChairIcon,
  ChairOutlined as ChairOutlinedIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  AddCircle,
  RemoveCircle,
  Info as InfoIcon
} from '@mui/icons-material';
import { useParams, useLocation } from 'react-router-dom';
import { VenueService } from '../../../services';
import { useSeatWebSocket } from '../../../hooks/useSeatWebSocket';
import { Venue } from '../../../types';
import { useAuth } from '../../../context/AuthContext';

// Add CSS for the moving light animation
const stageStyles = `
  @keyframes movingLight {
    0% { background-position: 0% 50%; }
    100% { background-position: 100% 50%; }
  }
  
  @keyframes blink {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
`;

interface Seat {
  id: string;
  row: string;
  number: number;
  status: 'available' | 'reserved' | 'unavailable';
  section?: string;
  price?: number;
}

interface SeatingLayout {
  rows: number;
  columns: number;
  seats: Seat[];
}

const SeatingArrangement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seatingLayout, setSeatingLayout] = useState<SeatingLayout>({
    rows: 10,
    columns: 10,
    seats: []
  });
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [openSeatDialog, setOpenSeatDialog] = useState(false);
  const [showScreen, setShowScreen] = useState(true);

  // Determine if user is admin based on URL path or user role
  const isAdmin = location.pathname.includes('/admin/') || 
                 location.pathname.includes('/organizer/') || 
                 (user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN' || 
                  user?.role === 'ORGANIZER' || user?.role === 'ROLE_ORGANIZER');
  
  // Initialize WebSocket connection for real-time updates
  const { updateSeatStatus } = useSeatWebSocket(id || '');

  // Convert venue seating layout to our interface
  const convertToSeatingLayout = (layoutData: any, venueCapacity?: number): SeatingLayout => {
    // Handle case where layoutData might be null or undefined
    if (!layoutData) {
      // If no layout data exists, create a layout based on venue capacity
      if (venueCapacity && venueCapacity > 0) {
        return createLayoutBasedOnCapacity(venueCapacity);
      }
      // Fallback to default 10x10 if no capacity is provided
      return {
        rows: 10,
        columns: 10,
        seats: []
      };
    }
    
    // If the layout data already matches our interface, use it directly
    if (layoutData.rows && layoutData.columns && Array.isArray(layoutData.seats)) {
      return {
        rows: layoutData.rows,
        columns: layoutData.columns,
        seats: layoutData.seats.map((seat: any) => ({
          id: seat.id || `${seat.row}${seat.number}`,
          row: seat.row || '',
          number: seat.number || 0,
          status: seat.status || 'available',
          section: seat.section || undefined,
          price: seat.price || undefined
        }))
      };
    }
    
    // Otherwise, create a layout based on existing data or capacity
    const rows = layoutData.rows || 10;
    const columns = layoutData.columns || 10;
    const seats = Array.isArray(layoutData.seats) ? layoutData.seats : [];
    
    // If we have capacity data and no seats, create layout based on capacity
    if (venueCapacity && venueCapacity > 0 && seats.length === 0) {
      return createLayoutBasedOnCapacity(venueCapacity);
    }
    
    return {
      rows,
      columns,
      seats
    };
  };

  // Create seating layout based on venue capacity
  const createLayoutBasedOnCapacity = (capacity: number): SeatingLayout => {
    // Calculate approximate rows and columns based on capacity
    const sqrtCapacity = Math.sqrt(capacity);
    const rows = Math.max(5, Math.ceil(sqrtCapacity * 0.8)); // Minimum 5 rows
    const columns = Math.max(5, Math.ceil(capacity / rows)); // Calculate columns based on rows
    
    const seats: Seat[] = [];
    
    for (let row = 0; row < rows; row++) {
      const rowLabel = String.fromCharCode(65 + row); // A, B, C...
      for (let col = 1; col <= columns; col++) {
        // Only create seats up to the venue capacity
        if (seats.length < capacity) {
          seats.push({
            id: `${rowLabel}${col}`,
            row: rowLabel,
            number: col,
            status: 'available'
          });
        }
      }
    }
    
    return {
      rows,
      columns,
      seats
    };
  };

  // Initialize default seating layout
  const initializeDefaultSeating = (venueCapacity?: number) => {
    let layout: SeatingLayout;
    
    if (venueCapacity && venueCapacity > 0) {
      layout = createLayoutBasedOnCapacity(venueCapacity);
    } else {
      // Fallback to default 10x10 grid
      const rows = 10;
      const columns = 10;
      const seats: Seat[] = [];
      
      for (let row = 0; row < rows; row++) {
        const rowLabel = String.fromCharCode(65 + row); // A, B, C...
        for (let col = 1; col <= columns; col++) {
          seats.push({
            id: `${rowLabel}${col}`,
            row: rowLabel,
            number: col,
            status: 'available'
          });
        }
      }
      
      layout = {
        rows,
        columns,
        seats
      };
    }
    
    setSeatingLayout(layout);
  };

  // Load venue and seating data
  useEffect(() => {
    const loadVenueData = async () => {
      try {
        setLoading(true);
        const venueData = await VenueService.getVenueById(id || '', isAdmin);
        setVenue(venueData);
        
        // Initialize seating layout from venue data or create default
        if (venueData.seatingLayout) {
          // Convert the seating layout from venue data to our interface
          const layout = convertToSeatingLayout(venueData.seatingLayout, venueData.capacity);
          setSeatingLayout(layout);
        } else {
          // Create default seating layout based on venue capacity
          initializeDefaultSeating(venueData.capacity);
        }
      } catch (err) {
        setError('Failed to load venue data');
        console.error('Error loading venue:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadVenueData();
    }
  }, [id, isAdmin]);

  // Handle seat click
  const handleSeatClick = (seat: Seat) => {
    if (isEditing) {
      // In editing mode, allow adding/removing individual seats
      const seatExists = seatingLayout.seats.some(s => s.id === seat.id);
      if (seatExists) {
        // Remove seat
        removeIndividualSeat(seat.id);
      } else {
        // Add seat - this is for empty spaces
        addIndividualSeat(seat.row, seat.number);
      }
    } else {
      // Normal mode - open seat details
      setSelectedSeat(seat);
      setOpenSeatDialog(true);
    }
  };

  // Handle click on empty space
  const handleEmptySpaceClick = (row: string, number: number) => {
    if (isEditing) {
      // Add seat at this position
      addIndividualSeat(row, number);
    }
  };

  // Add a new individual seat
  const addIndividualSeat = (row: string, number: number) => {
    const newSeat: Seat = {
      id: `${row}${number}`,
      row,
      number,
      status: 'available'
    };
    
    // Check if seat already exists
    const seatExists = seatingLayout.seats.some(seat => seat.id === newSeat.id);
    if (!seatExists) {
      setSeatingLayout(prev => ({
        ...prev,
        seats: [...prev.seats, newSeat]
      }));
    }
  };

  // Remove an individual seat
  const removeIndividualSeat = (seatId: string) => {
    setSeatingLayout(prev => ({
      ...prev,
      seats: prev.seats.filter(seat => seat.id !== seatId)
    }));
  };

  // Update seat status
  const updateSeat = (seatId: string, status: 'available' | 'reserved' | 'unavailable') => {
    setSeatingLayout(prev => ({
      ...prev,
      seats: prev.seats.map(seat => 
        seat.id === seatId ? { ...seat, status } : seat
      )
    }));
    
    // Send real-time update via WebSocket
    updateSeatStatus(seatId, status);
  };

  // Add a new row
  const addRow = () => {
    const newRows = seatingLayout.rows + 1;
    const newRowLabel = String.fromCharCode(65 + newRows - 1);
    const newSeats = [...seatingLayout.seats];
    
    // Add seats for the new row
    for (let col = 1; col <= seatingLayout.columns; col++) {
      newSeats.push({
        id: `${newRowLabel}${col}`,
        row: newRowLabel,
        number: col,
        status: 'available'
      });
    }
    
    setSeatingLayout({
      rows: newRows,
      columns: seatingLayout.columns,
      seats: newSeats
    });
  };

  // Remove the last row
  const removeRow = () => {
    if (seatingLayout.rows <= 1) return;
    
    const newRows = seatingLayout.rows - 1;
    const removedRowLabel = String.fromCharCode(65 + newRows);
    const newSeats = seatingLayout.seats.filter(seat => seat.row !== removedRowLabel);
    
    setSeatingLayout({
      rows: newRows,
      columns: seatingLayout.columns,
      seats: newSeats
    });
  };

  // Add a new column
  const addColumn = () => {
    const newColumns = seatingLayout.columns + 1;
    const newSeats = [...seatingLayout.seats];
    
    // Add seats for the new column
    for (let row = 0; row < seatingLayout.rows; row++) {
      const rowLabel = String.fromCharCode(65 + row);
      newSeats.push({
        id: `${rowLabel}${newColumns}`,
        row: rowLabel,
        number: newColumns,
        status: 'available'
      });
    }
    
    setSeatingLayout({
      rows: seatingLayout.rows,
      columns: newColumns,
      seats: newSeats
    });
  };

  // Add multiple columns at once
  const addMultipleColumns = (count: number) => {
    let newColumns = seatingLayout.columns;
    let newSeats = [...seatingLayout.seats];
    
    for (let i = 0; i < count; i++) {
      newColumns = newColumns + 1;
      // Add seats for the new column
      for (let row = 0; row < seatingLayout.rows; row++) {
        const rowLabel = String.fromCharCode(65 + row);
        newSeats.push({
          id: `${rowLabel}${newColumns}`,
          row: rowLabel,
          number: newColumns,
          status: 'available'
        });
      }
    }
    
    setSeatingLayout({
      rows: seatingLayout.rows,
      columns: newColumns,
      seats: newSeats
    });
  };

  // Remove the last column
  const removeColumn = () => {
    if (seatingLayout.columns <= 1) return;
    
    const newColumns = seatingLayout.columns - 1;
    const newSeats = seatingLayout.seats.filter(seat => seat.number !== seatingLayout.columns);
    
    setSeatingLayout({
      rows: seatingLayout.rows,
      columns: newColumns,
      seats: newSeats
    });
  };

  // Save seating arrangement
  const saveSeatingArrangement = async () => {
    try {
      setSaving(true);
      // Prepare the seating layout data for saving
      const seatingLayoutData = {
        rows: seatingLayout.rows,
        columns: seatingLayout.columns,
        seats: seatingLayout.seats.map(seat => ({
          id: seat.id,
          row: seat.row,
          number: seat.number,
          status: seat.status,
          section: seat.section || null,
          price: seat.price || null
        }))
      };
      
      // Log the data being sent for debugging
      console.log('Sending seating layout data:', seatingLayoutData);
      
      await VenueService.updateSeatingArrangement(id || '', seatingLayoutData, isAdmin);
      
      // Send WebSocket notification about layout update
      // This would be implemented in a real WebSocket service
    } catch (err: any) {
      setError(`Failed to save seating arrangement: ${err.message || 'Unknown error'}`);
      console.error('Error saving seating arrangement:', err);
      // Log the full error for debugging
      console.error('Full error details:', err);
    } finally {
      setSaving(false);
    }
  };

  // Render seating grid
  const renderSeatingGrid = () => {
    // Create a map of existing seats for quick lookup
    const seatMap: { [key: string]: Seat } = {};
    seatingLayout.seats.forEach(seat => {
      seatMap[seat.id] = seat;
    });

    const rows = [];
    for (let row = 0; row < seatingLayout.rows; row++) {
      const rowLabel = String.fromCharCode(65 + row);
      const rowSeats = [];
      
      // Create seats for this row - now creating positions for ALL columns
      for (let col = 1; col <= seatingLayout.columns; col++) {
        const seatId = `${rowLabel}${col}`;
        const seat = seatMap[seatId];
        
        rowSeats.push(
          <Grid item key={seatId}>
            {seat ? (
              // Existing seat
              <Tooltip title={`Row ${seat.row}, Seat ${seat.number}${isEditing ? ' - Click to remove' : ''}`}>
                <IconButton
                  onClick={() => handleSeatClick(seat)}
                  sx={{
                    color: seat.status === 'available' ? 'success.main' : 
                           seat.status === 'reserved' ? 'warning.main' : 'error.main',
                    '&:hover': {
                      backgroundColor: isEditing ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                >
                  {seat.status === 'available' ? <ChairOutlinedIcon /> : <ChairIcon />}
                </IconButton>
              </Tooltip>
            ) : (
              // Empty space where seat can be added
              isEditing && (
                <Tooltip title={`Add seat at Row ${rowLabel}, Seat ${col}`}>
                  <IconButton
                    onClick={() => handleEmptySpaceClick(rowLabel, col)}
                    sx={{
                      color: 'grey.400',
                      border: '1px dashed grey',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 255, 0, 0.1)'
                      }
                    }}
                  >
                    <AddCircle />
                  </IconButton>
                </Tooltip>
              )
            )}
          </Grid>
        );
      }
      
      rows.push(
        <Grid container key={rowLabel} spacing={1} alignItems="center">
          <Grid item>
            <Typography variant="h6" sx={{ fontWeight: 'bold', width: '30px', textAlign: 'center' }}>
              {rowLabel}
            </Typography>
          </Grid>
          {rowSeats}
          <Grid item>
            <Typography variant="h6" sx={{ fontWeight: 'bold', width: '30px', textAlign: 'center' }}>
              {rowLabel}
            </Typography>
          </Grid>
        </Grid>
      );
    }
    
    // Add column numbers at the top and bottom
    const columnNumbers = [];
    for (let col = 1; col <= seatingLayout.columns; col++) {
      columnNumbers.push(
        <Grid item key={`top-${col}`} sx={{ width: '40px', textAlign: 'center' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {col}
          </Typography>
        </Grid>
      );
    }
    
    return (
      <>
        {/* Column numbers at the top */}
        <Grid container spacing={1} alignItems="center">
          <Grid item sx={{ width: '30px' }}></Grid> {/* Spacer for row label */}
          {columnNumbers}
          <Grid item sx={{ width: '30px' }}></Grid> {/* Spacer for row label */}
        </Grid>
        
        {/* Seating rows */}
        {rows}
        
        {/* Column numbers at the bottom */}
        <Grid container spacing={1} alignItems="center">
          <Grid item sx={{ width: '30px' }}></Grid> {/* Spacer for row label */}
          {columnNumbers}
          <Grid item sx={{ width: '30px' }}></Grid> {/* Spacer for row label */}
        </Grid>
      </>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Add the stage styles */}
      <style>{stageStyles}</style>
      
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          Seating Arrangement - {venue?.name}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={saveSeatingArrangement}
          disabled={saving}
        >
          {saving ? <CircularProgress size={24} /> : 'Save Layout'}
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Seating Chart</Typography>
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={showScreen}
                  onChange={(e) => setShowScreen(e.target.checked)}
                />
              }
              label="Show Screen"
            />
            <Button
              variant="outlined"
              startIcon={isEditing ? <EditIcon /> : <EditIcon />}
              onClick={() => setIsEditing(!isEditing)}
              sx={{ ml: 2 }}
              color={isEditing ? "success" : "primary"}
            >
              {isEditing ? 'Finish Editing' : 'Edit Layout'}
            </Button>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
                <ChairOutlinedIcon sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="body2">Available</Typography>
              </Box>
            </Grid>
            <Grid item>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
                <ChairIcon sx={{ color: 'warning.main', mr: 1 }} />
                <Typography variant="body2">Reserved</Typography>
              </Box>
            </Grid>
            <Grid item>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ChairIcon sx={{ color: 'error.main', mr: 1 }} />
                <Typography variant="body2">Unavailable</Typography>
              </Box>
            </Grid>
            {isEditing && (
              <>
                <Grid item>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AddCircle sx={{ color: 'grey.400', mr: 1 }} />
                    <Typography variant="body2">Add Seat</Typography>
                  </Box>
                </Grid>
                <Grid item>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ChairIcon sx={{ color: 'success.main', mr: 1 }} />
                    <Typography variant="body2">Click seat to remove</Typography>
                  </Box>
                </Grid>
              </>
            )}
          </Grid>
        </Box>

        {/* Editing instructions */}
        {isEditing && (
          <Box sx={{ mb: 2, p: 2, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <InfoIcon sx={{ mr: 1, color: 'info.main' }} />
              <Typography variant="h6" sx={{ color: 'info.main' }}>
                Editing Mode Instructions
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              • Click on empty spaces to add individual seats
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              • Click on existing seats to remove them
            </Typography>
            <Typography variant="body2">
              • Use row/column controls to add/remove entire rows or columns
            </Typography>
          </Box>
        )}

        {/* Row/Column Controls */}
        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addRow}
          >
            Add Row
          </Button>
          <Button
            variant="outlined"
            startIcon={<RemoveIcon />}
            onClick={removeRow}
            disabled={seatingLayout.rows <= 1}
          >
            Remove Row
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addColumn}
          >
            Add Column
          </Button>
          <Button
            variant="outlined"
            startIcon={<RemoveIcon />}
            onClick={removeColumn}
            disabled={seatingLayout.columns <= 1}
          >
            Remove Column
          </Button>
          
          {/* Extended column controls */}
          {isEditing && (
            <>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => addMultipleColumns(5)}
              >
                Add 5 Columns
              </Button>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => addMultipleColumns(10)}
              >
                Add 10 Columns
              </Button>
            </>
          )}
          
          <Chip 
            label={`Total Seats: ${seatingLayout.seats.length}`} 
            color="primary" 
            variant="outlined" 
            sx={{ ml: 2, height: 32 }} 
          />
          <Chip 
            label={`Grid Size: ${seatingLayout.rows} × ${seatingLayout.columns}`} 
            color="secondary" 
            variant="outlined" 
            sx={{ ml: 1, height: 32 }} 
          />
        </Box>

        {/* Screen Visualization */}
        {showScreen && (
          <Box sx={{ 
            mb: 3, 
            p: 2, 
            backgroundColor: '#1976d2', 
            borderRadius: '0 0 8px 8px',
            textAlign: 'center',
            color: 'white',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '120px'
          }}>
            <Box sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              height: '4px', 
              background: 'linear-gradient(90deg, #ffeb3b, #f44336, #e91e63, #9c27b0, #3f51b5, #2196f3, #00bcd4, #009688, #4caf50, #cddc39)',
              animation: 'movingLight 3s linear infinite',
              backgroundSize: '200% 200%'
            }}></Box>
            <Box sx={{ 
              position: 'absolute', 
              top: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.2) 70%, transparent 100%)',
              opacity: 0.7
            }}></Box>
            <Typography variant="h4" sx={{ 
              fontWeight: 'bold', 
              mb: 1, 
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
              position: 'relative',
              zIndex: 1
            }}>
              MAIN STAGE
            </Typography>
            <Typography variant="h6" sx={{ 
              fontWeight: 'medium', 
              opacity: 0.9,
              position: 'relative',
              zIndex: 1
            }}>
            </Typography>
            <Typography variant="body2" sx={{
              mt: 1,
              opacity: 0.8,
              position: 'relative',
              zIndex: 1
            }}>
              All eyes are here
            </Typography>
            <Box sx={{
              position: 'absolute',
              bottom: '8px',
              right: '16px',
              display: 'flex',
              gap: '4px'
            }}>
              {[...Array(5)].map((_, i) => (
                <Box 
                  key={i}
                  sx={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.6)',
                    animation: `blink 1.5s infinite ${i * 0.2}s`
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        <Box sx={{ 
          border: '1px solid #e0e0e0', 
          borderRadius: 2, 
          p: 2, 
          backgroundColor: '#f5f5f5'
        }}>
          {renderSeatingGrid()}
        </Box>
      </Paper>

      {/* Seat Details Dialog */}
      <Dialog open={openSeatDialog} onClose={() => setOpenSeatDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Seat Details</DialogTitle>
        <DialogContent>
          {selectedSeat && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6">
                Row {selectedSeat.row}, Seat {selectedSeat.number}
              </Typography>
              
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={selectedSeat.status}
                  onChange={(e) => {
                    const newStatus = e.target.value as 'available' | 'reserved' | 'unavailable';
                    updateSeat(selectedSeat.id, newStatus);
                    setSelectedSeat({ ...selectedSeat, status: newStatus });
                  }}
                >
                  <MenuItem value="available">Available</MenuItem>
                  <MenuItem value="reserved">Reserved</MenuItem>
                  <MenuItem value="unavailable">Unavailable</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="Section"
                value={selectedSeat.section || ''}
                onChange={(e) => setSelectedSeat({ ...selectedSeat, section: e.target.value })}
                sx={{ mt: 2 }}
              />
              
              <TextField
                fullWidth
                label="Price"
                type="number"
                value={selectedSeat.price || ''}
                onChange={(e) => setSelectedSeat({ ...selectedSeat, price: Number(e.target.value) })}
                sx={{ mt: 2 }}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>LKR</Typography>
                }}
              />
              
              {isEditing && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<RemoveCircle />}
                    onClick={() => {
                      removeIndividualSeat(selectedSeat.id);
                      setOpenSeatDialog(false);
                    }}
                    fullWidth
                  >
                    Remove This Seat
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSeatDialog(false)}>Close</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setOpenSeatDialog(false);
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SeatingArrangement;