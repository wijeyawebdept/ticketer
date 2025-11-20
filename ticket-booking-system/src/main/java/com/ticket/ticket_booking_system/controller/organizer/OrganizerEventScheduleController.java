package com.ticket.ticket_booking_system.controller.organizer;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.request.EventScheduleRequest;
import com.ticket.ticket_booking_system.dto.response.EventScheduleResponse;
import com.ticket.ticket_booking_system.entity.EventSchedule.ScheduleStatus;
import com.ticket.ticket_booking_system.service.EventScheduleService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/organizer/events/{eventId}/schedules")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ORGANIZER', 'ORGANIZER_EMPLOYEE')")
public class OrganizerEventScheduleController {

    private final EventScheduleService eventScheduleService;

    /**
     * Create a new schedule for an event
     */
    @PostMapping
    public ResponseEntity<EventScheduleResponse> createSchedule(
            @PathVariable UUID eventId,
            @Valid @RequestBody EventScheduleRequest request) {
        EventScheduleResponse response = eventScheduleService.createSchedule(eventId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get all schedules for an event
     */
    @GetMapping
    public ResponseEntity<List<EventScheduleResponse>> getSchedulesForEvent(@PathVariable UUID eventId) {
        List<EventScheduleResponse> schedules = eventScheduleService.getSchedulesForEvent(eventId);
        return ResponseEntity.ok(schedules);
    }

    /**
     * Get schedule by ID
     */
    @GetMapping("/{scheduleId}")
    public ResponseEntity<EventScheduleResponse> getScheduleById(
            @PathVariable UUID eventId,
            @PathVariable UUID scheduleId) {
        EventScheduleResponse schedule = eventScheduleService.getScheduleById(scheduleId);
        return ResponseEntity.ok(schedule);
    }

    /**
     * Update a schedule
     */
    @PutMapping("/{scheduleId}")
    public ResponseEntity<EventScheduleResponse> updateSchedule(
            @PathVariable UUID eventId,
            @PathVariable UUID scheduleId,
            @Valid @RequestBody EventScheduleRequest request) {
        EventScheduleResponse response = eventScheduleService.updateSchedule(scheduleId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Delete a schedule (soft delete - move to recycle bin)
     */
    @DeleteMapping("/{scheduleId}")
    public ResponseEntity<Void> deleteSchedule(
            @PathVariable UUID eventId,
            @PathVariable UUID scheduleId) {
        eventScheduleService.deleteSchedule(scheduleId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Restore a schedule from recycle bin
     */
    @PostMapping("/{scheduleId}/restore")
    public ResponseEntity<Void> restoreSchedule(
            @PathVariable UUID eventId,
            @PathVariable UUID scheduleId) {
        eventScheduleService.restoreSchedule(scheduleId);
        return ResponseEntity.ok().build();
    }

    /**
     * Permanently delete a schedule
     */
    @DeleteMapping("/{scheduleId}/permanent")
    public ResponseEntity<Void> permanentlyDeleteSchedule(
            @PathVariable UUID eventId,
            @PathVariable UUID scheduleId) {
        eventScheduleService.permanentlyDeleteSchedule(scheduleId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Change schedule status
     */
    @PatchMapping("/{scheduleId}/status")
    public ResponseEntity<EventScheduleResponse> changeScheduleStatus(
            @PathVariable UUID eventId,
            @PathVariable UUID scheduleId,
            @RequestParam ScheduleStatus status) {
        EventScheduleResponse response = eventScheduleService.changeScheduleStatus(scheduleId, status);
        return ResponseEntity.ok(response);
    }

    /**
     * Get schedules by date range
     */
    @GetMapping("/range")
    public ResponseEntity<List<EventScheduleResponse>> getSchedulesByDateRange(
            @PathVariable UUID eventId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<EventScheduleResponse> schedules = eventScheduleService.getSchedulesByDateRange(eventId, startDate, endDate);
        return ResponseEntity.ok(schedules);
    }

    /**
     * Get total capacity across all schedules
     */
    @GetMapping("/total-capacity")
    public ResponseEntity<Integer> getTotalCapacity(@PathVariable UUID eventId) {
        Integer totalCapacity = eventScheduleService.getTotalCapacityForEvent(eventId);
        return ResponseEntity.ok(totalCapacity);
    }

    /**
     * Get total available seats across all schedules
     */
    @GetMapping("/total-available")
    public ResponseEntity<Integer> getTotalAvailableSeats(@PathVariable UUID eventId) {
        Integer totalAvailable = eventScheduleService.getTotalAvailableSeatsForEvent(eventId);
        return ResponseEntity.ok(totalAvailable);
    }
}
