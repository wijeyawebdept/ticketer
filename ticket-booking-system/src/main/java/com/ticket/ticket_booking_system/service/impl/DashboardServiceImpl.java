package com.ticket.ticket_booking_system.service.impl;

import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.Transaction;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.repository.BookingRepository;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.TransactionRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@org.springframework.context.annotation.Primary
public class DashboardServiceImpl implements DashboardService {

    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final BookingRepository bookingRepository;
    private final TransactionRepository transactionRepository;

    @Override
    public Map<String, Object> getDashboardOverview() {
        Map<String, Object> overview = new HashMap<>();
        
        LocalDateTime today = LocalDate.now().atStartOfDay();
        LocalDateTime weekStart = today.minusDays(7);
        LocalDateTime monthStart = today.withDayOfMonth(1);
        
        // Total revenue
        BigDecimal totalRevenue = transactionRepository.findTotalRevenue();
        overview.put("totalRevenue", totalRevenue != null ? totalRevenue : BigDecimal.ZERO);
        
        // Total users
        long totalUsers = userRepository.count();
        overview.put("totalUsers", totalUsers);
        
        // Active events count
        List<Event> activeEvents = eventRepository.findByStatus(Event.EventStatus.PUBLISHED, PageRequest.of(0, 1000)).getContent();
        overview.put("activeEventsCount", activeEvents.size());
        
        // Bookings stats
        Long todayBookings = bookingRepository.countTodayBookings(today);
        overview.put("todayBookings", todayBookings != null ? todayBookings : 0);
        
        Long weekBookings = bookingRepository.countBookingsBetweenDates(weekStart, today);
        overview.put("weekBookings", weekBookings != null ? weekBookings : 0);
        
        Long monthBookings = bookingRepository.countBookingsBetweenDates(monthStart, today);
        overview.put("monthBookings", monthBookings != null ? monthBookings : 0);
        
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
        
        List<Transaction> transactions = transactionRepository.findAll(
                PageRequest.of(0, count, Sort.by(Sort.Direction.DESC, "createdAt")))
                .getContent();
        
        result.put("transactions", transactions);
        return result;
    }

    @Override
    public Map<String, Object> getUpcomingEvents(int count) {
        Map<String, Object> result = new HashMap<>();
        
        List<Event> upcomingEvents = eventRepository.findUpcomingEvents(
                LocalDateTime.now(), 
                PageRequest.of(0, count));
        
        result.put("upcomingEvents", upcomingEvents);
        return result;
    }

    @Override
    public Map<String, Object> getTopSellingEvents(int count) {
        Map<String, Object> result = new HashMap<>();
        
        List<Event> topEvents = eventRepository.findTopSellingEvents(
                PageRequest.of(0, count));
        
        result.put("topSellingEvents", topEvents);
        return result;
    }
}