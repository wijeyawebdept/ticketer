import { useState, useEffect, useCallback } from 'react';
import { Seat, SeatUpdateMessage, SeatHoldNotification, SeatAvailabilityStats } from '../services/seat.service';
import seatWebSocketService, { WebSocketCallbacks } from '../services/websocket.service';

export interface UseSeatWebSocketResult {
  isConnected: boolean;
  seats: Seat[];
  stats: SeatAvailabilityStats | null;
  notifications: SeatHoldNotification[];
  connect: (eventId: string) => Promise<void>;
  disconnect: () => void;
  updateSeatLocally: (seatUpdate: SeatUpdateMessage) => void;
  clearNotifications: () => void;
  connectionError: string | null;
}

export const useSeatWebSocket = (initialSeats: Seat[] = []): UseSeatWebSocketResult => {
  const [isConnected, setIsConnected] = useState(false);
  const [seats, setSeats] = useState<Seat[]>(initialSeats);
  const [stats, setStats] = useState<SeatAvailabilityStats | null>(null);
  const [notifications, setNotifications] = useState<SeatHoldNotification[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Update local seat state based on WebSocket message
  const updateSeatLocally = useCallback((seatUpdate: SeatUpdateMessage) => {
    setSeats(prevSeats => {
      return prevSeats.map(seat => {
        if (seat.seatId === seatUpdate.seatId) {
          return {
            ...seat,
            isAvailable: seatUpdate.isAvailable,
            isBlocked: seatUpdate.isBlocked,
            holdExpiresAt: seatUpdate.isHeld ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : undefined,
            heldByUser: seatUpdate.isHeld ? 'current_user' : undefined // This should be set properly based on auth context
          };
        }
        return seat;
      });
    });
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async (eventId: string): Promise<void> => {
    try {
      setConnectionError(null);
      
      const callbacks: WebSocketCallbacks = {
        onConnect: () => {
          console.log('WebSocket connected for event:', eventId);
          setIsConnected(true);
          setConnectionError(null);
        },
        
        onDisconnect: () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
        },
        
        onError: (error) => {
          console.error('WebSocket error:', error);
          setConnectionError('WebSocket connection failed. Please try again.');
          setIsConnected(false);
        },
        
        onSeatUpdate: (seatUpdate: SeatUpdateMessage) => {
          console.log('Received seat update:', seatUpdate);
          updateSeatLocally(seatUpdate);
        },
        
        onStatsUpdate: (statsUpdate: SeatAvailabilityStats) => {
          console.log('Received stats update:', statsUpdate);
          setStats(statsUpdate);
        },
        
        onHoldNotification: (notification: SeatHoldNotification) => {
          console.log('Received hold notification:', notification);
          setNotifications(prev => [...prev, notification]);
          
          // Auto-remove notification after 5 seconds
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n !== notification));
          }, 5000);
        }
      };

      await seatWebSocketService.connect(eventId, callbacks);
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setConnectionError('Failed to connect to real-time updates.');
      throw error;
    }
  }, [updateSeatLocally]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    seatWebSocketService.disconnect();
    setIsConnected(false);
    setConnectionError(null);
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Update seats when initialSeats prop changes
  useEffect(() => {
    setSeats(initialSeats);
  }, [initialSeats]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    seats,
    stats,
    notifications,
    connect,
    disconnect,
    updateSeatLocally,
    clearNotifications,
    connectionError
  };
};

export default useSeatWebSocket;