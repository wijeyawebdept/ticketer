import api from './api';
import { Role } from '../types';

export const RoleService = {
  /**
   * Fetch all roles (active roles only by default)
   */
  getAllRoles: async (): Promise<Role[]> => {
    const response = await api.get<Role[]>('/api/admin/roles');
    return response.data;
  },

  /**
   * Fetch a specific role by ID
   */
  getRoleById: async (roleId: string): Promise<Role> => {
    const response = await api.get<Role>(`/api/admin/roles/${roleId}`);
    return response.data;
  },

  /**
   * Create a new role (SUPER_ADMIN only)
   */
  createRole: async (roleData: Partial<Role>): Promise<Role> => {
    const response = await api.post<Role>('/api/admin/roles', roleData);
    return response.data;
  },

  /**
   * Update an existing role (SUPER_ADMIN only)
   */
  updateRole: async (roleId: string, roleData: Partial<Role>): Promise<Role> => {
    const response = await api.put<Role>(`/api/admin/roles/${roleId}`, roleData);
    return response.data;
  },

  /**
   * Delete a role (SUPER_ADMIN only, cannot delete system roles)
   */
  deleteRole: async (roleId: string): Promise<void> => {
    await api.delete(`/api/admin/roles/${roleId}`);
  },

  /**
   * Toggle role active status
   */
  toggleRoleStatus: async (roleId: string): Promise<Role> => {
    const response = await api.patch<Role>(`/api/admin/roles/${roleId}/toggle-status`);
    return response.data;
  },
};
