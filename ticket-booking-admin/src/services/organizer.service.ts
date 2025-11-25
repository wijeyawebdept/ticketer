import api from './api';

export interface Organizer {
  organizerId: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  active: boolean;
  createdAt: string;
}

export interface PaginatedOrganizerResponse {
  content: Organizer[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

class OrganizerService {
  /**
   * Get all organizers (admin only)
   */
  async getAllOrganizers(
    page: number = 0,
    size: number = 100
  ): Promise<PaginatedOrganizerResponse> {
    const response = await api.get<PaginatedOrganizerResponse>(
      `/api/admin/organizers?page=${page}&size=${size}&sort=organizationName,asc`
    );
    return response.data;
  }

  /**
   * Get organizer by ID
   */
  async getOrganizerById(organizerId: string): Promise<Organizer> {
    const response = await api.get<Organizer>(`/api/admin/organizers/${organizerId}`);
    return response.data;
  }
}

const organizerService = new OrganizerService();
export default organizerService;
