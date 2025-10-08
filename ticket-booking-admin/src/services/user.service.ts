import api from './api';
import { User, UserCreateRequest, UserUpdateRequest } from '../types';

// Define the paginated response interface
interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

class UserService {
  async getAllUsers(): Promise<User[]> {
    console.log('🔍 Fetching users from API...');
    const response = await api.get<PaginatedResponse<User>>('/api/admin/users');
    console.log('📊 Raw API response:', response.data);
    console.log('👥 Users array from content:', response.data.content);
    console.log('📈 Total elements:', response.data.totalElements);
    
    // Extract the users array from the paginated response
    return response.data.content || [];
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