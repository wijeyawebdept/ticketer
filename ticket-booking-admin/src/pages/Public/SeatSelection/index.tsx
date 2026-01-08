import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VenueSeatMap from '../../../components/VenueSeatMap/VenueSeatMap';
import { venueSeatService } from '../../../services/venueSeatService';
import './SeatSelection.css';

interface EventDetails {
  id: number;
  title: string;
  venue: string;
  date: string;
  time: string;
}

const SeatSelectionPage: React.FC = () => {
  const { eventScheduleId } = useParams<{ eventScheduleId: string }>();
  const navigate = useNavigate();
  
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [holdTimer, setHoldTimer] = useState<number>(0);
  const [isHolding, setIsHolding] = useState(false);
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (eventScheduleId) {
      loadEventDetails(parseInt(eventScheduleId));
    }
  }, [eventScheduleId]);

  useEffect(() => {
    // Hold timer countdown
    if (holdTimer > 0) {
      const interval = setInterval(() => {
        setHoldTimer(prev => {
          if (prev <= 1) {
            handleHoldExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [holdTimer]);

  const loadEventDetails = async (scheduleId: number) => {
    try {
      // Fetch event details from your API
      const response = await fetch(`/api/events/schedule/${scheduleId}`);
      const data = await response.json();
      
      setEventDetails({
        id: data.id,
        title: data.eventTitle,
        venue: data.venueName,
        date: data.eventDate,
        time: data.eventTime,
      });
    } catch (error) {
      console.error('Failed to load event details:', error);
      // Fallback to basic info if API fails
      setEventDetails({
        id: scheduleId,
        title: 'Event',
        venue: 'Kularathna Auditorium',
        date: '',
        time: '',
      });
    }
  };

  const handleSeatSelect = (seats: string[]) => {
    setSelectedSeats(seats);
    calculateTotalPrice(seats);
  };

  const calculateTotalPrice = async (seatIds: string[]) => {
    try {
      const response = await venueSeatService.getSeatAvailability(parseInt(eventScheduleId!));
      const total = seatIds.reduce((sum, seatId) => {
        const seat = response.seats.find(s => s.seatId === seatId);
        return sum + (seat?.currentPrice || 0);
      }, 0);
      setTotalPrice(total);
    } catch (error) {
      console.error('Failed to calculate price:', error);
    }
  };

  const handleHoldSeats = async () => {
    if (selectedSeats.length === 0) {
      showMessage('error', 'Please select at least one seat');
      return;
    }

    setLoading(true);
    try {
      const userId = 1; // Get from auth context
      const response = await venueSeatService.holdSeats({
        eventScheduleId: parseInt(eventScheduleId!),
        seatIds: selectedSeats,
        userId,
      });

      if (response.success) {
        setIsHolding(true);
        setHoldTimer(response.expiresIn || 300);
        showMessage('success', 'Seats held successfully! Complete booking within 5 minutes.');
      } else {
        showMessage('error', response.message);
      }
    } catch (error) {
      showMessage('error', 'Failed to hold seats. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    setLoading(true);
    try {
      // Here you would integrate with your actual booking flow
      // For now, we'll just confirm the seat booking
      const userId = 1; // Get from auth context
      const bookingRefId = Date.now(); // Generate or get from booking creation
      
      const response: any = await venueSeatService.confirmBooking(
        parseInt(eventScheduleId!),
        bookingRefId,
        userId,
        selectedSeats
      );

      if (response.success) {
        showMessage('success', 'Booking confirmed successfully!');
        setTimeout(() => {
          navigate(`/booking-confirmation/${bookingRefId}`);
        }, 2000);
      } else {
        showMessage('error', 'Booking confirmation failed');
      }
    } catch (error) {
      showMessage('error', 'Failed to confirm booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseSeats = async () => {
    try {
      await venueSeatService.releaseHolds(parseInt(eventScheduleId!), selectedSeats);
      setSelectedSeats([]);
      setIsHolding(false);
      setHoldTimer(0);
      showMessage('success', 'Seats released');
    } catch (error) {
      showMessage('error', 'Failed to release seats');
    }
  };

  const handleHoldExpired = () => {
    setIsHolding(false);
    setSelectedSeats([]);
    showMessage('error', 'Your seat hold has expired. Please select seats again.');
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!eventDetails) {
    return <div className="loading">Loading event details...</div>;
  }

  return (
    <div className="seat-selection-page">
      {/* Message notification */}
      {message && (
        <div className={`message-notification ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Event header */}
      <div className="event-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          ← Back
        </button>
        <div className="event-info">
          <h1>{eventDetails.title}</h1>
          <p className="event-meta">
            <span>📍 {eventDetails.venue}</span>
            <span>📅 {eventDetails.date}</span>
            <span>🕐 {eventDetails.time}</span>
          </p>
        </div>
      </div>

      {/* Seat map */}
      <div className="seat-map-section">
        <VenueSeatMap
          eventScheduleId={parseInt(eventScheduleId!)}
          onSeatSelect={handleSeatSelect}
          maxSelection={10}
          selectedSeats={selectedSeats}
        />
      </div>

      {/* Booking summary */}
      {selectedSeats.length > 0 && (
        <div className="booking-summary">
          <div className="summary-content">
            <div className="summary-header">
              <h3>Booking Summary</h3>
              {isHolding && (
                <div className="hold-timer">
                  ⏱️ Time remaining: <strong>{formatTime(holdTimer)}</strong>
                </div>
              )}
            </div>

            <div className="summary-details">
              <div className="summary-row">
                <span>Selected Seats:</span>
                <strong>{selectedSeats.length}</strong>
              </div>
              <div className="summary-row">
                <span>Seat IDs:</span>
                <div className="seat-badges">
                  {selectedSeats.map(seatId => (
                    <span key={seatId} className="seat-badge">{seatId}</span>
                  ))}
                </div>
              </div>
              <div className="summary-row total">
                <span>Total Price:</span>
                <strong>{totalPrice.toLocaleString()} LKR</strong>
              </div>
            </div>

            <div className="summary-actions">
              {!isHolding ? (
                <>
                  <button 
                    onClick={handleHoldSeats} 
                    className="btn btn-primary"
                    disabled={loading || selectedSeats.length === 0}
                  >
                    {loading ? 'Processing...' : 'Hold Seats (5 min)'}
                  </button>
                  <button 
                    onClick={() => setSelectedSeats([])} 
                    className="btn btn-secondary"
                  >
                    Clear Selection
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={handleConfirmBooking} 
                    className="btn btn-success"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Confirm Booking'}
                  </button>
                  <button 
                    onClick={handleReleaseSeats} 
                    className="btn btn-danger"
                    disabled={loading}
                  >
                    Release Seats
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatSelectionPage;
