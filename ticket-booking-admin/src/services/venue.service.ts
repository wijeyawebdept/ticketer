import api from './api';
import { Venue } from '../types';

export const VenueService = {
  // Get all venues
  getAllVenues: async (): Promise<Venue[]> => {
    const response = await api.get('/venues');
    return response.data as Venue[];
  },

  // Get venue by ID
  getVenueById: async (id: string): Promise<Venue> => {
    const response = await api.get(`/venues/${id}`);
    return response.data as Venue;
  },

  // Create new venue
  createVenue: async (venueData: Partial<Venue>): Promise<Venue> => {
    const response = await api.post('/venues', venueData);
    return response.data as Venue;
  },

  // Update venue
  updateVenue: async (id: string, venueData: Partial<Venue>): Promise<Venue> => {
    const response = await api.put(`/venues/${id}`, venueData);
    return response.data as Venue;
  },

  // Delete venue
  deleteVenue: async (id: string): Promise<void> => {
    await api.delete(`/venues/${id}`);
  }
};