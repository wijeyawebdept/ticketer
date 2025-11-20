import api from './api';
import { Event, TicketCategory, UserRole } from '../types';

// Updated interface to include ticket categories
interface EventCreateRequest {
  name: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  venueId: string;
  basePrice: number;
  totalCapacity: number;
  imageUrl?: string;
  ticketCategories?: TicketCategory[]; // Added ticket categories
}

interface EventUpdateRequest {
  name?: string;
  description?: string;
  startDateTime?: string;
  endDateTime?: string;
  venueId?: string;
  basePrice?: number;
  totalCapacity?: number;
  status?: string;
  imageUrl?: string;
}

class EventService {
  // Helper method to get the base path based on user role
  private getBasePath(): string {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === UserRole.ORGANIZER || user.role === 'ROLE_ORGANIZER') {
          return '/api/organizer';
        }
      } catch (e) {
        console.error('Error parsing user role:', e);
      }
    }
    return '/api/admin';
  }

  async getAllEvents(): Promise<any> {
    const basePath = this.getBasePath();
    const response = await api.get<any>(`${basePath}/events`);
    // Return the full response so the caller can handle Page responses
    return response.data;
  }

  async getEventById(id: string): Promise<Event> {
    const basePath = this.getBasePath();
    const response = await api.get<Event>(`${basePath}/events/${id}`);
    return response.data;
  }

  async createEvent(eventData: EventCreateRequest): Promise<Event> {
    const basePath = this.getBasePath();
    const response = await api.post<Event>(`${basePath}/events`, eventData);
    return response.data;
  }

  async updateEvent(id: string, eventData: EventUpdateRequest): Promise<Event> {
    const basePath = this.getBasePath();
    const response = await api.put<Event>(`${basePath}/events/${id}`, eventData);
    return response.data;
  }

  async deleteEvent(id: string): Promise<void> {
    const basePath = this.getBasePath();
    await api.delete(`${basePath}/events/${id}`);
  }

  async moveToRecycleBin(id: string): Promise<void> {
    const basePath = this.getBasePath();
    await api.delete(`${basePath}/events/${id}/soft`);
  }

  async changeEventStatus(id: string, status: string): Promise<Event> {
    const basePath = this.getBasePath();
    const response = await api.patch<Event>(`${basePath}/events/${id}/change-status?status=${status}`);
    return response.data;
  }
  
  async uploadEventImage(id: string, formData: FormData): Promise<string> {
    const basePath = this.getBasePath();
    const response = await api.post<{ imageUrl: string }>(
      `${basePath}/events/${id}/image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.imageUrl;
  }

  async getActiveEvents(): Promise<any> {
    const basePath = this.getBasePath();
    const response = await api.get<any>(`${basePath}/events/active`);
    return response.data;
  }

  async getUpcomingEvents(): Promise<any> {
    const basePath = this.getBasePath();
    const response = await api.get<any>(`${basePath}/events/upcoming`);
    return response.data;
  }

  async getEventsByVenue(venueId: string): Promise<any> {
    const basePath = this.getBasePath();
    const response = await api.get<any>(`${basePath}/events/venue/${venueId}`);
    return response.data;
  }

  async getEventStatistics(eventId: string): Promise<any> {
    const basePath = this.getBasePath();
    const response = await api.get<any>(`${basePath}/events/${eventId}/statistics`);
    return response.data;
  }

  async togglePublishStatus(eventId: string, publish: boolean): Promise<Event> {
    const basePath = this.getBasePath();
    const response = await api.patch<Event>(`${basePath}/events/${eventId}/publish?publish=${publish}`);
    return response.data;
  }
}

export default new EventService();