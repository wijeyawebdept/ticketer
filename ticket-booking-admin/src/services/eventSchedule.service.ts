import api from './api';
import { EventSchedule, EventScheduleRequest, ScheduleStatus } from '../types';

class EventScheduleService {
  private getBasePath(): string {
    // Check both sessionStorage and localStorage for user data
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    
    if (!userStr) {
      return '/api/admin';
    }
    
    try {
      const user = JSON.parse(userStr);
      const role = user.role;
      
      if (role === 'ORGANIZER' || role === 'ROLE_ORGANIZER' ||
          role === 'ORGANIZER_EMPLOYEE' || role === 'ROLE_ORGANIZER_EMPLOYEE') {
        return '/api/organizer';
      } else if (role === 'ADMIN' || role === 'ROLE_ADMIN' || role === 'SUPER_ADMIN' || role === 'ROLE_SUPER_ADMIN') {
        return '/api/admin';
      }
      // Default fallback if role doesn't match any known roles
      return '/api/admin';
    } catch (e) {
      return '/api/admin';
    }
  }

  async getSchedulesForEvent(eventId: string): Promise<EventSchedule[]> {
    const basePath = this.getBasePath();
    const response = await api.get<EventSchedule[]>(`${basePath}/events/${eventId}/schedules`);
    return response.data;
  }

  async getBookableSchedulesForEvent(eventId: string): Promise<EventSchedule[]> {
    const basePath = this.getBasePath();
    const response = await api.get<EventSchedule[]>(`${basePath}/events/${eventId}/schedules/bookable`);
    return response.data;
  }

  async getPublicBookableSchedulesForEvent(eventId: string): Promise<EventSchedule[]> {
    const response = await api.get<EventSchedule[]>(`/api/public/events/${eventId}/schedules/bookable`);
    return response.data;
  }

  async getScheduleById(eventId: string, scheduleId: string): Promise<EventSchedule> {
    const basePath = this.getBasePath();
    const response = await api.get<EventSchedule>(`${basePath}/events/${eventId}/schedules/${scheduleId}`);
    return response.data;
  }

  async createSchedule(eventId: string, request: EventScheduleRequest): Promise<EventSchedule> {
    const basePath = this.getBasePath();
    const response = await api.post<EventSchedule>(`${basePath}/events/${eventId}/schedules`, request);
    return response.data;
  }

  async updateSchedule(eventId: string, scheduleId: string, request: EventScheduleRequest): Promise<EventSchedule> {
    const basePath = this.getBasePath();
    const response = await api.put<EventSchedule>(`${basePath}/events/${eventId}/schedules/${scheduleId}`, request);
    return response.data;
  }

  async deleteSchedule(eventId: string, scheduleId: string): Promise<void> {
    const basePath = this.getBasePath();
    await api.delete(`${basePath}/events/${eventId}/schedules/${scheduleId}`);
  }

  async restoreSchedule(eventId: string, scheduleId: string): Promise<void> {
    const basePath = this.getBasePath();
    await api.post(`${basePath}/events/${eventId}/schedules/${scheduleId}/restore`);
  }

  async permanentlyDeleteSchedule(eventId: string, scheduleId: string): Promise<void> {
    const basePath = this.getBasePath();
    await api.delete(`${basePath}/events/${eventId}/schedules/${scheduleId}/permanent`);
  }

  async changeScheduleStatus(eventId: string, scheduleId: string, status: ScheduleStatus): Promise<EventSchedule> {
    const basePath = this.getBasePath();
    const response = await api.patch<EventSchedule>(
      `${basePath}/events/${eventId}/schedules/${scheduleId}/status?status=${status}`
    );
    return response.data;
  }

  async getSchedulesByDateRange(eventId: string, startDate: string, endDate: string): Promise<EventSchedule[]> {
    const basePath = this.getBasePath();
    const response = await api.get<EventSchedule[]>(
      `${basePath}/events/${eventId}/schedules/range?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  }

  async getTotalCapacity(eventId: string): Promise<number> {
    const basePath = this.getBasePath();
    const response = await api.get<number>(`${basePath}/events/${eventId}/schedules/total-capacity`);
    return response.data;
  }

  async getTotalAvailableSeats(eventId: string): Promise<number> {
    const basePath = this.getBasePath();
    const response = await api.get<number>(`${basePath}/events/${eventId}/schedules/total-available`);
    return response.data;
  }
}

const eventScheduleService = new EventScheduleService();
export default eventScheduleService;
