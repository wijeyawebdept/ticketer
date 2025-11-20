import api from './api';

export interface RecycleBinItem {
  recycleId: string;
  entityType: 'USER' | 'EVENT' | 'VENUE';
  entityId: string;
  entityName: string;
  entityData: any;
  deletedBy: string;
  deletedAt: string;
  reason: string | null;
}

export interface SoftDeleteRequest {
  entityType: 'USER' | 'EVENT' | 'VENUE';
  entityId: string;
  entityName: string;
  entityData: any;
  reason?: string;
}

class RecycleBinService {
  /**
   * Get the base path based on user role
   */
  private getBasePath(): string {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'ORGANIZER' || user.role === 'ROLE_ORGANIZER') {
          return '/api/organizer';
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    return '/api/admin';
  }

  /**
   * Move an item to the recycle bin (soft delete)
   */
  async moveToRecycleBin(request: SoftDeleteRequest): Promise<RecycleBinItem> {
    const basePath = this.getBasePath();
    const response = await api.post<RecycleBinItem>(`${basePath}/recycle-bin`, request);
    return response.data;
  }

  /**
   * Get all items from the recycle bin
   */
  async getAllRecycleBinItems(): Promise<RecycleBinItem[]> {
    const basePath = this.getBasePath();
    const response = await api.get<RecycleBinItem[]>(`${basePath}/recycle-bin`);
    return response.data;
  }

  /**
   * Get recycle bin items by entity type
   */
  async getRecycleBinItemsByType(entityType: 'USER' | 'EVENT' | 'VENUE' | 'SCHEDULE'): Promise<RecycleBinItem[]> {
    const basePath = this.getBasePath();
    const response = await api.get<RecycleBinItem[]>(`${basePath}/recycle-bin/type/${entityType}`);
    return response.data;
  }

  /**
   * Get a single recycle bin item by ID
   */
  async getRecycleBinItemById(recycleId: string): Promise<RecycleBinItem> {
    const basePath = this.getBasePath();
    const response = await api.get<RecycleBinItem>(`${basePath}/recycle-bin/${recycleId}`);
    return response.data;
  }

  /**
   * Restore an item from the recycle bin
   */
  async restore(recycleId: string): Promise<RecycleBinItem> {
    const basePath = this.getBasePath();
    const response = await api.post<RecycleBinItem>(`${basePath}/recycle-bin/${recycleId}/restore`);
    return response.data;
  }

  /**
   * Permanently delete an item from the recycle bin
   * For admins: requires SUPER_ADMIN role
   * For organizers: deletes their own items
   */
  async permanentlyDelete(recycleId: string, reason?: string): Promise<void> {
    const basePath = this.getBasePath();
    await api.delete(`${basePath}/recycle-bin/${recycleId}`, {
      params: { reason },
    });
  }

  /**
   * Empty the entire recycle bin
   * For admins: requires SUPER_ADMIN role
   * For organizers: empties their own items only
   */
  async emptyRecycleBin(): Promise<void> {
    const basePath = this.getBasePath();
    await api.delete(`${basePath}/recycle-bin/empty`);
  }

  /**
   * Empty recycle bin for a specific entity type
   * For admins: requires SUPER_ADMIN role
   * For organizers: empties their own items of this type only
   */
  async emptyRecycleBinByType(entityType: 'USER' | 'EVENT' | 'VENUE'): Promise<void> {
    const basePath = this.getBasePath();
    await api.delete(`${basePath}/recycle-bin/empty/type/${entityType}`);
  }
}

const recycleBinService = new RecycleBinService();
export default recycleBinService;
