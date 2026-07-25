import api from './api';
import { EventCategory, EventCategoryRequest } from '../types';

class EventCategoryService {
  private getBasePath(): string {
    // Always use admin path since only admins can manage categories
    return '/api/admin';
  }

  async getAllCategories(): Promise<EventCategory[]> {
    const basePath = this.getBasePath();
    const response = await api.get<EventCategory[]>(`${basePath}/event-categories`);
    return response.data;
  }

  async getActiveCategories(): Promise<EventCategory[]> {
    const basePath = this.getBasePath();
    const response = await api.get<EventCategory[]>(`${basePath}/event-categories/active`);
    return response.data;
  }

  // Public method for fetching active categories (no auth required)
  async getPublicActiveCategories(): Promise<EventCategory[]> {
    const response = await api.get<EventCategory[]>('/api/public/event-categories/active');
    return response.data;
  }

  async getCategoryById(id: string): Promise<EventCategory> {
    const basePath = this.getBasePath();
    const response = await api.get<EventCategory>(`${basePath}/event-categories/${id}`);
    return response.data;
  }

  // Public method for fetching category by ID (no auth required)
  async getPublicCategoryById(id: string): Promise<EventCategory> {
    const response = await api.get<EventCategory>(`/api/public/event-categories/${id}`);
    return response.data;
  }

  async createCategory(request: EventCategoryRequest): Promise<EventCategory> {
    const basePath = this.getBasePath();
    const response = await api.post<EventCategory>(`${basePath}/event-categories`, request);
    return response.data;
  }

  async updateCategory(id: string, request: EventCategoryRequest): Promise<EventCategory> {
    const basePath = this.getBasePath();
    const response = await api.put<EventCategory>(`${basePath}/event-categories/${id}`, request);
    return response.data;
  }

  async deleteCategory(id: string): Promise<void> {
    const basePath = this.getBasePath();
    await api.delete(`${basePath}/event-categories/${id}`);
  }

  async softDeleteCategory(id: string): Promise<void> {
    const basePath = this.getBasePath();
    await api.delete(`${basePath}/event-categories/${id}/soft`);
  }

  async restoreCategory(id: string): Promise<void> {
    const basePath = this.getBasePath();
    await api.patch(`${basePath}/event-categories/${id}/restore`);
  }

  async bulkOperation(categoryIds: string[], operation: 'ACTIVATE' | 'DEACTIVATE' | 'DELETE' | 'RESTORE'): Promise<{ successful: number; failed: number; message: string }> {
    const basePath = this.getBasePath();
    const response = await api.post<{ successful: number; failed: number; message: string }>(`${basePath}/event-categories/bulk-operation`, {
      categoryIds,
      operation
    });
    return response.data;
  }

  async activateCategory(id: string): Promise<EventCategory> {
    const basePath = this.getBasePath();
    const response = await api.patch<EventCategory>(`${basePath}/event-categories/${id}/activate`);
    return response.data;
  }

  async deactivateCategory(id: string): Promise<EventCategory> {
    const basePath = this.getBasePath();
    const response = await api.patch<EventCategory>(`${basePath}/event-categories/${id}/deactivate`);
    return response.data;
  }
}

const eventCategoryService = new EventCategoryService();
export default eventCategoryService;
