import api from './api';

export interface HandlingFeeSetting {
  handlingFee: number;
  isEnabled: boolean;
  description?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface HandlingFeeUpdateRequest {
  handlingFee: number;
  isEnabled?: boolean;
  description?: string;
}

class SystemSettingService {
  private publicBaseUrl = '/api/public/system-settings';
  private adminBaseUrl = '/api/admin/system-settings';

  async getHandlingFee(): Promise<HandlingFeeSetting> {
    try {
      const response = await api.get<HandlingFeeSetting>(`${this.publicBaseUrl}/handling-fee`);
      return response.data;
    } catch (error) {
      // Fallback default
      return {
        handlingFee: 100,
        isEnabled: true,
        description: 'Standard online booking and handling fee',
      };
    }
  }

  async updateHandlingFee(data: HandlingFeeUpdateRequest): Promise<HandlingFeeSetting> {
    const response = await api.put<HandlingFeeSetting>(`${this.adminBaseUrl}/handling-fee`, data);
    return response.data;
  }
}

const systemSettingService = new SystemSettingService();
export default systemSettingService;
