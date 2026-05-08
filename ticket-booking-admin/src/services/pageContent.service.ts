import api from './api';

export interface PageContentResponse {
  contentId: string;
  pageType: 'PRIVACY_POLICY' | 'COOKIE_POLICY' | 'TERMS_AND_CONDITIONS' | 'FAQ' | 'REFUND_POLICY';
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

class PageContentService {
  private baseUrl = '/api/pages';
  private adminBaseUrl = '/api/admin/pages';

  // Get page content (public - no authentication required)
  async getPageContent(pageType: string): Promise<PageContentResponse> {
    try {
      const response = await api.get<PageContentResponse>(
        `${this.baseUrl}/${pageType}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Update page content (admin only)
  async updatePageContent(
    pageType: string,
    title: string,
    content: string
  ): Promise<PageContentResponse> {
    try {
      const response = await api.put<PageContentResponse>(
        `${this.adminBaseUrl}/${pageType}`,
        { pageType, title, content }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default new PageContentService();
