import api from './api';
import { EventSchedule, EventScheduleRequest, ScheduleStatus } from '../types';
import AuthService from './auth.service';

class EventScheduleService {
  private getBasePath(): string {
    const user = AuthService.getCurrentUser();
    if (!user) return '/api/admin';
    
    const role = user.role;
    if (role === 'ORGANIZER' || role === 'ROLE_ORGANIZER') {
      return '/api/organizer';
    } else if (role === 'ADMIN' || role === 'ROLE_ADMIN' || role === 'SUPER_ADMIN' || role === 'ROLE_SUPER_ADMIN') {
      return '/api/admin';
    } else {
      return '/api/user';
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

export default new EventScheduleService();
