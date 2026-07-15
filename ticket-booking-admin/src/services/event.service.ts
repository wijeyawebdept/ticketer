import api from './api';
import { Event, TicketCategory, UserRole } from '../types';

// Updated interface to include ticket categories
interface EventCreateRequest {
  name: string;
  description: string;
  venueId: string;
  totalCapacity: number;
  imageUrl?: string;
  ticketCategories?: TicketCategory[]; // Added ticket categories
  schedules?: any[]; // Added schedules
}

interface EventUpdateRequest {
  name?: string;
  description?: string;
  startDateTime?: string;
  endDateTime?: string;
  venueId?: string;
  totalCapacity?: number;
  status?: string;
  imageUrl?: string;
}

class EventService {
  // Helper method to get the base path based on user role
  private getBasePath(): string {
    // Check both sessionStorage and localStorage for user data
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === UserRole.ORGANIZER || user.role === 'ROLE_ORGANIZER' ||
            user.role === UserRole.ORGANIZER_EMPLOYEE || user.role === 'ROLE_ORGANIZER_EMPLOYEE') {
          return '/api/organizer';
        }
      } catch (e) {
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

  // Public endpoint - no authentication required
  async getPublicEventById(id: string): Promise<Event> {
    const response = await api.get<Event>(`/api/public/events/${id}`);
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

  async requestEventCreation(eventData: EventCreateRequest): Promise<Event> {
    const basePath = this.getBasePath();
    const response = await api.post<Event>(`${basePath}/events/request`, eventData);
    return response.data;
  }

  async getPendingEvents(page: number = 0, size: number = 20): Promise<any> {
    const response = await api.get<any>(`/api/admin/events/pending?page=${page}&size=${size}`);
    return response.data;
  }

  async approveEventRequest(eventId: string): Promise<Event> {
    const response = await api.patch<Event>(`/api/admin/events/${eventId}/approve`);
    return response.data;
  }

  async rejectEventRequest(eventId: string, feedback: string): Promise<Event> {
    const response = await api.patch<Event>(`/api/admin/events/${eventId}/reject`, { feedback });
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
    const response = await api.patch<Event>(`${basePath}/events/${id}/status?status=${status}`);
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

  async getOrganizerEvents(): Promise<Event[]> {
    const response = await api.get<any>('/api/organizer/events');
    // Backend returns Page<EventResponse>, extract content array
    return response.data.content || [];
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

  // Public event methods (no authentication required)
  async getPublishedEvents(page: number = 0, size: number = 20, categoryId?: string): Promise<any> {
    const categoryParam = categoryId ? `&categoryId=${categoryId}` : '';
    const response = await api.get<any>(`/api/public/events?page=${page}&size=${size}${categoryParam}`);
    return response.data;
  }

  async getUpcomingPublishedEvents(page: number = 0, size: number = 20): Promise<any> {
    const response = await api.get<any>(`/api/public/events/upcoming?page=${page}&size=${size}`);
    return response.data;
  }

  async getPublishedEventById(eventId: string): Promise<Event> {
    const response = await api.get<Event>(`/api/public/events/${eventId}`);
    return response.data;
  }

  async searchPublishedEvents(query: string, page: number = 0, size: number = 20): Promise<any> {
    const response = await api.get<any>(`/api/public/events/search?query=${encodeURIComponent(query)}&page=${page}&size=${size}`);
    return response.data;
  }

  async togglePublishStatus(eventId: string, publish: boolean): Promise<Event> {
    const basePath = this.getBasePath();
    const response = await api.patch<Event>(`${basePath}/events/${eventId}/publish?publish=${publish}`);
    return response.data;
  }

  /**
   * Get events by organizer ID (admin only)
   */
  async getEventsByOrganizer(organizerId: string, page: number = 0, size: number = 10): Promise<any> {
    const response = await api.get<any>(`/api/admin/events/by-organizer/${organizerId}?page=${page}&size=${size}`);
    return response.data;
  }

  async activateEvent(eventId: string): Promise<Event> {
    const response = await api.put<Event>(`/api/admin/events/${eventId}/activate`);
    return response.data;
  }

  async deactivateEvent(eventId: string): Promise<Event> {
    const response = await api.put<Event>(`/api/admin/events/${eventId}/deactivate`);
    return response.data;
  }
}

const eventService = new EventService();
export default eventService;
