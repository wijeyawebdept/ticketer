import api from './api';
import { Event, TicketCategory } from '../types';

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
  async getAllEvents(): Promise<any> {
    const response = await api.get<any>('/api/admin/events');
    // Return the full response so the caller can handle Page responses
    return response.data;
  }

  async getEventById(id: string): Promise<Event> {
    const response = await api.get<Event>(`/api/admin/events/${id}`);
    return response.data;
  }

  async createEvent(eventData: EventCreateRequest): Promise<Event> {
    const response = await api.post<Event>('/api/admin/events', eventData);
    return response.data;
  }

  async updateEvent(id: string, eventData: EventUpdateRequest): Promise<Event> {
    const response = await api.put<Event>(`/api/admin/events/${id}`, eventData);
    return response.data;
  }

  async deleteEvent(id: string): Promise<void> {
    await api.delete(`/api/admin/events/${id}`);
  }

  async changeEventStatus(id: string, status: string): Promise<Event> {
    const response = await api.patch<Event>(`/api/admin/events/${id}/status`, { status });
    return response.data;
  }
  
  async uploadEventImage(id: string, formData: FormData): Promise<string> {
    const response = await api.post<{ imageUrl: string }>(
      `/api/admin/events/${id}/image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.imageUrl;
  }
}

export default new EventService();