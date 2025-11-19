import api from './api';

export interface OrganizerEmployee {
  employeeId: string;
  organizerId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  employeePosition?: string;
  department?: string;
  isEmployee: boolean;
  isVerified: boolean;
  active: boolean;
  canCreateEmployees: boolean;
  parentOrganizerId?: string;
  organizationName?: string;
  organizationType?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface CreateEmployeeRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  organizerId?: string; // Set automatically by organizer controller
  employeePosition?: string;
  department?: string;
  hireDate?: string;
}

export interface UpdateEmployeeRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  employeePosition?: string;
  canCreateEmployees?: boolean;
  active?: boolean;
  isVerified?: boolean;
}

export interface EmployeeStatistics {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  employeesByPosition: { [key: string]: number };
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

class EmployeeService {
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
   * Get all employees (paginated)
   * For organizers: returns only their employees
   * For admins: returns all employees in the system
   */
  async getAllEmployees(
    page: number = 0,
    size: number = 10,
    sortBy: string = 'createdAt',
    sortDirection: 'ASC' | 'DESC' = 'DESC'
  ): Promise<PaginatedResponse<OrganizerEmployee>> {
    const basePath = this.getBasePath();
    const response = await api.get<PaginatedResponse<OrganizerEmployee>>(
      `${basePath === '/api/organizer' ? `${basePath}/employees` : `${basePath}/organizer-employees`}`,
      {
        params: { page, size, sortBy, sortDirection },
      }
    );
    return response.data;
  }

  /**
   * Get a specific employee by ID
   */
  async getEmployeeById(employeeId: string): Promise<OrganizerEmployee> {
    const basePath = this.getBasePath();
    const response = await api.get<OrganizerEmployee>(
      `${basePath === '/api/organizer' ? `${basePath}/employees/${employeeId}` : `${basePath}/organizer-employees/${employeeId}`}`
    );
    return response.data;
  }

  /**
   * Get employees by organizer ID (admin only)
   */
  async getEmployeesByOrganizer(
    organizerId: string,
    page: number = 0,
    size: number = 10
  ): Promise<PaginatedResponse<OrganizerEmployee>> {
    const response = await api.get<PaginatedResponse<OrganizerEmployee>>(
      `/api/admin/organizer-employees/by-organizer/${organizerId}`,
      {
        params: { page, size },
      }
    );
    return response.data;
  }

  /**
   * Create a new employee
   */
  async createEmployee(request: CreateEmployeeRequest): Promise<OrganizerEmployee> {
    const basePath = this.getBasePath();
    const response = await api.post<OrganizerEmployee>(
      `${basePath === '/api/organizer' ? `${basePath}/employees` : `${basePath}/organizer-employees`}`,
      request
    );
    return response.data;
  }

  /**
   * Update an existing employee
   */
  async updateEmployee(employeeId: string, request: UpdateEmployeeRequest): Promise<OrganizerEmployee> {
    const basePath = this.getBasePath();
    const response = await api.put<OrganizerEmployee>(
      `${basePath === '/api/organizer' ? `${basePath}/employees/${employeeId}` : `${basePath}/organizer-employees/${employeeId}`}`,
      request
    );
    return response.data;
  }

  /**
   * Delete (soft delete) an employee
   */
  async deleteEmployee(employeeId: string): Promise<void> {
    const basePath = this.getBasePath();
    await api.delete(
      `${basePath === '/api/organizer' ? `${basePath}/employees/${employeeId}` : `${basePath}/organizer-employees/${employeeId}`}`
    );
  }

  /**
   * Restore a soft-deleted employee
   */
  async restoreEmployee(employeeId: string): Promise<void> {
    const basePath = this.getBasePath();
    await api.post(
      `${basePath === '/api/organizer' ? `${basePath}/employees/${employeeId}/restore` : `${basePath}/organizer-employees/${employeeId}/restore`}`
    );
  }

  /**
   * Get count of active employees
   */
  async countActiveEmployees(): Promise<number> {
    const basePath = this.getBasePath();
    const response = await api.get<number>(
      `${basePath === '/api/organizer' ? `${basePath}/employees/count` : `${basePath}/organizer-employees/count`}`
    );
    return response.data;
  }

  /**
   * Get employee statistics (organizers only)
   */
  async getEmployeeStatistics(): Promise<EmployeeStatistics> {
    const response = await api.get<EmployeeStatistics>('/api/organizer/employees/statistics');
    return response.data;
  }
}

const employeeService = new EmployeeService();
export default employeeService;
