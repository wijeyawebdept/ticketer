import axiosInstance from './api';
import {
  GateStaff,
  CreateGateStaffRequest,
  UpdateGateStaffRequest,
  GateStaffAssignment,
  AssignGateStaffRequest,
  Event,
} from '../types';

export const gateStaffService = {
  // Gate Staff Management
  getAllGateStaff: async (): Promise<GateStaff[]> => {
    const response = await axiosInstance.get<GateStaff[]>('/api/admin/gate-staff/all');
    return response.data;
  },

  getGateStaffPage: async (
    page: number = 0,
    size: number = 20,
    search?: string,
    active?: number
  ): Promise<{ content: GateStaff[]; totalElements: number; totalPages: number }> => {
    const params: Record<string, any> = { page, size };
    if (search && search.trim()) params.search = search.trim();
    if (active !== undefined && active !== null) params.active = active;

    const response = await axiosInstance.get<{ content: GateStaff[]; totalElements: number; totalPages: number }>('/api/admin/gate-staff', { params });
    return response.data;
  },

  getGateStaffById: async (id: string): Promise<GateStaff> => {
    const response = await axiosInstance.get<GateStaff>(`/api/admin/gate-staff/${id}`);
    return response.data;
  },

  createGateStaff: async (data: CreateGateStaffRequest): Promise<GateStaff> => {
    const response = await axiosInstance.post<GateStaff>('/api/admin/gate-staff', data);
    return response.data;
  },

  updateGateStaff: async (id: string, data: UpdateGateStaffRequest): Promise<GateStaff> => {
    const response = await axiosInstance.put<GateStaff>(`/api/admin/gate-staff/${id}`, data);
    return response.data;
  },

  toggleGateStaffStatus: async (id: string, active: number): Promise<{ success: boolean; active: number }> => {
    const response = await axiosInstance.patch<{ success: boolean; active: number }>(`/api/admin/gate-staff/${id}/status`, null, {
      params: { active },
    });
    return response.data;
  },

  deleteGateStaff: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.delete<{ success: boolean; message: string }>(`/api/admin/gate-staff/${id}`);
    return response.data;
  },

  // Gate Staff Assignments
  getAllAssignments: async (params?: {
    eventId?: string;
    scheduleId?: string;
    staffUserId?: string;
  }): Promise<GateStaffAssignment[]> => {
    const response = await axiosInstance.get<GateStaffAssignment[]>('/api/admin/gate-staff-assignments', {
      params,
    });
    return response.data;
  },

  assignGateStaff: async (data: AssignGateStaffRequest): Promise<GateStaffAssignment[]> => {
    const response = await axiosInstance.post<GateStaffAssignment[]>('/api/admin/gate-staff-assignments', data);
    return response.data;
  },

  updateAssignment: async (
    assignmentId: string,
    data: { staffUserId?: string; scheduleId?: string | null; isAllSchedules?: boolean; notes?: string }
  ): Promise<GateStaffAssignment> => {
    const response = await axiosInstance.put<GateStaffAssignment>(`/api/admin/gate-staff-assignments/${assignmentId}`, data);
    return response.data;
  },

  removeAssignment: async (assignmentId: string): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.delete<{ success: boolean; message: string }>(`/api/admin/gate-staff-assignments/${assignmentId}`);
    return response.data;
  },

  // Gate Staff Portal (for logged in Gate Staff)
  getMyAssignedEvents: async (): Promise<Event[]> => {
    const response = await axiosInstance.get<Event[]>('/api/gate/my-assignments');
    return response.data;
  },

  checkAssignment: async (eventId: string, scheduleId?: string): Promise<boolean> => {
    const response = await axiosInstance.get<boolean>('/api/gate/check-assignment', {
      params: { eventId, scheduleId },
    });
    return response.data;
  },
};

export default gateStaffService;
