package com.ticket.ticket_booking_system.dto.response;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckInStatsResponse {

    private UUID eventId;
    private String eventName;
    private UUID scheduleId;
    private String scheduleDate;
    private String scheduleTime;

    private Long totalCapacity;
    private Long totalBooked;
    private Long totalCheckedIn;
    private Long totalPendingArrival;
    private Double checkInPercentage;

    // Seated vs Shared Area breakdowns
    private Long totalSeatedBooked;
    private Long totalSeatedCheckedIn;
    private Long totalSharedBooked;
    private Long totalSharedCheckedIn;

    // Headcount per Shared Area number
    private Map<Integer, SharedAreaStats> sharedAreaBreakdown;

    // Recent check-in feed
    private List<RecentCheckInItem> recentCheckIns;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SharedAreaStats {
        private Integer sharedAreaNumber;
        private String categoryName;
        private Long capacity;
        private Long booked;
        private Long checkedIn;
        private Long pending;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentCheckInItem {
        private String customerName;
        private String bookingReference;
        private String ticketCode;
        private String seatIdentifier; // e.g. "Row A, Seat 1" or "Shared Area 1"
        private String checkedInAtTime;
        private boolean isSharedArea;
    }
}
