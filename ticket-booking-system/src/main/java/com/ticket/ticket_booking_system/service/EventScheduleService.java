package com.ticket.ticket_booking_system.service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.ticket.ticket_booking_system.dto.request.EventScheduleRequest;
import com.ticket.ticket_booking_system.dto.response.EventScheduleResponse;
import com.ticket.ticket_booking_system.entity.EventSchedule.ScheduleStatus;

public interface EventScheduleService {

    // Create new schedule for an event
    EventScheduleResponse createSchedule(UUID eventId, EventScheduleRequest request);

    // Update existing schedule
    EventScheduleResponse updateSchedule(UUID scheduleId, EventScheduleRequest request);

    // Delete schedule (soft delete - move to recycle bin)
    void deleteSchedule(UUID scheduleId);

    // Restore schedule from recycle bin
    void restoreSchedule(UUID scheduleId);

    // Permanently delete schedule
    void permanentlyDeleteSchedule(UUID scheduleId);

    // Get schedule by ID
    EventScheduleResponse getScheduleById(UUID scheduleId);

    // Get all schedules for an event
    List<EventScheduleResponse> getSchedulesForEvent(UUID eventId);

    // Get upcoming/bookable schedules for an event (for customers)
    List<EventScheduleResponse> getBookableSchedulesForEvent(UUID eventId);

    // Get schedules by date range
    List<EventScheduleResponse> getSchedulesByDateRange(UUID eventId, LocalDate startDate, LocalDate endDate);

    // Change schedule status
    EventScheduleResponse changeScheduleStatus(UUID scheduleId, ScheduleStatus status);

    // Reserve seats for a booking
    boolean reserveSeats(UUID scheduleId, int numberOfSeats);

    // Release seats (for cancellations)
    void releaseSeats(UUID scheduleId, int numberOfSeats);

    // Get total capacity across all schedules for an event
    Integer getTotalCapacityForEvent(UUID eventId);

    // Get total available seats across all schedules for an event
    Integer getTotalAvailableSeatsForEvent(UUID eventId);
}
