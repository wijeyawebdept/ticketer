import { useState, useEffect, useCallback } from 'react';

interface SeatStatus {
  seatId: string;
  status: 'available' | 'reserved' | 'unavailable';
  timestamp: number;
}

// Mock WebSocket service for demonstration
// In a real implementation, this would connect to your backend WebSocket server
class MockWebSocketService {
  private listeners: Array<(data: SeatStatus) => void> = [];
  private isConnected = false;

  connect(venueId: string): void {
    this.isConnected = true;
    console.log(`Connected to WebSocket for venue: ${venueId}`);
    
    // Simulate real-time updates
    setInterval(() => {
      if (Math.random() > 0.95) { // 5% chance of update
        const rows = 'ABCDEFGHIJ';
        const row = rows[Math.floor(Math.random() * rows.length)];
        const number = Math.floor(Math.random() * 10) + 1;
        const seatId = `${row}${number}`;
        const statuses: ('available' | 'reserved' | 'unavailable')[] = ['available', 'reserved', 'unavailable'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        this.notifyListeners({
          seatId,
          status,
          timestamp: Date.now()
        });
      }
    }, 3000);
  }

  disconnect(): void {
    this.isConnected = false;
    this.listeners = [];
    console.log('Disconnected from WebSocket');
  }

  subscribe(listener: (data: SeatStatus) => void): void {
    this.listeners.push(listener);
  }

  unsubscribe(listener: (data: SeatStatus) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  updateSeat(seatId: string, status: 'available' | 'reserved' | 'unavailable'): void {
    if (this.isConnected) {
      this.notifyListeners({
        seatId,
        status,
        timestamp: Date.now()
      });
    }
  }

  private notifyListeners(data: SeatStatus): void {
    this.listeners.forEach(listener => listener(data));
  }
}

const mockWebSocketService = new MockWebSocketService();

export const useSeatWebSocket = (venueId: string) => {
  const [seats, setSeats] = useState<Record<string, SeatStatus>>({});
  const [isConnected, setIsConnected] = useState(false);

  // Connect to WebSocket when venueId changes
  useEffect(() => {
    if (venueId) {
      mockWebSocketService.connect(venueId);
      setIsConnected(true);

      // Subscribe to seat updates
      const handleSeatUpdate = (data: SeatStatus) => {
        setSeats(prev => ({
          ...prev,
          [data.seatId]: data
        }));
      };

      mockWebSocketService.subscribe(handleSeatUpdate);

      return () => {
        mockWebSocketService.unsubscribe(handleSeatUpdate);
        mockWebSocketService.disconnect();
        setIsConnected(false);
      };
    }
  }, [venueId]);

  // Function to update seat status
  const updateSeatStatus = useCallback((seatId: string, status: 'available' | 'reserved' | 'unavailable') => {
    mockWebSocketService.updateSeat(seatId, status);
  }, []);

  return {
    seats,
    isConnected,
    updateSeatStatus
  };
};