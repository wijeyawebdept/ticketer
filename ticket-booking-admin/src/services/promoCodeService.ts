import api from './api';
import { PromoCode, PromoCodeRequest, ValidatePromoCodeRequest, ValidatePromoCodeResponse } from '../types';

class PromoCodeService {
  // ── Public / Checkout endpoints ─────────────────────────────────────
  async validatePromoCode(request: ValidatePromoCodeRequest): Promise<ValidatePromoCodeResponse> {
    const response = await api.post<ValidatePromoCodeResponse>('/api/public/promocodes/validate', request);
    return response.data;
  }

  // ── Admin endpoints ─────────────────────────────────────────────────
  async getAllPromoCodes(): Promise<PromoCode[]> {
    const response = await api.get<PromoCode[]>('/api/admin/promocodes');
    return response.data;
  }

  async createAdminPromoCode(request: PromoCodeRequest): Promise<PromoCode> {
    const response = await api.post<PromoCode>('/api/admin/promocodes', request);
    return response.data;
  }

  async updateAdminPromoCode(id: string, request: PromoCodeRequest): Promise<PromoCode> {
    const response = await api.put<PromoCode>(`/api/admin/promocodes/${id}`, request);
    return response.data;
  }

  async toggleAdminPromoCodeStatus(id: string): Promise<PromoCode> {
    const response = await api.patch<PromoCode>(`/api/admin/promocodes/${id}/toggle`);
    return response.data;
  }

  async deleteAdminPromoCode(id: string): Promise<void> {
    await api.delete(`/api/admin/promocodes/${id}`);
  }

  // ── Organizer endpoints ─────────────────────────────────────────────
  async getOrganizerPromoCodes(): Promise<PromoCode[]> {
    const response = await api.get<PromoCode[]>('/api/organizer/promocodes');
    return response.data;
  }

  async createOrganizerPromoCode(request: PromoCodeRequest): Promise<PromoCode> {
    const response = await api.post<PromoCode>('/api/organizer/promocodes', request);
    return response.data;
  }

  async updateOrganizerPromoCode(id: string, request: PromoCodeRequest): Promise<PromoCode> {
    const response = await api.put<PromoCode>(`/api/organizer/promocodes/${id}`, request);
    return response.data;
  }

  async toggleOrganizerPromoCodeStatus(id: string): Promise<PromoCode> {
    const response = await api.patch<PromoCode>(`/api/organizer/promocodes/${id}/toggle`);
    return response.data;
  }

  async deleteOrganizerPromoCode(id: string): Promise<void> {
    await api.delete(`/api/organizer/promocodes/${id}`);
  }
}

const promoCodeService = new PromoCodeService();
export default promoCodeService;
