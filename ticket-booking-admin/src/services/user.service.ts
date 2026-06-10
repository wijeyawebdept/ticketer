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

// User detail response interfaces
export interface BookingSummary {
  bookingId: string;
  eventName: string;
  bookingDate: string;
  status: string;
  totalAmount: number;
  ticketCount: number;
}

export interface ActivityLog {
  action: string;
  timestamp: string;
  description: string;
}

export interface UserDetailResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth?: string;
  role: string;
  active: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  totalBookings: number;
  recentBookings: BookingSummary[];
  activityLogs: ActivityLog[];
}

// Bulk operation request interface
export interface BulkUserOperationRequest {
  userIds: string[];
  operation: 'ACTIVATE' | 'DEACTIVATE' | 'CHANGE_ROLE' | 'DELETE';
  newRole?: string;
}

export interface BulkOperationResponse {
  successful: number;
  failed: number;
  successfulIds: string[];
  errors: { userId: string; error: string }[];
  message: string;
}

class UserService {
  async getAllUsers(params?: {
    search?: string;
    role?: string;
    active?: boolean;
    page?: number;
    size?: number;
  }): Promise<User[]> {
    
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.active !== undefined) queryParams.append('active', String(params.active));
    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.size !== undefined) queryParams.append('size', String(params.size));
    
    const url = `/api/admin/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await api.get<PaginatedResponse<User>>(url);
    
    // Extract the users array from the paginated response
    return response.data.content || [];
  }

  async getUserById(id: string): Promise<User> {
    const response = await api.get<User>(`/api/admin/users/${id}`);
    return response.data;
  }
  
  async getUserDetails(id: string): Promise<UserDetailResponse> {
    const response = await api.get<UserDetailResponse>(`/api/admin/users/${id}/details`);
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

  async activateUser(id: string): Promise<User> {
    const response = await api.patch<User>(`/api/admin/users/${id}/activate`);
    return response.data;
  }

  async deactivateUser(id: string): Promise<User> {
    const response = await api.patch<User>(`/api/admin/users/${id}/deactivate`);
    return response.data;
  }
  
  async bulkOperation(request: BulkUserOperationRequest): Promise<BulkOperationResponse> {
    const response = await api.post<BulkOperationResponse>('/api/admin/users/bulk-operation', request);
    return response.data;
  }
}

const userService = new UserService();
export default userService;
