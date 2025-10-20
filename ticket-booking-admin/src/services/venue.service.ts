import api from './api';
import { Venue } from '../types';

export const VenueService = {
  // Get all venues
  getAllVenues: async (isAdmin: boolean = true): Promise<Venue[]> => {
    const endpoint = isAdmin ? '/api/admin/venues' : '/api/organizer/venues';
    const response = await api.get(endpoint);
    return response.data as Venue[];
  },

  // Get venue by ID
  getVenueById: async (id: string, isAdmin: boolean = true): Promise<Venue> => {
    const endpoint = isAdmin ? `/api/admin/venues/${id}` : `/api/organizer/venues/${id}`;
    const response = await api.get(endpoint);
    return response.data as Venue;
  },

  // Create new venue
  createVenue: async (venueData: Partial<Venue>, isAdmin: boolean = true): Promise<Venue> => {
    const endpoint = isAdmin ? '/api/admin/venues' : '/api/organizer/venues';
    const response = await api.post(endpoint, venueData);
    return response.data as Venue;
  },

  // Update venue
  updateVenue: async (id: string, venueData: Partial<Venue>, isAdmin: boolean = true): Promise<Venue> => {
    const endpoint = isAdmin ? `/api/admin/venues/${id}` : `/api/organizer/venues/${id}`;
    const response = await api.put(endpoint, venueData);
    return response.data as Venue;
  },

  // Delete venue
  deleteVenue: async (id: string, isAdmin: boolean = true): Promise<void> => {
    const endpoint = isAdmin ? `/api/admin/venues/${id}` : `/api/organizer/venues/${id}`;
    
    try {
      console.log('Deleting venue at endpoint:', endpoint);
      await api.delete(endpoint);
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
  getSeatingArrangement: async (venueId: string, isAdmin: boolean = true): Promise<any> => {
    const endpoint = isAdmin ? `/api/admin/venues/${venueId}/seating` : `/api/organizer/venues/${venueId}/seating`;
    const response = await api.get(endpoint);
    return response.data;
  },

  // Update seating arrangement for a venue
  updateSeatingArrangement: async (venueId: string, seatingLayout: any, isAdmin: boolean = true): Promise<any> => {
    const endpoint = isAdmin ? `/api/admin/venues/${venueId}/seating` : `/api/organizer/venues/${venueId}/seating`;
    // Ensure we're sending only the seating layout data, not the entire venue object
    const response = await api.put(endpoint, seatingLayout);
    return response.data;
  }
};