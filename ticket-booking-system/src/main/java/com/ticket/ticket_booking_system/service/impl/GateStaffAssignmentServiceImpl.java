package com.ticket.ticket_booking_system.service.impl;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.dto.AssignGateStaffRequest;
import com.ticket.ticket_booking_system.dto.GateStaffAssignmentDTO;
import com.ticket.ticket_booking_system.dto.UpdateGateStaffAssignmentRequest;
import com.ticket.ticket_booking_system.dto.response.EventResponse;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.EventSchedule;
import com.ticket.ticket_booking_system.entity.GateStaff;
import com.ticket.ticket_booking_system.entity.GateStaffAssignment;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.EventScheduleRepository;
import com.ticket.ticket_booking_system.repository.GateStaffAssignmentRepository;
import com.ticket.ticket_booking_system.repository.GateStaffRepository;
import com.ticket.ticket_booking_system.service.EventService;
import com.ticket.ticket_booking_system.service.GateStaffAssignmentService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class GateStaffAssignmentServiceImpl implements GateStaffAssignmentService {

    private final GateStaffAssignmentRepository assignmentRepository;
    private final EventRepository eventRepository;
    private final EventScheduleRepository eventScheduleRepository;
    private final GateStaffRepository gateStaffRepository;
    private final EventService eventService;
    private final com.ticket.ticket_booking_system.repository.OrganizerRepository organizerRepository;
    private final com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository organizerEmployeeRepository;
    private final com.ticket.ticket_booking_system.repository.AdminRepository adminRepository;
    private final com.ticket.ticket_booking_system.repository.UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<GateStaffAssignmentDTO> getAllActiveAssignments() {
        return assignmentRepository.findAllActiveWithDetails()
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<GateStaffAssignmentDTO> getAssignmentsByEvent(UUID eventId) {
        return assignmentRepository.findByEventId(eventId)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<GateStaffAssignmentDTO> getAssignmentsByEventIds(java.util.Collection<UUID> eventIds) {
        if (eventIds == null || eventIds.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        return assignmentRepository.findByEventIds(eventIds)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<GateStaffAssignmentDTO> getAssignmentsBySchedule(UUID scheduleId) {
        return assignmentRepository.findByScheduleId(scheduleId)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<GateStaffAssignmentDTO> getAssignmentsByStaff(UUID staffUserId) {
        return assignmentRepository.findByStaffUserId(staffUserId)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public List<GateStaffAssignmentDTO> assignGateStaff(AssignGateStaffRequest request, UUID assignedByUserId) {
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with ID: " + request.getEventId()));

        List<GateStaffAssignment> savedAssignments = new ArrayList<>();
        List<EventSchedule> schedulesToAssign = new ArrayList<>();

        if (request.getScheduleIds() != null && !request.getScheduleIds().isEmpty()) {
            for (UUID scheduleId : request.getScheduleIds()) {
                EventSchedule schedule = eventScheduleRepository.findById(scheduleId)
                        .orElseThrow(() -> new ResourceNotFoundException("Schedule not found with ID: " + scheduleId));
                schedulesToAssign.add(schedule);
            }
        } else {
            // If no specific schedule IDs were provided, auto-resolve all active schedules for this event so schedule_id is populated
            List<EventSchedule> eventSchedules = eventScheduleRepository
                    .findByEvent_EventIdAndIsDeletedFalseOrderByScheduleDateAscStartTimeAsc(event.getEventId());
            if (!eventSchedules.isEmpty()) {
                schedulesToAssign.addAll(eventSchedules);
            }
        }

        for (UUID staffId : request.getStaffUserIds()) {
            GateStaff staff = gateStaffRepository.findById(staffId)
                    .orElseThrow(() -> new ResourceNotFoundException("Gate staff member not found with ID: " + staffId));

            if (schedulesToAssign.isEmpty()) {
                // Fallback only if the event has no schedules configured yet
                Optional<GateStaffAssignment> existing = assignmentRepository.findExistingAssignment(staffId, event.getEventId(), null);
                if (existing.isEmpty()) {
                    GateStaffAssignment assignment = GateStaffAssignment.builder()
                            .event(event)
                            .eventSchedule(null)
                            .gateStaff(staff)
                            .gateName(request.getGateName() != null && !request.getGateName().trim().isEmpty() ? request.getGateName().trim() : null)
                            .assignedById(assignedByUserId)
                            .assignedAt(LocalDateTime.now())
                            .notes(request.getNotes())
                            .isActive(true)
                            .build();
                    savedAssignments.add(assignmentRepository.save(assignment));
                }
            } else {
                for (EventSchedule schedule : schedulesToAssign) {
                    Optional<GateStaffAssignment> existing = assignmentRepository.findExistingAssignment(staffId, event.getEventId(), schedule.getScheduleId());
                    if (existing.isEmpty()) {
                        GateStaffAssignment assignment = GateStaffAssignment.builder()
                                .event(event)
                                .eventSchedule(schedule)
                                .gateStaff(staff)
                                .gateName(request.getGateName() != null && !request.getGateName().trim().isEmpty() ? request.getGateName().trim() : null)
                                .assignedById(assignedByUserId)
                                .assignedAt(LocalDateTime.now())
                                .notes(request.getNotes())
                                .isActive(true)
                                .build();
                        savedAssignments.add(assignmentRepository.save(assignment));
                    }
                }
            }
        }

        log.info("Assigned {} gate staff assignment(s) for event {}", savedAssignments.size(), event.getName());
        return savedAssignments.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public GateStaffAssignmentDTO updateAssignment(UUID assignmentId, UpdateGateStaffAssignmentRequest request) {
        GateStaffAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found with ID: " + assignmentId));

        if (request.getStaffUserId() != null) {
            GateStaff staff = gateStaffRepository.findById(request.getStaffUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Gate staff not found with ID: " + request.getStaffUserId()));
            assignment.setGateStaff(staff);
        }

        if (request.getScheduleId() != null) {
            EventSchedule schedule = eventScheduleRepository.findById(request.getScheduleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Schedule not found with ID: " + request.getScheduleId()));
            assignment.setEventSchedule(schedule);
        } else if (Boolean.TRUE.equals(request.getIsAllSchedules()) || request.getScheduleId() == null) {
            // If request did not specify a scheduleId, resolve from event's active schedules
            List<EventSchedule> eventSchedules = eventScheduleRepository
                    .findByEvent_EventIdAndIsDeletedFalseOrderByScheduleDateAscStartTimeAsc(assignment.getEvent().getEventId());
            if (!eventSchedules.isEmpty()) {
                assignment.setEventSchedule(eventSchedules.get(0));
            } else {
                assignment.setEventSchedule(null);
            }
        }

        if (request.getNotes() != null) {
            assignment.setNotes(request.getNotes());
        }

        if (request.getGateName() != null) {
            assignment.setGateName(request.getGateName().trim().isEmpty() ? null : request.getGateName().trim());
        }

        GateStaffAssignment updated = assignmentRepository.save(assignment);
        log.info("Updated gate staff assignment: {}", assignmentId);
        return mapToDTO(updated);
    }

    @Override
    @Transactional
    public void removeAssignment(UUID assignmentId) {
        GateStaffAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found with ID: " + assignmentId));

        assignment.setIsActive(false);
        assignmentRepository.save(assignment);
        log.info("Removed gate staff assignment: {}", assignmentId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isStaffAssigned(UUID staffUserId, UUID eventId, UUID scheduleId) {
        if (scheduleId != null) {
            return assignmentRepository.isStaffAssignedToSchedule(staffUserId, eventId, scheduleId);
        }
        return assignmentRepository.isStaffAssignedToEvent(staffUserId, eventId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventResponse> getAssignedEventsForStaff(UUID staffUserId) {
        List<GateStaffAssignment> assignments = assignmentRepository.findByStaffUserId(staffUserId);
        
        // Group by event
        List<Event> distinctEvents = new ArrayList<>();
        Set<UUID> seenEventIds = new HashSet<>();
        for (GateStaffAssignment a : assignments) {
            if (a != null && a.getEvent() != null) {
                Event ev = a.getEvent();
                if (ev.getEventId() != null && seenEventIds.add(ev.getEventId())) {
                    distinctEvents.add(ev);
                }
            }
        }

        List<EventResponse> responses = new ArrayList<>();
        for (Event event : distinctEvents) {
            try {
                EventResponse eventResp = eventService.getEventById(event.getEventId());
                if (eventResp != null) {
                    // Check if staff is assigned to specific schedules only or all
                    List<UUID> specificScheduleIds = assignments.stream()
                            .filter(a -> a.getEvent() != null && a.getEvent().getEventId().equals(event.getEventId()) && a.getEventSchedule() != null)
                            .map(a -> a.getEventSchedule().getScheduleId())
                            .collect(Collectors.toList());

                    boolean hasAllSchedulesAssignment = assignments.stream()
                            .anyMatch(a -> a.getEvent() != null && a.getEvent().getEventId().equals(event.getEventId()) && a.getEventSchedule() == null);

                    if (!hasAllSchedulesAssignment && !specificScheduleIds.isEmpty() && eventResp.getSchedules() != null) {
                        // Filter schedules in response to only assigned schedules
                        eventResp.setSchedules(
                                eventResp.getSchedules().stream()
                                        .filter(s -> specificScheduleIds.contains(s.getScheduleId()))
                                        .collect(Collectors.toList())
                        );
                    }
                    responses.add(eventResp);
                }
            } catch (Exception e) {
                log.warn("Failed to fetch full event details for assigned event {}", event.getEventId(), e);
            }
        }

        return responses;
    }

    private GateStaffAssignmentDTO mapToDTO(GateStaffAssignment a) {
        GateStaff staff = a.getGateStaff();
        Event event = a.getEvent();
        EventSchedule schedule = a.getEventSchedule();

        UUID assignedById = a.getAssignedById();
        String assignedByName = "System Admin";
        boolean isAssignedByAdmin = true;

        if (assignedById != null) {
            var orgOpt = organizerRepository.findById(assignedById);
            if (orgOpt.isPresent()) {
                var org = orgOpt.get();
                String name = (org.getFirstName() != null ? org.getFirstName() + " " + (org.getLastName() != null ? org.getLastName() : "") : org.getEmail()).trim();
                assignedByName = name + " (Organizer)";
                isAssignedByAdmin = false;
            } else {
                var empOpt = organizerEmployeeRepository.findById(assignedById);
                if (empOpt.isPresent()) {
                    var emp = empOpt.get();
                    assignedByName = (emp.getFirstName() + " " + emp.getLastName()).trim() + " (Staff)";
                    isAssignedByAdmin = false;
                } else {
                    var adminOpt = adminRepository.findById(assignedById);
                    if (adminOpt.isPresent()) {
                        var adm = adminOpt.get();
                        assignedByName = (adm.getFirstName() + " " + adm.getLastName()).trim();
                        isAssignedByAdmin = true;
                    } else {
                        var userOpt = userRepository.findById(assignedById);
                        if (userOpt.isPresent()) {
                            var u = userOpt.get();
                            assignedByName = (u.getFirstName() + " " + u.getLastName()).trim();
                            isAssignedByAdmin = u.getRole() == User.Role.ADMIN || u.getRole() == User.Role.SUPER_ADMIN;
                        }
                    }
                }
            }
        }

        return GateStaffAssignmentDTO.builder()
                .assignmentId(a.getAssignmentId())
                .staffUserId(staff != null ? staff.getGateStaffId() : null)
                .staffName(staff != null ? (staff.getFirstName() + " " + staff.getLastName()).trim() : "")
                .staffEmail(staff != null ? staff.getEmail() : "")
                .staffPhone(staff != null ? staff.getPhoneNumber() : "")
                .eventId(event != null ? event.getEventId() : null)
                .eventTitle(event != null ? event.getName() : "")
                .venueName(event != null && event.getVenue() != null ? event.getVenue().getName() : "")
                .scheduleId(schedule != null ? schedule.getScheduleId() : null)
                .scheduleDate(schedule != null ? schedule.getScheduleDate() : null)
                .startTime(schedule != null ? schedule.getStartTime() : null)
                .endTime(schedule != null ? schedule.getEndTime() : null)
                .isAllSchedules(schedule == null)
                .assignedById(assignedById)
                .assignedByName(assignedByName)
                .isAssignedByAdmin(isAssignedByAdmin)
                .assignedAt(a.getAssignedAt())
                .gateName(a.getGateName())
                .notes(a.getNotes())
                .isActive(a.getIsActive())
                .build();
    }
}
