import api from './api';
import { Venue, UserRole } from '../types';

// Helper function to get the base path based on user role
const getBasePath = (): string => {
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
      console.error('Error parsing user role:', e);
    }
  }
  return '/api/admin';
};

export const VenueService = {
  // Get all venues
  getAllVenues: async (): Promise<Venue[]> => {
    const basePath = getBasePath();
    const response = await api.get(`${basePath}/venues`);
    return response.data as Venue[];
  },

  // Get venue by ID
  getVenueById: async (id: string): Promise<Venue> => {
    const basePath = getBasePath();
    const response = await api.get(`${basePath}/venues/${id}`);
    return response.data as Venue;
  },

  // Create new venue
  createVenue: async (venueData: Partial<Venue>): Promise<Venue> => {
    const basePath = getBasePath();
    const response = await api.post(`${basePath}/venues`, venueData);
    return response.data as Venue;
  },

  // Update venue
  updateVenue: async (id: string, venueData: Partial<Venue>): Promise<Venue> => {
    const basePath = getBasePath();
    const response = await api.put(`${basePath}/venues/${id}`, venueData);
    return response.data as Venue;
  },

  // Delete venue
  deleteVenue: async (id: string): Promise<void> => {
    const basePath = getBasePath();
    
    try {
      console.log('Deleting venue at endpoint:', `${basePath}/venues/${id}`);
      await api.delete(`${basePath}/venues/${id}`);
    } catch (error: any) {
      console.error('VenueService.deleteVenue error:', error);
      
      // Re-throw with more context
      if (error.response?.status === 500) {
        throw new Error('500: Internal server error - venue may have associated data preventing deletion');
      } else if (error.response?.status === 403) {
        throw new Error('403: Forbidden - insufficient permissions');
      } else if (error.response?.status === 404) {
        throw new Error('404: Venue not found');
      } else {
        throw new Error(error.message || 'Failed to delete venue');
      }
    }
  },

  // Get seating arrangement for a venue
  getSeatingArrangement: async (venueId: string): Promise<any> => {
    const basePath = getBasePath();
    const response = await api.get(`${basePath}/venues/${venueId}/seating`);
    return response.data;
  },

  // Update seating arrangement for a venue
  updateSeatingArrangement: async (venueId: string, seatingLayout: any): Promise<any> => {
    const basePath = getBasePath();
    // Ensure we're sending only the seating layout data, not the entire venue object
    const response = await api.put(`${basePath}/venues/${venueId}/seating`, seatingLayout);
    return response.data;
  },

  // Toggle venue status (active/inactive)
  toggleVenueStatus: async (id: string): Promise<Venue> => {
    const response = await api.patch(`/api/admin/venues/${id}/toggle-status`);
    return response.data as Venue;
  }
};