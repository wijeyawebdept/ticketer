package com.ticket.ticket_booking_system.service.impl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.dto.request.EventScheduleRequest;
import com.ticket.ticket_booking_system.dto.response.EventScheduleResponse;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.EventSchedule;
import com.ticket.ticket_booking_system.entity.EventSchedule.ScheduleStatus;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.EventScheduleRepository;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.RecycleBinRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.service.EventScheduleService;
import com.ticket.ticket_booking_system.service.RecycleBinService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EventScheduleServiceImpl implements EventScheduleService {

    private final EventScheduleRepository eventScheduleRepository;
    private final EventRepository eventRepository;
    private final RecycleBinRepository recycleBinRepository;
    private final RecycleBinService recycleBinService;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final OrganizerRepository organizerRepository;
    private final OrganizerEmployeeRepository organizerEmployeeRepository;

    @Override
    @Transactional
    public EventScheduleResponse createSchedule(UUID eventId, EventScheduleRequest request) {
        // Validate event exists
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId.toString()));

        // Validate end time is after start time
        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new IllegalArgumentException("End time must be after start time");
        }

        // Create schedule
        EventSchedule schedule = EventSchedule.builder()
            .event(event)
            .scheduleDate(request.getScheduleDate())
            .startTime(request.getStartTime())
            .endTime(request.getEndTime())
            .capacity(request.getCapacity())
            .availableSeats(request.getCapacity()) // Initially all seats available
            .priceAdjustment(request.getPriceAdjustment() != null ? request.getPriceAdjustment() : BigDecimal.ZERO)
            .notes(request.getNotes())
            .status(ScheduleStatus.ACTIVE)
            .isDeleted(false)
            .build();

        EventSchedule saved = eventScheduleRepository.save(schedule);
        return convertToResponse(saved);
    }

    @Override
    @Transactional
    public EventScheduleResponse updateSchedule(UUID scheduleId, EventScheduleRequest request) {
        EventSchedule schedule = eventScheduleRepository.findById(scheduleId)
            .orElseThrow(() -> new ResourceNotFoundException("EventSchedule", "id", scheduleId.toString()));

        // Validate end time is after start time
        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new IllegalArgumentException("End time must be after start time");
        }

        // Update fields
        schedule.setScheduleDate(request.getScheduleDate());
        schedule.setStartTime(request.getStartTime());
        schedule.setEndTime(request.getEndTime());
        
        // If capacity changes, adjust available seats proportionally
        if (!schedule.getCapacity().equals(request.getCapacity())) {
            int bookedSeats = schedule.getCapacity() - schedule.getAvailableSeats();
            schedule.setCapacity(request.getCapacity());
            schedule.setAvailableSeats(Math.max(0, request.getCapacity() - bookedSeats));
        }
        
        schedule.setPriceAdjustment(request.getPriceAdjustment() != null ? request.getPriceAdjustment() : BigDecimal.ZERO);
        schedule.setNotes(request.getNotes());

        EventSchedule updated = eventScheduleRepository.save(schedule);
        return convertToResponse(updated);
    }

    @Override
    @Transactional
    public void deleteSchedule(UUID scheduleId) {
        EventSchedule schedule = eventScheduleRepository.findById(scheduleId)
            .orElseThrow(() -> new ResourceNotFoundException("EventSchedule", "id", scheduleId.toString()));

        // Check if there are any bookings for this schedule
        int bookedSeats = schedule.getCapacity() - schedule.getAvailableSeats();
        if (bookedSeats > 0) {
            throw new IllegalStateException("Cannot delete schedule with existing bookings. Cancel the schedule instead.");
        }

        // Get the current authenticated user
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUserEmail = auth != null ? auth.getName() : "system";
        
        // Create a deletedBy user object with proper tracking
        User deletedBy = User.builder()
                .email(currentUserEmail)
                .firstName("System")
                .lastName("User")
                .build();
        
        // Try to find the user in different repositories
        java.util.Optional<User> userOpt = userRepository.findByEmail(currentUserEmail);
        if (userOpt.isPresent()) {
            deletedBy = userOpt.get();
        } else {
            // Try admin
            java.util.Optional<Admin> adminOpt = adminRepository.findByEmail(currentUserEmail);
            if (adminOpt.isPresent()) {
                Admin admin = adminOpt.get();
                deletedBy = User.builder()
                        .id(admin.getAdminId())
                        .email(admin.getEmail())
                        .firstName(admin.getFirstName())
                        .lastName(admin.getLastName())
                        .build();
            } else {
                // Try organizer
                java.util.Optional<Organizer> organizerOpt = organizerRepository.findByEmail(currentUserEmail);
                if (organizerOpt.isPresent()) {
                    Organizer organizer = organizerOpt.get();
                    deletedBy = User.builder()
                            .id(organizer.getOrganizerId())
                            .email(organizer.getEmail())
                            .firstName(organizer.getOrganizationName())
                            .lastName("")
                            .build();
                } else {
                    // Try organizer employee
                    java.util.Optional<OrganizerEmployee> employeeOpt = organizerEmployeeRepository.findByEmail(currentUserEmail);
                    if (employeeOpt.isPresent()) {
                        OrganizerEmployee employee = employeeOpt.get();
                        deletedBy = User.builder()
                                .id(employee.getEmployeeId())
                                .email(employee.getEmail())
                                .firstName(employee.getFirstName())
                                .lastName(employee.getLastName())
                                .build();
                    }
                }
            }
        }
        
        // Create a simplified schedule data map to avoid circular reference issues
        java.util.Map<String, Object> scheduleData = new java.util.HashMap<>();
        scheduleData.put("scheduleId", schedule.getScheduleId());
        scheduleData.put("eventId", schedule.getEvent().getEventId());
        scheduleData.put("eventName", schedule.getEvent().getName());
        scheduleData.put("scheduleDate", schedule.getScheduleDate());
        scheduleData.put("startTime", schedule.getStartTime());
        scheduleData.put("endTime", schedule.getEndTime());
        scheduleData.put("capacity", schedule.getCapacity());
        scheduleData.put("availableSeats", schedule.getAvailableSeats());
        scheduleData.put("priceAdjustment", schedule.getPriceAdjustment());
        scheduleData.put("status", schedule.getStatus().toString());
        scheduleData.put("notes", schedule.getNotes());
        
        // Move to recycle bin
        recycleBinService.moveToRecycleBin(
                "SCHEDULE",
                schedule.getScheduleId(),
                schedule.getEvent().getName() + " - " + schedule.getScheduleDate() + " " + schedule.getStartTime(),
                scheduleData,
                deletedBy,
                "Schedule soft deleted by " + deletedBy.getEmail()
        );
        
        // Mark as deleted (soft delete)
        schedule.setIsDeleted(true);
        eventScheduleRepository.save(schedule);
    }

    @Override
    @Transactional
    public void restoreSchedule(UUID scheduleId) {
        EventSchedule schedule = eventScheduleRepository.findById(scheduleId)
            .orElseThrow(() -> new ResourceNotFoundException("EventSchedule", "id", scheduleId.toString()));

        if (!schedule.getIsDeleted()) {
            throw new IllegalStateException("Schedule is not deleted");
        }

        // Restore the schedule
        schedule.setIsDeleted(false);
        eventScheduleRepository.save(schedule);

        // Remove from recycle bin
        recycleBinRepository.findByEntityTypeAndEntityId("SCHEDULE", scheduleId)
            .ifPresent(recycleBinRepository::delete);
    }

    @Override
    @Transactional
    public void permanentlyDeleteSchedule(UUID scheduleId) {
        EventSchedule schedule = eventScheduleRepository.findById(scheduleId)
            .orElseThrow(() -> new ResourceNotFoundException("EventSchedule", "id", scheduleId.toString()));

        // Check if there are any bookings for this schedule
        int bookedSeats = schedule.getCapacity() - schedule.getAvailableSeats();
        if (bookedSeats > 0) {
            throw new IllegalStateException("Cannot permanently delete schedule with existing bookings");
        }

        // Remove from recycle bin
        recycleBinRepository.findByEntityTypeAndEntityId("SCHEDULE", scheduleId)
            .ifPresent(recycleBinRepository::delete);

        // Permanently delete from database
        eventScheduleRepository.delete(schedule);
    }

    @Override
    @Transactional(readOnly = true)
    public EventScheduleResponse getScheduleById(UUID scheduleId) {
        EventSchedule schedule = eventScheduleRepository.findById(scheduleId)
            .orElseThrow(() -> new ResourceNotFoundException("EventSchedule", "id", scheduleId.toString()));
        return convertToResponse(schedule);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventScheduleResponse> getSchedulesForEvent(UUID eventId) {
        List<EventSchedule> schedules = eventScheduleRepository
            .findByEvent_EventIdAndIsDeletedFalseOrderByScheduleDateAscStartTimeAsc(eventId);
        return schedules.stream()
            .map(this::convertToResponse)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventScheduleResponse> getBookableSchedulesForEvent(UUID eventId) {
        List<EventSchedule> schedules = eventScheduleRepository
            .findBookableSchedules(eventId, LocalDate.now());
        return schedules.stream()
            .map(this::convertToResponse)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventScheduleResponse> getSchedulesByDateRange(UUID eventId, LocalDate startDate, LocalDate endDate) {
        List<EventSchedule> schedules = eventScheduleRepository
            .findSchedulesByDateRange(eventId, startDate, endDate);
        return schedules.stream()
            .map(this::convertToResponse)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public EventScheduleResponse changeScheduleStatus(UUID scheduleId, ScheduleStatus status) {
        EventSchedule schedule = eventScheduleRepository.findById(scheduleId)
            .orElseThrow(() -> new ResourceNotFoundException("EventSchedule", "id", scheduleId.toString()));

        schedule.setStatus(status);
        EventSchedule updated = eventScheduleRepository.save(schedule);
        return convertToResponse(updated);
    }

    @Override
    @Transactional
    public boolean reserveSeats(UUID scheduleId, int numberOfSeats) {
        EventSchedule schedule = eventScheduleRepository.findById(scheduleId)
            .orElseThrow(() -> new ResourceNotFoundException("EventSchedule", "id", scheduleId.toString()));

        boolean reserved = schedule.reserveSeats(numberOfSeats);
        if (reserved) {
            eventScheduleRepository.save(schedule);
            
            // Update the Event's total available seats
            Event event = schedule.getEvent();
            if (event != null && event.getAvailableSeats() != null) {
                event.setAvailableSeats(Math.max(0, event.getAvailableSeats() - numberOfSeats));
                eventRepository.save(event);
            }
        }
        return reserved;
    }

    @Override
    @Transactional
    public void releaseSeats(UUID scheduleId, int numberOfSeats) {
        EventSchedule schedule = eventScheduleRepository.findById(scheduleId)
            .orElseThrow(() -> new ResourceNotFoundException("EventSchedule", "id", scheduleId.toString()));

        schedule.releaseSeats(numberOfSeats);
        eventScheduleRepository.save(schedule);
        
        // Update the Event's total available seats
        Event event = schedule.getEvent();
        if (event != null && event.getAvailableSeats() != null) {
            event.setAvailableSeats(Math.min(event.getTotalCapacity(), event.getAvailableSeats() + numberOfSeats));
            eventRepository.save(event);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Integer getTotalCapacityForEvent(UUID eventId) {
        return eventScheduleRepository.getTotalCapacityForEvent(eventId);
    }

    @Override
    @Transactional(readOnly = true)
    public Integer getTotalAvailableSeatsForEvent(UUID eventId) {
        return eventScheduleRepository.getTotalAvailableSeatsForEvent(eventId);
    }

    // Helper method to convert entity to response DTO
    private EventScheduleResponse convertToResponse(EventSchedule schedule) {
        Event event = schedule.getEvent();
        BigDecimal basePrice = BigDecimal.ZERO;
        BigDecimal finalPrice = schedule.calculateFinalPrice(basePrice);

        return EventScheduleResponse.builder()
            .scheduleId(schedule.getScheduleId())
            .eventId(event.getEventId())
            .eventName(event.getName())
            .venueId(event.getVenue() != null ? event.getVenue().getVenueId() : null)
            .venueName(event.getVenue() != null ? event.getVenue().getName() : null)
            .venueAddress(event.getVenue() != null ? event.getVenue().getAddress() : null)
            .scheduleDate(schedule.getScheduleDate())
            .startTime(schedule.getStartTime())
            .endTime(schedule.getEndTime())
            .capacity(schedule.getCapacity())
            .availableSeats(schedule.getAvailableSeats())

            .priceAdjustment(schedule.getPriceAdjustment())
            .finalPrice(finalPrice)
            .status(schedule.getStatus())
            .notes(schedule.getNotes())
            .isBookable(schedule.isBookable())
            .createdAt(schedule.getCreatedAt())
            .updatedAt(schedule.getUpdatedAt())
            .build();
    }
}
