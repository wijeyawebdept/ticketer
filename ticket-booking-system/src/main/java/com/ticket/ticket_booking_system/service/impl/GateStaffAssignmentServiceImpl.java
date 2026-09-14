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
        }

        for (UUID staffId : request.getStaffUserIds()) {
            GateStaff staff = gateStaffRepository.findById(staffId)
                    .orElseThrow(() -> new ResourceNotFoundException("Gate staff member not found with ID: " + staffId));

            if (schedulesToAssign.isEmpty()) {
                // Assign to all schedules (eventSchedule = null)
                Optional<GateStaffAssignment> existing = assignmentRepository.findExistingAssignment(staffId, event.getEventId(), null);
                if (existing.isEmpty()) {
                    GateStaffAssignment assignment = GateStaffAssignment.builder()
                            .event(event)
                            .eventSchedule(null)
                            .gateStaff(staff)
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

        if (Boolean.TRUE.equals(request.getIsAllSchedules()) || request.getScheduleId() == null) {
            assignment.setEventSchedule(null);
        } else {
            EventSchedule schedule = eventScheduleRepository.findById(request.getScheduleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Schedule not found with ID: " + request.getScheduleId()));
            assignment.setEventSchedule(schedule);
        }

        if (request.getNotes() != null) {
            assignment.setNotes(request.getNotes());
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
                .assignedById(a.getAssignedById())
                .assignedByName("System Admin")
                .assignedAt(a.getAssignedAt())
                .notes(a.getNotes())
                .isActive(a.getIsActive())
                .build();
    }
}
