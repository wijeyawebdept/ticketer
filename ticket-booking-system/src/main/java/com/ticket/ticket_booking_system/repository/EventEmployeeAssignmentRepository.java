package com.ticket.ticket_booking_system.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.EventEmployeeAssignment;

@Repository
public interface EventEmployeeAssignmentRepository extends JpaRepository<EventEmployeeAssignment, UUID> {
    
    // Find all assignments for a specific event
    List<EventEmployeeAssignment> findByEvent_EventIdAndIsActiveTrue(UUID eventId);
    
    // Find all assignments for a specific employee
    List<EventEmployeeAssignment> findByEmployee_EmployeeIdAndIsActiveTrue(UUID employeeId);
    
    // Find all assignments by organizer
    List<EventEmployeeAssignment> findByAssignedBy_OrganizerIdAndIsActiveTrue(UUID organizerId);
    
    // Check if employee is already assigned to event
    boolean existsByEvent_EventIdAndEmployee_EmployeeIdAndIsActiveTrue(UUID eventId, UUID employeeId);
    
    // Find specific assignment
    EventEmployeeAssignment findByEvent_EventIdAndEmployee_EmployeeIdAndIsActiveTrue(UUID eventId, UUID employeeId);
    
    // Get all assignments for events owned by organizer
    @Query("SELECT ea FROM EventEmployeeAssignment ea WHERE ea.event.organizer.organizerId = :organizerId AND ea.isActive = true")
    List<EventEmployeeAssignment> findByOrganizerIdAndIsActiveTrue(@Param("organizerId") UUID organizerId);
    
    // Count employees assigned to an event
    long countByEvent_EventIdAndIsActiveTrue(UUID eventId);
    
    // Count events assigned to an employee
    long countByEmployee_EmployeeIdAndIsActiveTrue(UUID employeeId);
    
    // Delete by event
    void deleteByEvent_EventId(UUID eventId);
    
    // Delete by employee
    void deleteByEmployee_EmployeeId(UUID employeeId);
}
