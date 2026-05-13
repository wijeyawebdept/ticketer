import api from './api';

export interface AuditLog {
  auditId: string;
  performedBy?: string;
  performedByName?: string;
  performedByEmail?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: string;
  newValues?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface AuditLogResponse {
  status: string;
  data: AuditLog[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
}

class AuditLogService {
  async getAuditLogs(
    page: number = 0,
    size: number = 10,
    entityType?: string,
    action?: string
  ): Promise<AuditLogResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
      });

      if (entityType) {
        params.append('entityType', entityType);
      }
      if (action) {
        params.append('action', action);
      }

      const response = await api.get(`/api/admin/superadmin/audit-logs?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  async getAuditLogsByUser(
    userId: string,
    page: number = 0,
    size: number = 10
  ): Promise<AuditLogResponse> {
    try {
      const response = await api.get(`/api/admin/superadmin/audit-logs/user/${userId}`, {
        params: { page, size }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching audit logs for user:', error);
      throw error;
    }
  }
}

const auditLogService = new AuditLogService();
export default auditLogService;
