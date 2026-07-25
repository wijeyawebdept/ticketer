import api from './api';

export interface BannerResponse {
  bannerId: string;
  title: string;
  description: string;
  imageUrl: string;

  displayOrder: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface BannerListResponse {
  content: BannerResponse[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
  pageSize: number;
}

class BannerService {
  private baseUrl = '/api/admin/banners';

  // Get all active banners (public) - lightweight list
  async getActiveBanners(): Promise<BannerResponse[]> {
    try {
      // Add timestamp to break browser cache and ensure fresh data
      const cacheBreaker = new Date().getTime();
      const response = await api.get<BannerResponse[]>(
        `${this.baseUrl}?t=${cacheBreaker}`
      );
      return response.data || [];
    } catch (error) {
      throw error;
    }
  }

  // Get all banners with pagination (admin only)
  async getAllBanners(page: number = 0, pageSize: number = 10): Promise<BannerListResponse> {
    try {
      const response = await api.get<BannerListResponse>(
        `${this.baseUrl}/all?page=${page}&size=${pageSize}`
      );
      return response.data || { content: [], totalPages: 0, totalElements: 0, currentPage: 0, pageSize: 0 };
    } catch (error) {
      throw error;
    }
  }

  // Get banners by status (admin only)
  async getBannersByStatus(status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'): Promise<BannerResponse[]> {
    try {
      const response = await api.get<BannerResponse[]>(`${this.baseUrl}/status/${status}`);
      return response.data || [];
    } catch (error) {
      throw error;
    }
  }

  // Get single banner by ID (public)
  async getBannerById(bannerId: string): Promise<BannerResponse> {
    try {
      const response = await api.get<BannerResponse>(`${this.baseUrl}/${bannerId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Create banner with image (admin only)
  async createBanner(
    title: string,
    description: string,
    imageFile: File,
    displayOrder: number = 0
  ): Promise<BannerResponse> {
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('imageFile', imageFile);
      formData.append('displayOrder', displayOrder.toString());

      const response = await api.post<BannerResponse>(`${this.baseUrl}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Update banner with optional new image (admin only)
  async updateBanner(
    bannerId: string,
    title?: string,
    description?: string,
    imageFile?: File,
    displayOrder?: number
  ): Promise<BannerResponse> {
    try {
      const formData = new FormData();
      if (title !== undefined) formData.append('title', title);
      if (description !== undefined) formData.append('description', description);
      if (imageFile) formData.append('imageFile', imageFile);
      if (displayOrder !== undefined) formData.append('displayOrder', displayOrder.toString());

      const response = await api.put<BannerResponse>(`${this.baseUrl}/${bannerId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Delete banner (admin only)
  async deleteBanner(bannerId: string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${bannerId}`);
    } catch (error) {
      throw error;
    }
  }

  // Change banner status (admin only)
  async updateBannerStatus(
    bannerId: string,
    status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
  ): Promise<BannerResponse> {
    try {
      const response = await api.put<BannerResponse>(
        `${this.baseUrl}/${bannerId}/status/${status}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Reorder banners (admin only)
  async reorderBanners(bannerIds: string[]): Promise<void> {
    try {
      await api.post(`${this.baseUrl}/reorder`, { bannerIds });
    } catch (error) {
      throw error;
    }
  }
}

const bannerService = new BannerService();
export default bannerService;
