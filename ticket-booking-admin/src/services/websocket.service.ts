import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { SeatUpdateMessage, SeatHoldNotification, SeatAvailabilityStats } from './seat.service';

export interface WebSocketCallbacks {
  onSeatUpdate?: (message: SeatUpdateMessage) => void;
  onHoldNotification?: (notification: SeatHoldNotification) => void;
  onStatsUpdate?: (stats: SeatAvailabilityStats) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

class SeatWebSocketService {
  private client: Client | null = null;
  private isConnected = false;
  private eventId: string | null = null;
  private callbacks: WebSocketCallbacks = {};

  constructor() {
    this.client = new Client({
      // Use SockJS for better browser compatibility.
      // URL is built from window.location so it works both locally and through
      // tunnels like ngrok without any hardcoded hostnames.
      webSocketFactory: () => {
        const wsUrl = `${window.location.protocol}//${window.location.host}/ws`;
        return new SockJS(wsUrl);
      },
      
      // Connection settings
      connectHeaders: {},
      
      // Heartbeat settings
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      
      // Reconnection settings
      reconnectDelay: 5000,

      // Event handlers
      onConnect: (frame) => {
        this.isConnected = true;
        this.callbacks.onConnect?.();
        
        // Subscribe to event-specific topics if eventId is set
        if (this.eventId) {
          this.subscribeToEvent(this.eventId);
        }
      },

      onDisconnect: (frame) => {
        this.isConnected = false;
        this.callbacks.onDisconnect?.();
      },

      onStompError: (frame) => {
        this.callbacks.onError?.(frame);
      },

      onWebSocketError: (error) => {
        this.callbacks.onError?.(error);
      },

      debug: (str) => {
      }
    });
  }

  // Connect to WebSocket
  connect(eventId: string, callbacks: WebSocketCallbacks = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      this.eventId = eventId;
      this.callbacks = {
        ...callbacks,
        onConnect: () => {
          callbacks.onConnect?.();
          resolve();
        },
        onError: (error) => {
          callbacks.onError?.(error);
          reject(error);
        }
      };

      // Add authorization header if token exists
      const token = localStorage.getItem('auth_token');
      if (token) {
        this.client!.connectHeaders = {
          'Authorization': `Bearer ${token}`
        };
      }

      this.client?.activate();
    });
  }

  // Disconnect from WebSocket
  disconnect(): void {
    if (this.client) {
      this.client.deactivate();
      this.isConnected = false;
      this.eventId = null;
    }
  }

  // Subscribe to event-specific seat updates
  private subscribeToEvent(eventId: string): void {
    if (!this.client || !this.isConnected) {
      return;
    }

    // Subscribe to seat updates for this event
    this.client.subscribe(`/topic/events/${eventId}/seats`, (message: IMessage) => {
      try {
        const seatUpdate: SeatUpdateMessage = JSON.parse(message.body);
        this.callbacks.onSeatUpdate?.(seatUpdate);
      } catch (error) {
      }
    });

    // Subscribe to availability statistics
    this.client.subscribe(`/topic/events/${eventId}/stats`, (message: IMessage) => {
      try {
        const stats: SeatAvailabilityStats = JSON.parse(message.body);
        this.callbacks.onStatsUpdate?.(stats);
      } catch (error) {
      }
    });

    // Subscribe to personal seat hold notifications
    this.client.subscribe('/user/queue/seat-holds', (message: IMessage) => {
      try {
        const notification: SeatHoldNotification = JSON.parse(message.body);
        this.callbacks.onHoldNotification?.(notification);
      } catch (error) {
      }
    });
  }

  // Send a message (for testing purposes)
  sendMessage(destination: string, body: any): void {
    if (!this.client || !this.isConnected) {
      return;
    }

    this.client.publish({
      destination,
      body: JSON.stringify(body)
    });
  }

  // Update callbacks
  setCallbacks(callbacks: WebSocketCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Get current event ID
  getCurrentEventId(): string | null {
    return this.eventId;
  }
}

// Export singleton instance
export const seatWebSocketService = new SeatWebSocketService();
export default seatWebSocketService;