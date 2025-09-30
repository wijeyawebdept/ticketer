import api from './api';
import { Booking, BookingStatus } from '../types';

class BookingService {
  async getAllBookings(): Promise<Booking[]> {
    const response = await api.get<Booking[]>('/api/admin/bookings');
    return response.data;
  }

  async getBookingById(id: string): Promise<Booking> {
    const response = await api.get<Booking>(`/api/admin/bookings/${id}`);
    return response.data;
  }

  async changeBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
    const response = await api.patch<Booking>(`/api/admin/bookings/${id}/status`, { status });
    return response.data;
  }

  async getBookingsForEvent(eventId: string): Promise<Booking[]> {
    const response = await api.get<Booking[]>(`/api/admin/events/${eventId}/bookings`);
    return response.data;
  }

  async getBookingsForUser(userId: string): Promise<Booking[]> {
    const response = await api.get<Booking[]>(`/api/admin/users/${userId}/bookings`);
    return response.data;
  }

  async cancelBooking(id: string): Promise<Booking> {
    const response = await api.patch<Booking>(`/api/admin/bookings/${id}/cancel`);
    return response.data;
  }
}

const bookingService = new BookingService();
export default bookingService;