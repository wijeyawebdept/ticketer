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
   * Move an item to the recycle bin (soft delete)
   */
  async moveToRecycleBin(request: SoftDeleteRequest): Promise<RecycleBinItem> {
    const response = await api.post<RecycleBinItem>('/admin/recycle-bin', request);
    return response.data;
  }

  /**
   * Get all items from the recycle bin
   */
  async getAllRecycleBinItems(): Promise<RecycleBinItem[]> {
    const response = await api.get<RecycleBinItem[]>('/admin/recycle-bin');
    return response.data;
  }

  /**
   * Get recycle bin items by entity type
   */
  async getRecycleBinItemsByType(entityType: 'USER' | 'EVENT' | 'VENUE'): Promise<RecycleBinItem[]> {
    const response = await api.get<RecycleBinItem[]>(`/admin/recycle-bin/type/${entityType}`);
    return response.data;
  }

  /**
   * Get a single recycle bin item by ID
   */
  async getRecycleBinItemById(recycleId: string): Promise<RecycleBinItem> {
    const response = await api.get<RecycleBinItem>(`/admin/recycle-bin/${recycleId}`);
    return response.data;
  }

  /**
   * Permanently delete an item from the recycle bin (requires SUPER_ADMIN role)
   */
  async permanentlyDelete(recycleId: string, reason?: string): Promise<void> {
    await api.delete(`/admin/recycle-bin/${recycleId}`, {
      params: { reason },
    });
  }

  /**
   * Empty the entire recycle bin (requires SUPER_ADMIN role)
   */
  async emptyRecycleBin(): Promise<void> {
    await api.delete('/admin/recycle-bin/empty');
  }

  /**
   * Empty recycle bin for a specific entity type (requires SUPER_ADMIN role)
   */
  async emptyRecycleBinByType(entityType: 'USER' | 'EVENT' | 'VENUE'): Promise<void> {
    await api.delete(`/admin/recycle-bin/empty/${entityType}`);
  }

  /**
   * Restore an item from the recycle bin (future feature)
   * This would require additional backend implementation
   */
  async restore(recycleId: string): Promise<void> {
    // TODO: Implement restore endpoint on backend
    throw new Error('Restore functionality not yet implemented');
  }
}

const recycleBinService = new RecycleBinService();
export default recycleBinService;
