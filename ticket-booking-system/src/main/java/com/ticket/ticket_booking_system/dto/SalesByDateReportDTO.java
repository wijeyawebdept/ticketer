package com.ticket.ticket_booking_system.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.ticket.ticket_booking_system.dto.EventReportDTO.CustomerBookingRowDTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalesByDateReportDTO {

    private LocalDate startDate;
    private LocalDate endDate;
    private String dateRangeLabel;

    // KPI Summary
    private BigDecimal totalRevenue;        // Net revenue (Gross - Refunds)
    private BigDecimal grossRevenue;        // Gross sales before refunds
    private BigDecimal totalRefunds;        // Total refunds paid out
    private BigDecimal totalDiscounts;      // Total discounts (Deals + Promo codes)
    private BigDecimal totalPromoDiscounts; // Total promo code discounts
    private BigDecimal totalEarlyBirdSavings; // Savings given via early bird pricing
    private Integer totalTicketsSold;
    private Integer earlyBirdTicketsSold;
    private Integer totalBookingsCount;
    private Integer promoBookingsCount;
    private Integer activeEventsCount;

    // Daily breakdown list (ordered by date)
    @Builder.Default
    private List<DailySalesSummaryDTO> dailySales = new ArrayList<>();

    // Event performance summary across the selected period
    @Builder.Default
    private List<EventSalesSummaryDTO> eventSummaries = new ArrayList<>();

    // Customer bookings list for the selected period
    @Builder.Default
    private List<CustomerBookingRowDTO> bookingDetails = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailySalesSummaryDTO {
        private LocalDate date;
        private String formattedDate; // e.g. "Aug 20, 2026"
        private Integer totalTicketsSold;
        private Integer earlyBirdTicketsSold;
        private BigDecimal totalRevenue;     // Net revenue
        private BigDecimal grossRevenue;     // Gross sales
        private BigDecimal totalRefunds;     // Refunds on this date
        private BigDecimal totalDiscounts;   // Deal + Promo discounts
        private BigDecimal promoDiscounts;   // Promo discounts
        private Integer bookingCount;
        private Integer activeEventsCount;

        @Builder.Default
        private List<DailyEventSalesDTO> eventBreakdowns = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyEventSalesDTO {
        private UUID eventId;
        private String eventTitle;
        private String organizerName;
        private String categoryName;
        private String venueName;
        private Integer ticketsSold;
        private Integer earlyBirdTicketsSold;
        private BigDecimal revenue;        // Net revenue
        private BigDecimal grossRevenue;   // Gross sales
        private BigDecimal discounts;      // Discounts
        private BigDecimal promoDiscounts; // Promo discounts
        private BigDecimal refunds;        // Refunds
        private Integer bookingCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EventSalesSummaryDTO {
        private UUID eventId;
        private String eventTitle;
        private String organizerName;
        private String categoryName;
        private String venueName;
        private String status;
        private Integer totalTicketsSold;
        private Integer earlyBirdTicketsSold;
        private Integer earlyBirdCapacity;
        private BigDecimal earlyBirdPrice;
        private Boolean earlyBirdActive;
        private BigDecimal regularPrice;
        private BigDecimal totalRevenue;    // Net revenue
        private BigDecimal grossRevenue;   // Gross revenue
        private BigDecimal totalDiscounts; // Discounts
        private BigDecimal promoDiscounts; // Promo code discounts
        private BigDecimal totalRefunds;   // Refunds
        private Integer bookingCount;
        private Integer configuredPromoCodesCount;
    }
}
