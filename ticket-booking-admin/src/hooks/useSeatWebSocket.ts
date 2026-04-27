import { useState, useEffect, useCallback, useRef } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// Seat update message from WebSocket
export interface SeatUpdateMessage {
  seatId: string;
  section: string;
  rowNumber: string;
  seatNumber: string;
  isAvailable: boolean;
  isBlocked: boolean;
  isHeld: boolean;
  action: 'RESERVED' | 'UNBLOCKED' | 'HELD' | 'RELEASED' | 'BOOKED';
  timestamp: number;
  // Additional admin info
  userId?: number;
  userName?: string;
  userEmail?: string;
}

// Activity log entry for real-time feed
export interface SeatActivityLog {
  id: string;
  seatId: string;
  action: string;
  userName?: string;
  userEmail?: string;
  timestamp: Date;
  message: string;
}

// Stats message from WebSocket  
export interface SeatStatsMessage {
  totalSeats: number;
  availableSeats: number;
  bookedSeats: number;
  heldSeats: number;
  blockedSeats: number;
  timestamp: number;
}

// Derived at call-time so the hook works through tunnels (ngrok, etc.) as well
// as local development without any changes.
const getWsUrl = () => {
  // If explicitly configured, use that
  if (process.env.REACT_APP_WS_URL) {
    return process.env.REACT_APP_WS_URL;
  }
  
  // For development: connect directly to backend WebSocket
  // SockJS requires HTTP/HTTPS URLs, not WebSocket URLs
  if (process.env.NODE_ENV === 'development') {
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
    return `${protocol}://localhost:8081/ws`;
  }
  
  // For production: use the same host
  const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
  return `${protocol}://${window.location.host}/ws`;
};

export const useSeatWebSocket = (eventId: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [seats, setSeats] = useState<Record<string, SeatUpdateMessage>>({});
  const [activityLog, setActivityLog] = useState<SeatActivityLog[]>([]);
  const [stats, setStats] = useState<SeatStatsMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const clientRef = useRef<Client | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate activity message based on action
  const generateActivityMessage = (msg: SeatUpdateMessage): string => {
    const seatLabel = `${msg.section}-${msg.rowNumber}-${msg.seatNumber}`;
    const user = msg.userName || 'Someone';
    
    switch (msg.action) {
      case 'HELD':
        return `${user} started holding seat ${seatLabel}`;
      case 'RELEASED':
        return `Seat ${seatLabel} was released`;
      case 'BOOKED':
        return `${user} booked seat ${seatLabel}`;
      case 'RESERVED':
        return `Seat ${seatLabel} was reserved`;
      case 'UNBLOCKED':
        return `Seat ${seatLabel} was unblocked`;
      default:
        return `Seat ${seatLabel} status changed to ${msg.action}`;
    }
  };

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!eventId || clientRef.current?.active) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(getWsUrl()) as WebSocket,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => {
        if (process.env.NODE_ENV === 'development') {
        }
      },
      onConnect: () => {
        setIsConnected(true);
        setConnectionError(null);

        // Subscribe to seat updates for this event
        client.subscribe(`/topic/events/${eventId}/seats`, (message: IMessage) => {
          try {
            const seatUpdate: SeatUpdateMessage = JSON.parse(message.body);
            
            // Update seats state
            setSeats(prev => ({
              ...prev,
              [seatUpdate.seatId]: seatUpdate
            }));

            // Add to activity log
            const logEntry: SeatActivityLog = {
              id: `${seatUpdate.seatId}-${seatUpdate.timestamp}`,
              seatId: seatUpdate.seatId,
              action: seatUpdate.action,
              userName: seatUpdate.userName,
              userEmail: seatUpdate.userEmail,
              timestamp: new Date(seatUpdate.timestamp),
              message: generateActivityMessage(seatUpdate)
            };

            setActivityLog(prev => {
              // Keep only the last 50 entries
              const newLog = [logEntry, ...prev];
              return newLog.slice(0, 50);
            });
          } catch (error) {
          }
        });

        // Subscribe to stats updates
        client.subscribe(`/topic/events/${eventId}/stats`, (message: IMessage) => {
          try {
            const statsUpdate: SeatStatsMessage = JSON.parse(message.body);
            setStats(statsUpdate);
          } catch (error) {
          }
        });
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onStompError: (frame) => {
        setConnectionError('Connection error occurred');
        setIsConnected(false);
      },
      onWebSocketError: (event) => {
        setConnectionError('WebSocket connection failed');
        setIsConnected(false);
      }
    });

    clientRef.current = client;
    client.activate();
  }, [eventId]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
    }
    setIsConnected(false);
    setSeats({});
    setActivityLog([]);
    setStats(null);
  }, []);

  // Connect when eventId changes
  useEffect(() => {
    if (eventId) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      disconnect();
    };
  }, [eventId, connect, disconnect]);

  // Function to manually update seat status (for optimistic updates)
  const updateSeatStatus = useCallback((seatId: string, status: 'available' | 'reserved' | 'unavailable') => {
    setSeats(prev => ({
      ...prev,
      [seatId]: {
        ...prev[seatId],
        seatId,
        isAvailable: status === 'available',
        isBlocked: status === 'unavailable',
        isHeld: status === 'reserved',
        action: status === 'available' ? 'RELEASED' : status === 'reserved' ? 'HELD' : 'RESERVED',
        timestamp: Date.now()
      } as SeatUpdateMessage
    }));
  }, []);

  // Clear activity log
  const clearActivityLog = useCallback(() => {
    setActivityLog([]);
  }, []);

  return {
    isConnected,
    connectionError,
    seats,
    activityLog,
    stats,
    updateSeatStatus,
    clearActivityLog,
    reconnect: connect,
    disconnect
  };
};