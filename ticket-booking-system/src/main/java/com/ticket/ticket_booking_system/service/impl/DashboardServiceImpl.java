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
        return getDashboardOverview(null);
    }

    @Override
    public Map<String, Object> getDashboardOverview(java.util.UUID organizerId) {
        Map<String, Object> overview = new HashMap<>();

        LocalDateTime today = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = today.plusDays(1);
        LocalDateTime weekStart = today.minusDays(7);
        LocalDateTime monthStart = today.withDayOfMonth(1);

        // Total revenue
        BigDecimal totalRevenue = (organizerId == null)
                ? transactionRepository.findTotalRevenue()
                : transactionRepository.findTotalRevenueByOrganizer(organizerId);
        overview.put("totalRevenue", totalRevenue != null ? totalRevenue : BigDecimal.ZERO);

        // Total users (only for global dashboard)
        if (organizerId == null) {
            long totalUsers = userRepository.count();
            overview.put("totalUsers", totalUsers);
        }

        // Active events count
        long activeEventsCount = (organizerId == null)
                ? eventRepository.countByStatus(Event.EventStatus.PUBLISHED)
                : eventRepository.countByOrganizer_OrganizerIdAndStatus(organizerId, Event.EventStatus.PUBLISHED);
        overview.put("activeEventsCount", activeEventsCount);

        // Bookings stats
        Long todayBookings = (organizerId == null)
                ? bookingRepository.countBookingsBetweenDates(today, todayEnd)
                : bookingRepository.countBookingsBetweenDatesByOrganizer(today, todayEnd, organizerId);
        overview.put("todayBookings", todayBookings != null ? todayBookings : 0);

        Long weekBookings = (organizerId == null)
                ? bookingRepository.countBookingsBetweenDates(weekStart, todayEnd)
                : bookingRepository.countBookingsBetweenDatesByOrganizer(weekStart, todayEnd, organizerId);
        overview.put("weekBookings", weekBookings != null ? weekBookings : 0);

        Long monthBookings = (organizerId == null)
                ? bookingRepository.countBookingsBetweenDates(monthStart, todayEnd)
                : bookingRepository.countBookingsBetweenDatesByOrganizer(monthStart, todayEnd, organizerId);
        overview.put("monthBookings", monthBookings != null ? monthBookings : 0);

        // SUPER_ADMIN exclusive fields - Role counts
        if (organizerId == null) {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN") || a.getAuthority().equals("SUPER_ADMIN"))) {
                
                long superAdminCount = adminRepository.findByActiveTrue().stream()
                        .filter(admin -> admin.getRole() == Admin.Role.SUPER_ADMIN)
                        .count();
                overview.put("superAdminCount", superAdminCount);
                
                long adminCount = adminRepository.findByActiveTrue().stream()
                        .filter(admin -> admin.getRole() == Admin.Role.ADMIN)
                        .count();
                overview.put("adminCount", adminCount);
                
                long organizerCount = organizerRepository.findByActiveTrue().size();
                overview.put("organizerCount", organizerCount);
                
                long organizerEmployeeCount = organizerEmployeeRepository.countByActiveTrue();
                overview.put("organizerEmployeeCount", organizerEmployeeCount);
            }
        }

        return overview;
    }

    @Override
    public Map<String, Object> getAnalyticsByPeriod(String period) {
        return getAnalyticsByPeriod(period, null);
    }

    @Override
    public Map<String, Object> getAnalyticsByPeriod(String period, java.util.UUID organizerId) {
        Map<String, Object> analytics = new HashMap<>();

        LocalDateTime endDate = LocalDateTime.now();
        LocalDateTime startDate;

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
                startDate = endDate.minusWeeks(1);
        }

        // Revenue for the period
        BigDecimal periodRevenue = (organizerId == null)
                ? transactionRepository.findRevenueForPeriod(startDate, endDate)
                : transactionRepository.findRevenueForPeriodByOrganizer(startDate, endDate, organizerId);
        analytics.put("revenue", periodRevenue != null ? periodRevenue : BigDecimal.ZERO);

        // Bookings for the period
        Long bookingsCount = (organizerId == null)
                ? bookingRepository.countBookingsBetweenDates(startDate, endDate)
                : bookingRepository.countBookingsBetweenDatesByOrganizer(startDate, endDate, organizerId);
        analytics.put("bookingsCount", bookingsCount != null ? bookingsCount : 0);

        // User growth (Global only)
        if (organizerId == null) {
            List<User> newUsers = userRepository.findAll().stream()
                    .filter(user -> user.getCreatedAt() != null && user.getCreatedAt().isAfter(startDate))
                    .collect(Collectors.toList());
            analytics.put("newUsersCount", newUsers.size());
        }

        return analytics;
    }

    @Override
    public Map<String, Object> getRevenueChartData(String period, String startDateStr, String endDateStr) {
        return getRevenueChartData(period, startDateStr, endDateStr, null);
    }

    @Override
    public Map<String, Object> getRevenueChartData(String period, String startDateStr, String endDateStr, java.util.UUID organizerId) {
        Map<String, Object> chartData = new HashMap<>();

        LocalDateTime endDate = endDateStr != null
                ? LocalDate.parse(endDateStr).atTime(LocalTime.MAX)
                : LocalDateTime.now();

        LocalDateTime startDate;

        if (startDateStr != null) {
            startDate = LocalDate.parse(startDateStr).atStartOfDay();
        } else {
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
                    startDate = endDate.minusMonths(1);
            }
        }

        // Get transactions in the period, optionally filtered by organizer
        List<Transaction> transactions = (organizerId == null)
                ? transactionRepository.findByDateRange(startDate, endDate)
                : transactionRepository.findByDateRangeByOrganizer(startDate, endDate, organizerId);

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
        return getRecentTransactions(count, null);
    }

    @Override
    public Map<String, Object> getRecentTransactions(int count, java.util.UUID organizerId) {
        Map<String, Object> result = new HashMap<>();

        try {
            List<Transaction> transactions = (organizerId == null)
                    ? transactionRepository.findAllRecentTransactionsEager()
                    : transactionRepository.findRecentTransactionsByOrganizerEager(organizerId);

            List<RecentTransactionDTO> dtoList = transactions.stream()
                    .limit(count)
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
        return getUpcomingEvents(count, null);
    }

    @Override
    public Map<String, Object> getUpcomingEvents(int count, java.util.UUID organizerId) {
        Map<String, Object> result = new HashMap<>();

        List<Event> publishedEvents = (organizerId == null)
                ? eventRepository.findByStatus(Event.EventStatus.PUBLISHED, PageRequest.of(0, count * 3)).getContent()
                : eventRepository.findByOrganizer_OrganizerIdAndStatus(organizerId, Event.EventStatus.PUBLISHED, PageRequest.of(0, count * 3)).getContent();

        LocalDate today = LocalDate.now();
        List<Event> upcomingEvents = publishedEvents.stream()
                .filter(event -> !eventScheduleRepository.findUpcomingSchedules(event.getEventId(), today).isEmpty())
                .limit(count)
                .collect(Collectors.toList());

        result.put("upcomingEvents", upcomingEvents);
        return result;
    }

    @Override
    public Map<String, Object> getDraftEvents(int count) {
        Map<String, Object> result = new HashMap<>();

        List<Event> draftEvents = eventRepository.findByStatus(
                Event.EventStatus.DRAFT,
                PageRequest.of(0, count)
        ).getContent();

        List<Map<String, Object>> dtoList = draftEvents.stream().map(event -> {
            Map<String, Object> dto = new HashMap<>();
            dto.put("eventId", event.getEventId());
            dto.put("name", event.getName());
            dto.put("status", event.getStatus());
            dto.put("createdAt", event.getCreatedAt());
            return dto;
        }).collect(Collectors.toList());

        result.put("draftEvents", dtoList);
        return result;
    }

    @Override
    public Map<String, Object> getDraftEventsByOrganizer(java.util.UUID organizerId, int count) {
        Map<String, Object> result = new HashMap<>();

        List<Event> draftEvents = eventRepository.findByOrganizer_OrganizerIdAndStatus(
                organizerId,
                Event.EventStatus.DRAFT,
                PageRequest.of(0, count)
        ).getContent();

        List<Map<String, Object>> dtoList = draftEvents.stream().map(event -> {
            Map<String, Object> dto = new HashMap<>();
            dto.put("eventId", event.getEventId());
            dto.put("name", event.getName());
            dto.put("status", event.getStatus());
            dto.put("createdAt", event.getCreatedAt());
            return dto;
        }).collect(Collectors.toList());

        result.put("draftEvents", dtoList);
        return result;
    }

    @Override
    public Map<String, Object> getTopSellingEvents(int count) {
        return getTopSellingEvents(count, null);
    }

    @Override
    public Map<String, Object> getTopSellingEvents(int count, java.util.UUID organizerId) {
        Map<String, Object> result = new HashMap<>();

        PageRequest pageRequest = PageRequest.of(0, count);
        List<Event> topEvents = (organizerId == null)
                ? eventRepository.findTopSellingEvents(pageRequest)
                : eventRepository.findTopSellingEventsByOrganizer(organizerId, pageRequest);

        result.put("events", topEvents);
        return result;
    }

    @Override
    public Map<String, Object> getTrendData() {
        return getTrendData(null);
    }

    @Override
    public Map<String, Object> getTrendData(java.util.UUID organizerId) {
        Map<String, Object> trendData = new HashMap<>();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime oneWeekAgo = now.minusWeeks(1);
        LocalDateTime twoWeeksAgo = now.minusWeeks(2);
        LocalDateTime oneMonthAgo = now.minusMonths(1);
        LocalDateTime twoMonthsAgo = now.minusMonths(2);

        // User growth trend (Only global)
        if (organizerId == null) {
            long currentWeekUsers = userRepository.findAll().stream()
                    .filter(user -> user.getCreatedAt() != null && user.getCreatedAt().isAfter(oneWeekAgo))
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
        }

        // Revenue trend
        BigDecimal currentMonthRevenue = (organizerId == null)
                ? transactionRepository.findRevenueForPeriod(oneMonthAgo, now)
                : transactionRepository.findRevenueForPeriodByOrganizer(oneMonthAgo, now, organizerId);
        BigDecimal previousMonthRevenue = (organizerId == null)
                ? transactionRepository.findRevenueForPeriod(twoMonthsAgo, oneMonthAgo)
                : transactionRepository.findRevenueForPeriodByOrganizer(twoMonthsAgo, oneMonthAgo, organizerId);

        double revenueTrend = previousMonthRevenue != null && previousMonthRevenue.compareTo(BigDecimal.ZERO) > 0
                ? ((currentMonthRevenue.subtract(previousMonthRevenue))
                        .divide(previousMonthRevenue, 4, java.math.RoundingMode.HALF_UP))
                        .multiply(BigDecimal.valueOf(100)).doubleValue()
                : 0;

        trendData.put("revenueTrend", Math.round(revenueTrend * 100.0) / 100.0);

        // Booking trend
        Long currentWeekBookings = (organizerId == null)
                ? bookingRepository.countBookingsBetweenDates(oneWeekAgo, now)
                : bookingRepository.countBookingsBetweenDatesByOrganizer(oneWeekAgo, now, organizerId);
        Long previousWeekBookings = (organizerId == null)
                ? bookingRepository.countBookingsBetweenDates(twoWeeksAgo, oneWeekAgo)
                : bookingRepository.countBookingsBetweenDatesByOrganizer(twoWeeksAgo, oneWeekAgo, organizerId);

        double bookingTrend = previousWeekBookings != null && previousWeekBookings > 0
                ? ((double) (currentWeekBookings - previousWeekBookings) / previousWeekBookings) * 100
                : 0;

        trendData.put("bookingTrend", Math.round(bookingTrend * 100.0) / 100.0);

        // Event trend
        // Simplified for now - we can implement more complex growth tracking later
        trendData.put("eventTrend", 0.0);

        return trendData;
    }
}
