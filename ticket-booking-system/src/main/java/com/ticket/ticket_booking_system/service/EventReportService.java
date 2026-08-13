package com.ticket.ticket_booking_system.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.ticket.ticket_booking_system.dto.EventReportDTO;

public interface EventReportService {
    
    /**
     * Generate complete report for a specific event
     * @param eventId Event ID
     * @param scheduleId Optional schedule ID (null for overall aggregated)
     * @param organizerId Optional organizer ID for ownership validation (null for admins)
     * @return EventReportDTO
     */
    EventReportDTO generateEventReport(UUID eventId, UUID scheduleId, UUID organizerId);

    /**
     * Get list of events available for reporting
     * @param organizerId Optional organizer ID (null for admin to get all events)
     * @return List of event summary maps (id, title, venueName, organizerName, totalSchedules, totalBookings)
     */
    List<Map<String, Object>> getReportableEvents(UUID organizerId);
}
