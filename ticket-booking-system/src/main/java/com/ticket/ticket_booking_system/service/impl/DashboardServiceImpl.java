package com.ticket.ticket_booking_system.service.impl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.ticket.ticket_booking_system.dto.RecentTransactionDTO;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.EventSchedule;
import com.ticket.ticket_booking_system.entity.Transaction;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.BookingRepository;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.EventScheduleRepository;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.TransactionRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.service.DashboardService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@org.springframework.context.annotation.Primary
public class DashboardServiceImpl implements DashboardService {

    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final OrganizerRepository organizerRepository;
    private final OrganizerEmployeeRepository organizerEmployeeRepository;
    private final EventRepository eventRepository;
    private final EventScheduleRepository eventScheduleRepository;
    private final BookingRepository bookingRepository;
    private final TransactionRepository transactionRepository;

    @Override
    public Map<String, Object> getDashboardOverview() {
        Map<String, Object> overview = new HashMap<>();


        LocalDateTime today = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = today.plusDays(1); // End of today (tomorrow at midnight)
        LocalDateTime weekStart = today.minusDays(7);
        LocalDateTime monthStart = today.withDayOfMonth(1);

        // Total revenue
        BigDecimal totalRevenue = transactionRepository.findTotalRevenue();
        overview.put("totalRevenue", totalRevenue != null ? totalRevenue : BigDecimal.ZERO);

        // Total users
        long totalUsers = userRepository.count();
        overview.put("totalUsers", totalUsers);

        // Active events count
        List<Event> activeEvents = eventRepository.findByStatus(Event.EventStatus.PUBLISHED, PageRequest.of(0, 1000))
                .getContent();
        overview.put("activeEventsCount", activeEvents.size());

        // Bookings stats
        Long todayBookings = bookingRepository.countBookingsBetweenDates(today, todayEnd);
        overview.put("todayBookings", todayBookings != null ? todayBookings : 0);

        Long weekBookings = bookingRepository.countBookingsBetweenDates(weekStart, todayEnd);
        overview.put("weekBookings", weekBookings != null ? weekBookings : 0);

        Long monthBookings = bookingRepository.countBookingsBetweenDates(monthStart, todayEnd);
        overview.put("monthBookings", monthBookings != null ? monthBookings : 0);

        // SUPER_ADMIN exclusive fields - Role counts
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN") || a.getAuthority().equals("SUPER_ADMIN"))) {
            
            // Count super admins from admin table (role = SUPER_ADMIN)
            long superAdminCount = adminRepository.findByActiveTrue().stream()
                    .filter(admin -> admin.getRole() == Admin.Role.SUPER_ADMIN)
                    .count();
            overview.put("superAdminCount", superAdminCount);
            
            // Count total admins (ADMIN + SUPER_ADMIN) from admin table
            long adminCount = adminRepository.findByActiveTrue().stream()
                    .filter(admin -> admin.getRole() == Admin.Role.ADMIN)
                    .count();
            overview.put("adminCount", adminCount);
            
            // Count organizers from organizer table
            long organizerCount = organizerRepository.findByActiveTrue().size();
            overview.put("organizerCount", organizerCount);
            
            // Count organizer employees from organizer_employee table
            long organizerEmployeeCount = organizerEmployeeRepository.countByActiveTrue();
            overview.put("organizerEmployeeCount", organizerEmployeeCount);
        }

        return overview;
    }

    @Override
    public Map<String, Object> getAnalyticsByPeriod(String period) {
        Map<String, Object> analytics = new HashMap<>();

        LocalDateTime endDate = LocalDateTime.now();
        LocalDateTime startDate;

        // Determine time range based on period
        switch (period.toLowerCase()) {
            case "day":
                startDate = LocalDate.now().atStartOfDay();
                break;
            case "week":
                startDate = endDate.minusWeeks(1);
                break;
            case "month":
                startDate = endDate.minusMonths(1);
                break;
            case "year":
                startDate = endDate.minusYears(1);
                break;
            default:
                startDate = endDate.minusWeeks(1); // Default to week
        }

        // Revenue for the period
        BigDecimal periodRevenue = transactionRepository.findRevenueForPeriod(startDate, endDate);
        analytics.put("revenue", periodRevenue != null ? periodRevenue : BigDecimal.ZERO);

        // Bookings for the period
        Long bookingsCount = bookingRepository.countBookingsBetweenDates(startDate, endDate);
        analytics.put("bookingsCount", bookingsCount != null ? bookingsCount : 0);

        // User growth (simplified - just count users created in the period)
        List<User> newUsers = userRepository.findAll().stream()
                .filter(user -> user.getCreatedAt() != null && user.getCreatedAt().isAfter(startDate))
                .collect(Collectors.toList());
        analytics.put("newUsersCount", newUsers.size());

        return analytics;
    }

    @Override
    public Map<String, Object> getRevenueChartData(String period, String startDateStr, String endDateStr) {
        Map<String, Object> chartData = new HashMap<>();

        LocalDateTime endDate = endDateStr != null
                ? LocalDate.parse(endDateStr).atTime(LocalTime.MAX)
                : LocalDateTime.now();

        LocalDateTime startDate;

        if (startDateStr != null) {
            startDate = LocalDate.parse(startDateStr).atStartOfDay();
        } else {
            // Determine start date based on period if not explicitly provided
            switch (period.toLowerCase()) {
                case "day":
                    startDate = LocalDate.now().atStartOfDay();
                    break;
                case "week":
                    startDate = endDate.minusWeeks(1);
                    break;
                case "month":
                    startDate = endDate.minusMonths(1);
                    break;
                case "year":
                    startDate = endDate.minusYears(1);
                    break;
                default:
                    startDate = endDate.minusMonths(1); // Default
            }
        }

        // Get all transactions in the period
        List<Transaction> transactions = transactionRepository.findByDateRange(startDate, endDate);

        // Format data for chart
        DateTimeFormatter formatter;
        if (period.equalsIgnoreCase("day")) {
            formatter = DateTimeFormatter.ofPattern("HH:mm");
        } else if (period.equalsIgnoreCase("week")) {
            formatter = DateTimeFormatter.ofPattern("EEE");
        } else if (period.equalsIgnoreCase("month")) {
            formatter = DateTimeFormatter.ofPattern("dd-MMM");
        } else {
            formatter = DateTimeFormatter.ofPattern("MMM-yy");
        }

        Map<String, BigDecimal> revenueByPeriod = new LinkedHashMap<>();

        // Organize transactions by date
        transactions.forEach(transaction -> {
            String key = transaction.getCreatedAt().format(formatter);
            BigDecimal currentAmount = revenueByPeriod.getOrDefault(key, BigDecimal.ZERO);

            if (transaction.getType() == Transaction.TransactionType.PAYMENT &&
                    transaction.getStatus() == Transaction.TransactionStatus.SUCCESS) {
                revenueByPeriod.put(key, currentAmount.add(transaction.getAmount()));
            } else if (transaction.getType() == Transaction.TransactionType.REFUND &&
                    transaction.getStatus() == Transaction.TransactionStatus.SUCCESS) {
                revenueByPeriod.put(key, currentAmount.subtract(transaction.getAmount()));
            }
        });

        List<String> labels = new ArrayList<>(revenueByPeriod.keySet());
        List<BigDecimal> data = new ArrayList<>(revenueByPeriod.values());

        chartData.put("labels", labels);
        chartData.put("data", data);
        chartData.put("period", period);

        return chartData;
    }

@Override
public Map<String, Object> getRecentTransactions(int count) {
    Map<String, Object> result = new HashMap<>();

    try {
        // Use the new eager-loading query method and apply limit manually
        List<Transaction> transactions = transactionRepository
                .findAllRecentTransactionsEager()
                .stream()
                .limit(count)
                .toList();

        List<RecentTransactionDTO> dtoList = transactions.stream()
                .map(t -> {
                    Event event = t.getBooking() != null ? t.getBooking().getEvent() : null;
                    return RecentTransactionDTO.builder()
                            .transactionId(t.getTransactionId())
                            .transactionReference(t.getTransactionReference())
                            .amount(t.getAmount())
                            .type(t.getType())
                            .status(t.getStatus())
                            .createdAt(t.getCreatedAt())
                            .bookingId(t.getBooking() != null ? t.getBooking().getBookingId() : null)
                            .bookingReference(t.getBooking() != null ? t.getBooking().getBookingReference() : null)
                            .eventId(event != null ? event.getEventId() : null)
                            .eventName(event != null ? event.getName() : null)
                            .build();
                })
                .toList();

        result.put("transactions", dtoList);
    } catch (Exception e) {
        result.put("error", "Error fetching recent transactions: " + e.getMessage());
        result.put("transactions", new ArrayList<>());
    }
    return result;
}

    @Override
    public Map<String, Object> getUpcomingEvents(int count) {
        Map<String, Object> result = new HashMap<>();

        // Get published events and filter those with upcoming schedules
        List<Event> publishedEvents = eventRepository.findByStatus(
                Event.EventStatus.PUBLISHED,
                PageRequest.of(0, count * 3) // Get more to ensure enough with schedules
        ).getContent();

        LocalDate today = LocalDate.now();
        List<Event> upcomingEvents = publishedEvents.stream()
                .filter(event -> {
                    // Check if event has upcoming schedules
                    List<EventSchedule> schedules = eventScheduleRepository.findUpcomingSchedules(
                            event.getEventId(),
                            today
                    );
                    return !schedules.isEmpty();
                })
                .limit(count)
                .collect(Collectors.toList());

        result.put("upcomingEvents", upcomingEvents);
        return result;
    }

    @Override
    public Map<String, Object> getTopSellingEvents(int count) {
        Map<String, Object> result = new HashMap<>();

        PageRequest pageRequest = PageRequest.of(0, count);
        List<Event> topEvents = eventRepository.findTopSellingEvents(pageRequest);

        result.put("events", topEvents);
        return result;
    }

    @Override
    public Map<String, Object> getTrendData() {
        Map<String, Object> trendData = new HashMap<>();

        // Calculate trends by comparing current period with previous period
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime oneWeekAgo = now.minusWeeks(1);
        LocalDateTime twoWeeksAgo = now.minusWeeks(2);
        LocalDateTime oneMonthAgo = now.minusMonths(1);
        LocalDateTime twoMonthsAgo = now.minusMonths(2);

        // User growth trend (week over week)
        long currentWeekUsers = userRepository.findAll().stream()
                .filter(user -> user.getCreatedAt() != null &&
                        user.getCreatedAt().isAfter(oneWeekAgo))
                .count();

        long previousWeekUsers = userRepository.findAll().stream()
                .filter(user -> user.getCreatedAt() != null &&
                        user.getCreatedAt().isAfter(twoWeeksAgo) &&
                        user.getCreatedAt().isBefore(oneWeekAgo))
                .count();

        double userGrowthTrend = previousWeekUsers > 0
                ? ((double) (currentWeekUsers - previousWeekUsers) / previousWeekUsers) * 100
                : 0;

        trendData.put("userGrowthTrend", Math.round(userGrowthTrend * 100.0) / 100.0);

        // Revenue trend (month over month)
        BigDecimal currentMonthRevenue = transactionRepository.findRevenueForPeriod(
                oneMonthAgo, now);
        BigDecimal previousMonthRevenue = transactionRepository.findRevenueForPeriod(
                twoMonthsAgo, oneMonthAgo);

        double revenueTrend = previousMonthRevenue != null && previousMonthRevenue.compareTo(BigDecimal.ZERO) > 0
                ? ((currentMonthRevenue.subtract(previousMonthRevenue))
                        .divide(previousMonthRevenue, 4, BigDecimal.ROUND_HALF_UP))
                        .multiply(BigDecimal.valueOf(100)).doubleValue()
                : 0;

        trendData.put("revenueTrend", Math.round(revenueTrend * 100.0) / 100.0);

        // Booking trend (week over week)
        Long currentWeekBookings = bookingRepository.countBookingsBetweenDates(
                oneWeekAgo, now);
        Long previousWeekBookings = bookingRepository.countBookingsBetweenDates(
                twoWeeksAgo, oneWeekAgo);

        double bookingTrend = previousWeekBookings != null && previousWeekBookings > 0
                ? ((double) (currentWeekBookings - previousWeekBookings) / previousWeekBookings) * 100
                : 0;

        trendData.put("bookingTrend", Math.round(bookingTrend * 100.0) / 100.0);

        // Event trend (month over month)
        long currentMonthEvents = eventRepository.findByStatus(
                Event.EventStatus.PUBLISHED, PageRequest.of(0, 1000))
                .getContent().stream()
                .filter(event -> event.getCreatedAt() != null &&
                        event.getCreatedAt().isAfter(oneMonthAgo))
                .count();

        long previousMonthEvents = eventRepository.findByStatus(
                Event.EventStatus.PUBLISHED, PageRequest.of(0, 1000))
                .getContent().stream()
                .filter(event -> event.getCreatedAt() != null &&
                        event.getCreatedAt().isAfter(twoMonthsAgo) &&
                        event.getCreatedAt().isBefore(oneMonthAgo))
                .count();

        double eventTrend = previousMonthEvents > 0
                ? ((double) (currentMonthEvents - previousMonthEvents) / previousMonthEvents) * 100
                : 0;

        trendData.put("eventTrend", Math.round(eventTrend * 100.0) / 100.0);

        return trendData;
    }
}
