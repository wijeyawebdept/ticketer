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
    // totalRevenue is NET revenue actually kept: (confirmed + refunded bookings' charged amount) - refunds paid out.
    private BigDecimal totalRevenue;
    // Gross amount actually charged/captured (before refunds), for confirmed and later-refunded bookings.
    private BigDecimal grossRevenue;
    // Total value of deals/coupons applied (informational - already baked into totalAmount, not subtracted again).
    private BigDecimal totalDiscounts;
    // Total successfully refunded (from Transaction records, not the unused Booking.refundAmount column).
    private BigDecimal totalRefunds;
    private BigDecimal totalPromoDiscounts;
    private BigDecimal earlyBirdTotalSavings;
    private Integer totalCapacity;
    private Integer totalTicketsSold;
    private Integer earlyBirdTotalTicketsSold;
    private BigDecimal earlyBirdTotalRevenue;
    private Integer totalTicketsAvailable;
    private Integer totalTicketsHeld;
    private Integer totalTicketsLocked;
    private Double occupancyRate; // percentage (e.g. 75.5)

    // Daily Sales Timeline Breakdown
    @Builder.Default
    private List<SalesByDateReportDTO.DailySalesSummaryDTO> dailySales = new ArrayList<>();

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

    // Deals configured for this event (active or previously active) - reliable, from TicketCategory
    @Builder.Default
    private List<DealConfigDTO> configuredDeals = new ArrayList<>();

    // Best-effort usage breakdown grouped by the discount label recorded at booking time.
    // Bookings don't carry a real FK to a Deal record, so this is grouped by label text, not a
    // structured deal ID - see DealUsageDTO javadoc for the caveat.
    @Builder.Default
    private List<DealUsageDTO> dealUsageSummaries = new ArrayList<>();

    // Promo codes configured for this event (event-scoped, category-scoped, and global)
    @Builder.Default
    private List<PromoCodeConfigDTO> configuredPromoCodes = new ArrayList<>();

    // Promo code usage summaries
    @Builder.Default
    private List<PromoCodeUsageDTO> promoCodeUsageSummaries = new ArrayList<>();

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
        // Early Bird fields
        private BigDecimal earlyBirdPrice;
        private Integer earlyBirdCapacity;
        private Integer earlyBirdTicketsSold;
        private LocalDateTime salesStartDate;
        private LocalDateTime salesEndDate;
        private Boolean earlyBirdActive;
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
        // Early Bird fields
        private BigDecimal earlyBirdPrice;
        private Integer earlyBirdCapacity;
        private Integer earlyBirdTicketsSold;
        private LocalDateTime salesStartDate;
        private LocalDateTime salesEndDate;
        private Boolean earlyBirdActive;
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
        private BigDecimal discountAmount;
        private String discountInfo;
        private String promoCode;
        private LocalDateTime bookingDate;
        private String status;
        private String paymentMethod;
        private Boolean isEarlyBird;
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

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DealConfigDTO {
        private UUID categoryId;
        private String categoryName;
        private Boolean dealActive;
        private String dealType; // PERCENTAGE_DISCOUNT | BUY_X_GET_Y_FREE
        private String dealLabel;
        private BigDecimal dealDiscountPercentage;
        private Integer dealBuyQuantity;
        private Integer dealFreeQuantity;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DealUsageDTO {
        private String label;
        private Integer timesUsed;
        private BigDecimal totalDiscountGiven;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PromoCodeConfigDTO {
        private UUID id;
        private String code;
        private String description;
        private String scope; // ALL_EVENTS, EVENT, TICKET_CATEGORY
        private BigDecimal discountPercentage;
        private BigDecimal maxDiscountAmount;
        private String ticketCategoryName;
        private Integer usageLimit;
        private Integer usageCount;
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private Boolean isActive;
        private String statusLabel; // ACTIVE, EXPIRED, EXHAUSTED, UPCOMING, INACTIVE
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PromoCodeUsageDTO {
        private String code;
        private Integer timesUsed;
        private BigDecimal totalDiscountGiven;
    }
}
