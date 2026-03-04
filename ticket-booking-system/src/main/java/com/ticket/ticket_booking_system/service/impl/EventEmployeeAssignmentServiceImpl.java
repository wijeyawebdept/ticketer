package com.ticket.ticket_booking_system.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.dto.AssignEmployeesToEventRequest;
import com.ticket.ticket_booking_system.dto.EventEmployeeAssignmentDTO;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.EventEmployeeAssignment;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.EventEmployeeAssignmentRepository;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.service.EmailService;
import com.ticket.ticket_booking_system.service.EventEmployeeAssignmentService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventEmployeeAssignmentServiceImpl implements EventEmployeeAssignmentService {

    private final EventEmployeeAssignmentRepository assignmentRepository;
    private final EventRepository eventRepository;
    private final OrganizerEmployeeRepository employeeRepository;
    private final OrganizerRepository organizerRepository;
    private final AdminRepository adminRepository;
    private final EmailService emailService;

    @Override
    @Transactional
    public List<EventEmployeeAssignmentDTO> assignEmployeesToEvent(UUID organizerId, AssignEmployeesToEventRequest request) {
        // Verify organizer exists
        Organizer organizer = organizerRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("Organizer", "id", organizerId.toString()));

        // Verify event exists and belongs to organizer
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", request.getEventId().toString()));

        if (!event.getOrganizer().getOrganizerId().equals(organizerId)) {
            throw new IllegalArgumentException("Event does not belong to this organizer");
        }

        return assignEmployeesInternal(event, organizer, request);
    }

    /**
     * Admin/Super Admin can assign employees to any event
     */
    @Transactional
    public List<EventEmployeeAssignmentDTO> assignEmployeesToEventByAdmin(UUID adminId, AssignEmployeesToEventRequest request) {
        // Verify admin exists
        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin", "id", adminId.toString()));

        // Verify event exists
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", request.getEventId().toString()));

        // Get the organizer who owns the event
        Organizer organizer = event.getOrganizer();

        return assignEmployeesInternal(event, organizer, request);
    }

    /**
     * Internal method to assign employees to event
     */
    private List<EventEmployeeAssignmentDTO> assignEmployeesInternal(Event event, Organizer organizer, AssignEmployeesToEventRequest request) {
        List<EventEmployeeAssignmentDTO> assignments = new ArrayList<>();

        for (AssignEmployeesToEventRequest.EmployeeAssignment empAssignment : request.getEmployees()) {
            // Verify employee exists
            OrganizerEmployee employee = employeeRepository.findById(empAssignment.getEmployeeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", empAssignment.getEmployeeId().toString()));

            // Verify employee belongs to the event's organizer
            if (!employee.getOrganizer().getOrganizerId().equals(organizer.getOrganizerId())) {
                throw new IllegalArgumentException("Employee does not belong to the event's organizer");
            }

            if (employee.getActive() != 1) {
                throw new IllegalArgumentException("Cannot assign inactive employee: " + employee.getEmail());
            }

            // Check if already assigned
            if (assignmentRepository.existsByEvent_EventIdAndEmployee_EmployeeIdAndIsActiveTrue(
                    event.getEventId(), empAssignment.getEmployeeId())) {
                throw new IllegalArgumentException("Employee " + employee.getEmail() + " is already assigned to this event");
            }

            // Create assignment
            EventEmployeeAssignment assignment = EventEmployeeAssignment.builder()
                    .event(event)
                    .employee(employee)
                    .assignedBy(organizer)
                    .roleDescription(empAssignment.getRoleDescription())
                    .notes(empAssignment.getNotes())
                    .isActive(true)
                    .build();

            EventEmployeeAssignment saved = assignmentRepository.save(assignment);
            assignments.add(convertToDTO(saved));

            log.info("Assigned employee {} to event {}", employee.getEmail(), event.getName());

            // Send assignment notification email to the employee
            emailService.sendEventAssignmentEmail(
                    employee, event, organizer,
                    empAssignment.getRoleDescription(),
                    empAssignment.getNotes());
        }

        return assignments;
    }

    @Override
    @Transactional
    public void removeEmployeeFromEvent(UUID organizerId, UUID eventId, UUID employeeId) {
        // Verify event belongs to organizer
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId.toString()));

        if (!event.getOrganizer().getOrganizerId().equals(organizerId)) {
            throw new IllegalArgumentException("Event does not belong to this organizer");
        }

        removeEmployeeFromEventInternal(eventId, employeeId);
    }

    /**
     * Admin/Super Admin can remove employees from any event
     */
    @Transactional
    public void removeEmployeeFromEventByAdmin(UUID adminId, UUID eventId, UUID employeeId) {
        // Verify admin exists
        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin", "id", adminId.toString()));

        // Verify event exists
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId.toString()));

        removeEmployeeFromEventInternal(eventId, employeeId);
    }

    /**
     * Internal method to remove employee from event
     */
    private void removeEmployeeFromEventInternal(UUID eventId, UUID employeeId) {
        // Find and deactivate assignment
        EventEmployeeAssignment assignment = assignmentRepository
                .findByEvent_EventIdAndEmployee_EmployeeIdAndIsActiveTrue(eventId, employeeId);

        if (assignment == null) {
            throw new ResourceNotFoundException("Assignment", "eventId and employeeId", eventId + " and " + employeeId);
        }

        assignment.setIsActive(false);
        assignmentRepository.save(assignment);

        System.out.println("Removed employee " + employeeId + " from event " + eventId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventEmployeeAssignmentDTO> getEmployeesForEvent(UUID eventId) {
        List<EventEmployeeAssignment> assignments = assignmentRepository.findByEvent_EventIdAndIsActiveTrue(eventId);
        return assignments.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventEmployeeAssignmentDTO> getEventsForEmployee(UUID employeeId) {
        List<EventEmployeeAssignment> assignments = assignmentRepository.findByEmployee_EmployeeIdAndIsActiveTrue(employeeId);
        return assignments.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventEmployeeAssignmentDTO> getAllAssignmentsForOrganizer(UUID organizerId) {
        List<EventEmployeeAssignment> assignments = assignmentRepository.findByOrganizerIdAndIsActiveTrue(organizerId);
        return assignments.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public EventEmployeeAssignmentDTO updateAssignment(UUID organizerId, UUID assignmentId, 
                                                       String roleDescription, String notes) {
        EventEmployeeAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment", "id", assignmentId.toString()));

        // Verify organizer owns the event
        if (!assignment.getEvent().getOrganizer().getOrganizerId().equals(organizerId)) {
            throw new IllegalArgumentException("Assignment does not belong to this organizer's event");
        }

        return updateAssignmentInternal(assignment, roleDescription, notes);
    }

    /**
     * Admin/Super Admin can update any assignment
     */
    @Transactional
    public EventEmployeeAssignmentDTO updateAssignmentByAdmin(UUID adminId, UUID assignmentId, 
                                                              String roleDescription, String notes) {
        // Verify admin exists
        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin", "id", adminId.toString()));

        EventEmployeeAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment", "id", assignmentId.toString()));

        return updateAssignmentInternal(assignment, roleDescription, notes);
    }

    /**
     * Internal method to update assignment
     */
    private EventEmployeeAssignmentDTO updateAssignmentInternal(EventEmployeeAssignment assignment, 
                                                                String roleDescription, String notes) {
        if (roleDescription != null) {
            assignment.setRoleDescription(roleDescription);
        }
        if (notes != null) {
            assignment.setNotes(notes);
        }

        EventEmployeeAssignment updated = assignmentRepository.save(assignment);
        return convertToDTO(updated);
    }

    /**
     * Get all assignments across all events (Admin/Super Admin only)
     */
    @Transactional(readOnly = true)
    public List<EventEmployeeAssignmentDTO> getAllAssignments() {
        List<EventEmployeeAssignment> assignments = assignmentRepository.findAll();
        return assignments.stream()
                .filter(EventEmployeeAssignment::getIsActive)
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    private EventEmployeeAssignmentDTO convertToDTO(EventEmployeeAssignment assignment) {
        return EventEmployeeAssignmentDTO.builder()
                .assignmentId(assignment.getAssignmentId())
                .eventId(assignment.getEvent().getEventId())
                .eventName(assignment.getEvent().getName())
                .employeeId(assignment.getEmployee().getEmployeeId())
                .employeeName(assignment.getEmployee().getFirstName() + " " + assignment.getEmployee().getLastName())
                .employeeEmail(assignment.getEmployee().getEmail())
                .assignedByOrganizerId(assignment.getAssignedBy().getOrganizerId())
                .assignedByOrganizerName(assignment.getAssignedBy().getFirstName() + " " + assignment.getAssignedBy().getLastName())
                .assignedAt(assignment.getAssignedAt())
                .roleDescription(assignment.getRoleDescription())
                .notes(assignment.getNotes())
                .isActive(assignment.getIsActive())
                .build();
    }
}
