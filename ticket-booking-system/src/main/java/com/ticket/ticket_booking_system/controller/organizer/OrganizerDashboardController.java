package com.ticket.ticket_booking_system.controller.organizer;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.service.DashboardService;

/**
 * Organizer dashboard controller
 * Provides dashboard data for organizers showing statistics for their events
 */
@RestController
@RequestMapping("/api/organizer/dashboard")
@PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN', 'SUPER_ADMIN') or hasAnyAuthority('ORGANIZER', 'ADMIN', 'SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
public class OrganizerDashboardController {

    private final DashboardService dashboardService;

    public OrganizerDashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    /**
     * Get dashboard overview for organizer
     * Shows stats for organizer's events only
     */
    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getDashboardOverview(Authentication authentication) {

        return ResponseEntity.ok(dashboardService.getDashboardOverview());
    }

    /**
     * Get analytics data for organizer
     */
    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics(
            @RequestParam(defaultValue = "week") String period,
            Authentication authentication) {

        return ResponseEntity.ok(dashboardService.getAnalyticsByPeriod(period));
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

        return ResponseEntity.ok(dashboardService.getRevenueChartData(period, startDate, endDate));
    }

    /**
     * Get recent transactions for organizer's events
     */
    @GetMapping("/recent-transactions")
    public ResponseEntity<Map<String, Object>> getRecentTransactions(
            @RequestParam(defaultValue = "10") int count,
            Authentication authentication) {

        return ResponseEntity.ok(dashboardService.getRecentTransactions(count));
    }

    /**
     * Get upcoming events for organizer
     */
    @GetMapping("/upcoming-events")
    public ResponseEntity<Map<String, Object>> getUpcomingEvents(
            @RequestParam(defaultValue = "5") int count,
            Authentication authentication) {

        return ResponseEntity.ok(dashboardService.getUpcomingEvents(count));
    }

    /**
     * Get top selling events for organizer
     */
    @GetMapping("/top-selling-events")
    public ResponseEntity<Map<String, Object>> getTopSellingEvents(
            @RequestParam(defaultValue = "5") int count,
            Authentication authentication) {

        return ResponseEntity.ok(dashboardService.getTopSellingEvents(count));
    }

    /**
     * Get trend data for organizer
     */
    @GetMapping("/trends")
    public ResponseEntity<Map<String, Object>> getTrendData(Authentication authentication) {

        return ResponseEntity.ok(dashboardService.getTrendData());
    }

    /**
     * Get organizer performance metrics
     */
    @GetMapping("/performance")
    public ResponseEntity<Map<String, Object>> getPerformanceMetrics(
            @RequestParam(defaultValue = "month") String period,
            Authentication authentication) {
        // TODO: Implement organizer-specific performance metrics
        // - Event success rate
        // - Average attendance
        // - Revenue per event
        // - Booking completion rate
        return ResponseEntity.ok(Map.of(
            "message", "Performance metrics coming soon",
            "period", period
        ));
    }

    /**
     * Get event statistics summary for organizer
     */
    @GetMapping("/event-summary")
    public ResponseEntity<Map<String, Object>> getEventSummary(Authentication authentication) {
        // TODO: Implement organizer-specific event summary
        // - Total events created
        // - Active events
        // - Completed events
        // - Cancelled events
        return ResponseEntity.ok(Map.of(
            "message", "Event summary coming soon"
        ));
    }
}
