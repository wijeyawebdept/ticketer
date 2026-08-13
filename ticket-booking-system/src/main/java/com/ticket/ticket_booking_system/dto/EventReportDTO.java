package com.ticket.ticket_booking_system.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventReportDTO {

    // Event & Venue Metadata
    private UUID eventId;
    private String eventTitle;
    private String eventDescription;
    private String categoryName;
    private String eventStatus;
    private String bannerUrl;
    private String organizerName;
    private String organizerEmail;
    
    private UUID venueId;
    private String venueName;
    private String venueAddress;
    private String venueCity;
    private String venueType;
    private Integer totalVenueCapacity;
    private Boolean hasSharedAreas;

    // Filter Selection Info
    private UUID selectedScheduleId;
    private String selectedScheduleLabel;

    // Overall KPI Stats
    private BigDecimal totalRevenue;
    private Integer totalCapacity;
    private Integer totalTicketsSold;
    private Integer totalTicketsAvailable;
    private Integer totalTicketsHeld;
    private Integer totalTicketsLocked;
    private Double occupancyRate; // percentage (e.g. 75.5)

    // Schedules (Show Times) Breakdown
    @Builder.Default
    private List<ScheduleSummaryDTO> schedules = new ArrayList<>();

    // Category Ticket Breakdown (Seated)
    @Builder.Default
    private List<CategorySummaryDTO> categorySummaries = new ArrayList<>();

    // Shared Areas Ticket Breakdown (Standing / General Admission)
    @Builder.Default
    private List<SharedAreaSummaryDTO> sharedAreaSummaries = new ArrayList<>();

    // Customer Bookings List
    @Builder.Default
    private List<CustomerBookingRowDTO> bookingDetails = new ArrayList<>();

    // Seat Map Layout Availability (For SVG rendering)
    @Builder.Default
    private List<SeatStatusDTO> seatAvailabilityMap = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScheduleSummaryDTO {
        private UUID scheduleId;
        private LocalDateTime startTime;
        private LocalDateTime endTime;
        private String status;
        private Integer totalCapacity;
        private Integer ticketsSold;
        private Integer ticketsAvailable;
        private BigDecimal revenue;
        private Double occupancyRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategorySummaryDTO {
        private UUID categoryId;
        private String categoryName;
        private String colorCode;
        private BigDecimal unitPrice;
        private Integer totalSeats;
        private Integer ticketsSold;
        private Integer ticketsAvailable;
        private Integer ticketsHeld;
        private BigDecimal categoryRevenue;
        private Double occupancyRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SharedAreaSummaryDTO {
        private UUID categoryId;
        private String categoryName;
        private Integer sharedAreaNumber;
        private BigDecimal unitPrice;
        private Integer totalCapacity;
        private Integer ticketsSold;
        private Integer ticketsAvailable;
        private BigDecimal totalRevenue;
        private Double occupancyRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerBookingRowDTO {
        private UUID bookingId;
        private String bookingReference;
        private String customerName;
        private String customerEmail;
        private String showTimeLabel;
        private String seatNumbers; // e.g. "Section A - Row 2 - Seat 5, 6" or "Shared Area 1"
        private String ticketCategory;
        private Integer ticketCount;
        private BigDecimal totalAmount;
        private LocalDateTime bookingDate;
        private String status;
        private String paymentMethod;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatStatusDTO {
        private String seatId;
        private String section;
        private String rowLabel;
        private Integer seatNumber;
        private String categoryName;
        private String colorCode;
        private Double xPosition;
        private Double yPosition;
        private String status; // BOOKED, AVAILABLE, LOCKED, TEMPORARY_HOLD, VIP_RESERVED
        private BigDecimal price;
        private String customerName; // Optional for tooltips on seat map
    }
}
