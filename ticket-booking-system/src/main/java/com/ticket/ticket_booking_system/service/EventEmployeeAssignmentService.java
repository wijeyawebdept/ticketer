package com.ticket.ticket_booking_system.service;

import java.util.List;
import java.util.UUID;

import com.ticket.ticket_booking_system.dto.AssignEmployeesToEventRequest;
import com.ticket.ticket_booking_system.dto.EventEmployeeAssignmentDTO;

public interface EventEmployeeAssignmentService {
    
    /**
     * Assign multiple employees to an event
     */
    List<EventEmployeeAssignmentDTO> assignEmployeesToEvent(UUID organizerId, AssignEmployeesToEventRequest request);
    
    /**
     * Remove employee assignment from event
     */
    void removeEmployeeFromEvent(UUID organizerId, UUID eventId, UUID employeeId);
    
    /**
     * Get all employees assigned to an event
     */
    List<EventEmployeeAssignmentDTO> getEmployeesForEvent(UUID eventId);
    
    /**
     * Get all events assigned to an employee
     */
    List<EventEmployeeAssignmentDTO> getEventsForEmployee(UUID employeeId);
    
    /**
     * Get all assignments for organizer's events
     */
    List<EventEmployeeAssignmentDTO> getAllAssignmentsForOrganizer(UUID organizerId);
    
    /**
     * Update assignment details
     */
    EventEmployeeAssignmentDTO updateAssignment(UUID organizerId, UUID assignmentId, String roleDescription, String notes);
}
