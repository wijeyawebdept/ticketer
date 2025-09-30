import api from './api';
import { User, UserCreateRequest, UserUpdateRequest } from '../types';

class UserService {
  async getAllUsers(): Promise<User[]> {
    const response = await api.get<User[]>('/api/admin/users');
    return response.data;
  }

  async getUserById(id: string): Promise<User> {
    const response = await api.get<User>(`/api/admin/users/${id}`);
    return response.data;
  }

  async createUser(userData: UserCreateRequest): Promise<User> {
    const response = await api.post<User>('/api/admin/users', userData);
    return response.data;
  }

  async updateUser(id: string, userData: UserUpdateRequest): Promise<User> {
    const response = await api.put<User>(`/api/admin/users/${id}`, userData);
    return response.data;
  }

  async toggleUserStatus(id: string): Promise<User> {
    const response = await api.patch<User>(`/api/admin/users/${id}/toggle-status`);
    return response.data;
  }

  async changeUserRole(id: string, role: string): Promise<User> {
    const response = await api.patch<User>(`/api/admin/users/${id}/role`, { role });
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/api/admin/users/${id}`);
  }
}

const userService = new UserService();
export default userService;