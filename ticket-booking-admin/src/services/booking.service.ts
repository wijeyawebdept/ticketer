import api from './api';
import { Booking, BookingStatus, UserRole } from '../types';

class BookingService {
  // Helper method to get the base path based on user role
  private getBasePath(): string {
    // Check both sessionStorage (admin) and localStorage (customer) for user data
    let userStr = sessionStorage.getItem('user');
    let storageType = 'sessionStorage';
    
    if (!userStr) {
      userStr = localStorage.getItem('user');
      storageType = 'localStorage';
    }
    
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        console.log('BookingService - User role from', storageType, ':', user.role);
        
        // Check for organizer roles
        if (user.role === UserRole.ORGANIZER || user.role === 'ROLE_ORGANIZER' ||
            user.role === UserRole.ORGANIZER_EMPLOYEE || user.role === 'ROLE_ORGANIZER_EMPLOYEE') {
          return '/api/organizer';
        }
        
        // Check for admin roles
        if (user.role === UserRole.ADMIN || user.role === 'ROLE_ADMIN' ||
            user.role === UserRole.SUPER_ADMIN || user.role === 'ROLE_SUPER_ADMIN' ||
            user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
          return '/api/admin';
        }
        
        // For regular customers, use /api (will be appended with /bookings to become /api/bookings)
        if (user.role === UserRole.USER || user.role === 'ROLE_USER' || user.role === 'USER') {
          return '/api';
        }
      } catch (e) {
        console.error('Error parsing user role:', e);
      }
    }
    
    // Default fallback to /api (will be appended with /bookings for endpoint path)
    console.warn('No user role found, defaulting to /api');
    return '/api';
  }

  async getAllBookings(): Promise<Booking[]> {
    const basePath = this.getBasePath();
    const response = await api.get<Booking[]>(`${basePath}/bookings`);
    return response.data;
  }

  async getBookingById(id: string): Promise<Booking> {
    const basePath = this.getBasePath();
    const response = await api.get<Booking>(`${basePath}/bookings/${id}`);
    return response.data;
  }

  async changeBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
    const basePath = this.getBasePath();
    const response = await api.patch<Booking>(`${basePath}/bookings/${id}/status`, { status });
    return response.data;
  }

  async getBookingsForEvent(eventId: string): Promise<Booking[]> {
    const basePath = this.getBasePath();
    const response = await api.get<Booking[]>(`${basePath}/bookings/event/${eventId}`);
    return response.data;
  }

  async getBookingsForUser(userId: string): Promise<Booking[]> {
    // User bookings might still be under admin routes
    const response = await api.get<Booking[]>(`/api/admin/users/${userId}/bookings`);
    return response.data;
  }

  async cancelBooking(id: string): Promise<Booking> {
    const basePath = this.getBasePath();
    const response = await api.put<Booking>(`${basePath}/bookings/${id}/cancel`, {});
    return response.data;
  }

  async markAsAttended(id: string): Promise<Booking> {
    const basePath = this.getBasePath();
    const response = await api.put<Booking>(`${basePath}/bookings/${id}/attend`, {});
    return response.data;
  }

  async getBookingStatistics(eventId?: string, period?: string): Promise<any> {
    const basePath = this.getBasePath();
    let url = `${basePath}/bookings/statistics`;
    const params = [];
    if (eventId) params.push(`eventId=${eventId}`);
    if (period) params.push(`period=${period}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    const response = await api.get(url);
    return response.data;
  }

  async getRecentBookings(count: number = 10): Promise<Booking[]> {
    const basePath = this.getBasePath();
    const response = await api.get<Booking[]>(`${basePath}/bookings/recent?count=${count}`);
    return response.data;
  }

  async getPendingBookings(): Promise<Booking[]> {
    const basePath = this.getBasePath();
    const response = await api.get<Booking[]>(`${basePath}/bookings/pending`);
    return response.data;
  }
}

const bookingService = new BookingService();
export default bookingService;