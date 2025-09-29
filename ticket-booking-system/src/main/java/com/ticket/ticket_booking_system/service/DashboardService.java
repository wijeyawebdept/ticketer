package com.ticket.ticket_booking_system.service;

import java.util.Map;

public interface DashboardService {

    Map<String, Object> getDashboardOverview();

    Map<String, Object> getAnalyticsByPeriod(String period);

    Map<String, Object> getRevenueChartData(String period, String startDate, String endDate);

    Map<String, Object> getRecentTransactions(int count);

    Map<String, Object> getUpcomingEvents(int count);

    Map<String, Object> getTopSellingEvents(int count);
}