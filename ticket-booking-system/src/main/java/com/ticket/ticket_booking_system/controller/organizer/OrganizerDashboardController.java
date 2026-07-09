package com.ticket.ticket_booking_system.controller.organizer;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.repository.BookingRepository;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.service.DashboardService;

import lombok.RequiredArgsConstructor;

/**
 * Organizer dashboard controller
 * Provides dashboard data for organizers showing statistics for their events
 */
@RestController
@RequestMapping("/api/organizer/dashboard")
@PreAuthorize("hasAnyRole('ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN') or hasAnyAuthority('ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ORGANIZER_EMPLOYEE', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
@RequiredArgsConstructor
public class OrganizerDashboardController {

    private final DashboardService dashboardService;
    private final EventRepository eventRepository;
    private final BookingRepository bookingRepository;
    private final OrganizerRepository organizerRepository;
    private final OrganizerEmployeeRepository employeeRepository;

    /**
     * Get dashboard overview for organizer
     * Shows stats for organizer's events only
     */
    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getDashboardOverview(Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        return ResponseEntity.ok(dashboardService.getDashboardOverview(organizerId));
    }

    /**
     * Get analytics data for organizer
     */
    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics(
            @RequestParam(defaultValue = "week") String period,
            Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        return ResponseEntity.ok(dashboardService.getAnalyticsByPeriod(period, organizerId));
    }

    /**
     * Get revenue chart data for organizer
     */
    @GetMapping("/revenue-chart")
    public ResponseEntity<Map<String, Object>> getRevenueChartData(
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        return ResponseEntity.ok(dashboardService.getRevenueChartData(period, startDate, endDate, organizerId));
    }

    /**
     * Get recent transactions for organizer's events
     */
    @GetMapping("/recent-transactions")
    public ResponseEntity<Map<String, Object>> getRecentTransactions(
            @RequestParam(defaultValue = "10") int count,
            Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        return ResponseEntity.ok(dashboardService.getRecentTransactions(count, organizerId));
    }

    /**
     * Get upcoming events for organizer
     */
    @GetMapping("/upcoming-events")
    public ResponseEntity<Map<String, Object>> getUpcomingEvents(
            @RequestParam(defaultValue = "5") int count,
            Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        return ResponseEntity.ok(dashboardService.getUpcomingEvents(count, organizerId));
    }

    /**
     * Get top selling events for organizer
     */
    @GetMapping("/top-selling-events")
    public ResponseEntity<Map<String, Object>> getTopSellingEvents(
            @RequestParam(defaultValue = "5") int count,
            Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        return ResponseEntity.ok(dashboardService.getTopSellingEvents(count, organizerId));
    }

    /**
     * Get draft events for organizer
     */
    @GetMapping("/draft-events")
    public ResponseEntity<Map<String, Object>> getDraftEvents(
            @RequestParam(defaultValue = "10") int count,
            Authentication authentication) {
        
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(dashboardService.getDraftEventsByOrganizer(organizerId, count));
    }

    /**
     * Get trend data for organizer
     */
    @GetMapping("/trends")
    public ResponseEntity<Map<String, Object>> getTrendData(Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        return ResponseEntity.ok(dashboardService.getTrendData(organizerId));
    }

    /**
     * Get organizer performance metrics
     */
    @GetMapping("/performance")
    public ResponseEntity<?> getPerformanceMetrics(
            @RequestParam(defaultValue = "month") String period,
            Authentication authentication) {
        
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer");
        }

        long totalEvents = eventRepository.countByOrganizer_OrganizerId(organizerId);
        long totalBookings = bookingRepository.countByEvent_Organizer_OrganizerId(organizerId);
        long confirmedBookings = bookingRepository.countByEvent_Organizer_OrganizerIdAndStatus(
                organizerId, com.ticket.ticket_booking_system.entity.Booking.BookingStatus.CONFIRMED);
        
        double bookingCompletionRate = totalBookings > 0 ? (confirmedBookings * 100.0 / totalBookings) : 0;
        double avgBookingsPerEvent = totalEvents > 0 ? (totalBookings * 1.0 / totalEvents) : 0;

        Map<String, Object> metrics = new HashMap<>();
        metrics.put("period", period);
        metrics.put("totalEvents", totalEvents);
        metrics.put("totalBookings", totalBookings);
        metrics.put("confirmedBookings", confirmedBookings);
        metrics.put("bookingCompletionRate", String.format("%.2f%%", bookingCompletionRate));
        metrics.put("avgBookingsPerEvent", String.format("%.2f", avgBookingsPerEvent));
        
        return ResponseEntity.ok(metrics);
    }

    /**
     * Get event statistics summary for organizer
     */
    @GetMapping("/event-summary")
    public ResponseEntity<?> getEventSummary(Authentication authentication) {
        
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer");
        }

        long totalEvents = eventRepository.countByOrganizer_OrganizerId(organizerId);
        long publishedEvents = eventRepository.countByOrganizer_OrganizerIdAndStatus(
                organizerId, Event.EventStatus.PUBLISHED);
        long draftEvents = eventRepository.countByOrganizer_OrganizerIdAndStatus(
                organizerId, Event.EventStatus.DRAFT);
        long completedEvents = eventRepository.countByOrganizer_OrganizerIdAndStatus(
                organizerId, Event.EventStatus.COMPLETED);
        long cancelledEvents = eventRepository.countByOrganizer_OrganizerIdAndStatus(
                organizerId, Event.EventStatus.CANCELLED);

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalEvents", totalEvents);
        summary.put("publishedEvents", publishedEvents);
        summary.put("draftEvents", draftEvents);
        summary.put("completedEvents", completedEvents);
        summary.put("cancelledEvents", cancelledEvents);
        
        return ResponseEntity.ok(summary);
    }

    /**
     * Helper method to extract organizer ID from authentication
     * Supports both Organizer and OrganizerEmployee principals
     */
    private UUID getOrganizerIdFromAuth(Authentication authentication) {
        if (authentication == null) {
            return null;
        }

        // Try to get from Organizer principal
        if (authentication.getPrincipal() instanceof Organizer) {
            Organizer organizer = (Organizer) authentication.getPrincipal();
            return organizer.getOrganizerId();
        }

        // Try to get from OrganizerEmployee principal
        if (authentication.getPrincipal() instanceof OrganizerEmployee) {
            OrganizerEmployee employee = (OrganizerEmployee) authentication.getPrincipal();
            return employee.getOrganizer() != null ? employee.getOrganizer().getOrganizerId() : null;
        }

        // Extract email from authentication principal (JWT token)
        String email = authentication.getName();
        if (email != null && !email.isEmpty()) {
            // Try organizer repository first
            UUID organizerId = organizerRepository.findByEmail(email)
                    .map(org -> org.getOrganizerId())
                    .orElse(null);
            if (organizerId != null) {
                return organizerId;
            }
            
            // Try employee repository and get their organizer's ID
            return employeeRepository.findByEmail(email)
                    .map(emp -> emp.getOrganizer() != null ? emp.getOrganizer().getOrganizerId() : null)
                    .orElse(null);
        }

        return null;
    }
}
