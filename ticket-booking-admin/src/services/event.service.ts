import api from './api';
import { Event } from '../types';

interface EventCreateRequest {
  name: string;
  description: string;
  eventDate: string;
  venueId: string;
  category: string;
  basePrice: number;
  imageUrl?: string;
}

interface EventUpdateRequest {
  name?: string;
  description?: string;
  eventDate?: string;
  venueId?: string;
  category?: string;
  basePrice?: number;
  imageUrl?: string;
  status?: string;
}

class EventService {
  async getAllEvents(): Promise<Event[]> {
    const response = await api.get<Event[]>('/api/admin/events');
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

const eventService = new EventService();
export default eventService;