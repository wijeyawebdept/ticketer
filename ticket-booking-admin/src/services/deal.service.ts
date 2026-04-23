import api from './api';
import { TicketCategoryDeal, TicketDealRequest } from '../types';

class DealService {
  // ── Public endpoints (no auth required) ────────────────────────────
  async getPublicDeals(): Promise<TicketCategoryDeal[]> {
    const response = await api.get<TicketCategoryDeal[]>('/api/public/deals');
    return response.data;
  }

  async getPublicDealsForEvent(eventId: string): Promise<TicketCategoryDeal[]> {
    const response = await api.get<TicketCategoryDeal[]>(`/api/public/deals/event/${eventId}`);
    return response.data;
  }

  async getAllCategoriesForEventPublic(eventId: string): Promise<TicketCategoryDeal[]> {
    const response = await api.get<TicketCategoryDeal[]>(`/api/public/deals/categories/${eventId}`);
    return response.data;
  }

  // ── Admin endpoints ─────────────────────────────────────────────────
  async getAdminAllDeals(): Promise<TicketCategoryDeal[]> {
    const response = await api.get<TicketCategoryDeal[]>('/api/admin/deals');
    return response.data;
  }

  async getAdminCategoriesForEvent(eventId: string): Promise<TicketCategoryDeal[]> {
    const response = await api.get<TicketCategoryDeal[]>(`/api/admin/deals/event/${eventId}`);
    return response.data;
  }

  async adminApplyDeal(request: TicketDealRequest): Promise<TicketCategoryDeal> {
    const response = await api.post<TicketCategoryDeal>('/api/admin/deals/apply', request);
    return response.data;
  }

  async adminRemoveDeal(categoryId: string): Promise<TicketCategoryDeal> {
    const response = await api.delete<TicketCategoryDeal>(`/api/admin/deals/${categoryId}`);
    return response.data;
  }

  // ── Organizer endpoints ─────────────────────────────────────────────
  async getOrganizerDeals(): Promise<TicketCategoryDeal[]> {
    const response = await api.get<TicketCategoryDeal[]>('/api/organizer/deals');
    return response.data;
  }

  async getOrganizerCategoriesForEvent(eventId: string): Promise<TicketCategoryDeal[]> {
    const response = await api.get<TicketCategoryDeal[]>(`/api/organizer/deals/event/${eventId}`);
    return response.data;
  }

  async organizerApplyDeal(request: TicketDealRequest): Promise<TicketCategoryDeal> {
    const response = await api.post<TicketCategoryDeal>('/api/organizer/deals/apply', request);
    return response.data;
  }

  async organizerRemoveDeal(categoryId: string): Promise<TicketCategoryDeal> {
    const response = await api.delete<TicketCategoryDeal>(`/api/organizer/deals/${categoryId}`);
    return response.data;
  }
}

const dealService = new DealService();
export default dealService;
