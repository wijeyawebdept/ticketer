import api from './api';

export interface EventEmployeeAssignment {
  assignmentId: string;
  eventId: string;
  eventName: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  assignedByOrganizerId: string;
  assignedByOrganizerName: string;
  assignedAt: string;
  roleDescription?: string;
  notes?: string;
  isActive: boolean;
}

export interface AssignEmployeesToEventRequest {
  eventId: string;
  employees: {
    employeeId: string;
    roleDescription?: string;
    notes?: string;
  }[];
}

class EventAssignmentService {
  /**
   * Assign employees to an event
   */
  async assignEmployeesToEvent(request: AssignEmployeesToEventRequest): Promise<EventEmployeeAssignment[]> {
    const response = await api.post<EventEmployeeAssignment[]>('/organizer/event-assignments', request);
    return response.data;
  }

  /**
   * Remove employee from event
   */
  async removeEmployeeFromEvent(eventId: string, employeeId: string): Promise<void> {
    await api.delete(`/organizer/event-assignments/events/${eventId}/employees/${employeeId}`);
  }

  /**
   * Get all employees assigned to an event
   */
  async getEmployeesForEvent(eventId: string): Promise<EventEmployeeAssignment[]> {
    const response = await api.get<EventEmployeeAssignment[]>(`/organizer/event-assignments/events/${eventId}/employees`);
    return response.data;
  }

  /**
   * Get all events assigned to an employee
   */
  async getEventsForEmployee(employeeId: string): Promise<EventEmployeeAssignment[]> {
    const response = await api.get<EventEmployeeAssignment[]>(`/organizer/event-assignments/employees/${employeeId}/events`);
    return response.data;
  }

  /**
   * Get all assignments for organizer
   */
  async getAllAssignments(): Promise<EventEmployeeAssignment[]> {
    const response = await api.get<EventEmployeeAssignment[]>('/organizer/event-assignments');
    return response.data;
  }

  /**
   * Update assignment details
   */
  async updateAssignment(
    assignmentId: string,
    roleDescription?: string,
    notes?: string
  ): Promise<EventEmployeeAssignment> {
    const params = new URLSearchParams();
    if (roleDescription) params.append('roleDescription', roleDescription);
    if (notes) params.append('notes', notes);
    
    const response = await api.patch<EventEmployeeAssignment>(`/organizer/event-assignments/${assignmentId}?${params.toString()}`);
    return response.data;
  }
}

const eventAssignmentService = new EventAssignmentService();
export default eventAssignmentService;
