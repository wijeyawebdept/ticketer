package com.ticket.ticket_booking_system.controller.admin;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.service.DashboardService;

@RestController
@RequestMapping("/api/admin/dashboard")
@PreAuthorize("hasAnyRole('ADMIN') or hasAuthority('ADMIN') or hasAuthority('ROLE_ADMIN')")
public class AdminDashboardController {

    private final DashboardService dashboardService;
    
    public AdminDashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getDashboardOverview() {
        return ResponseEntity.ok(dashboardService.getDashboardOverview());
    }

    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics(@RequestParam(defaultValue = "week") String period) {
        return ResponseEntity.ok(dashboardService.getAnalyticsByPeriod(period));
    }

    @GetMapping("/revenue-chart")
    public ResponseEntity<Map<String, Object>> getRevenueChartData(
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        
        return ResponseEntity.ok(dashboardService.getRevenueChartData(period, startDate, endDate));
    }

    @GetMapping("/recent-transactions")
    public ResponseEntity<Map<String, Object>> getRecentTransactions(
            @RequestParam(defaultValue = "10") int count) {
        
        return ResponseEntity.ok(dashboardService.getRecentTransactions(count));
    }

    @GetMapping("/upcoming-events")
    public ResponseEntity<Map<String, Object>> getUpcomingEvents(
            @RequestParam(defaultValue = "5") int count) {
        
        return ResponseEntity.ok(dashboardService.getUpcomingEvents(count));
    }

    @GetMapping("/top-selling-events")
    public ResponseEntity<Map<String, Object>> getTopSellingEvents(
            @RequestParam(defaultValue = "5") int count) {
        
        return ResponseEntity.ok(dashboardService.getTopSellingEvents(count));
    }
}