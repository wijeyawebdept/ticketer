package com.ticket.ticket_booking_system.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.ticket.ticket_booking_system.entity.Booking.BookingStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingResponse {
    
    private UUID bookingId;
    private String bookingReference;
    private LocalDateTime bookingTime;
    private BigDecimal totalAmount;
    private BookingStatus status;
    private Boolean attended;
    private Integer ticketCount; // Number of tickets/seats in this booking
    private String currency;
    
    // User information
    private UUID userId;
    private String userFirstName;
    private String userLastName;
    private String userEmail;
    
    // Event information
    private UUID eventId;
    private String eventName;
    private String eventDescription;
    private String eventImageUrl;
    
    // Schedule information (if booking is for a specific schedule)
    private UUID scheduleId;
    private String scheduleDate;
    private String scheduleStartTime;
    private String scheduleEndTime;
    private BigDecimal scheduleFinalPrice;
    private String scheduleStatus;
    
    // Venue information
    private UUID venueId;
    private String venueName;
    private String venueAddress;

    // Customer & Payment details
    private String customerPhone;
    private String customerNic;
    private String customerEmail;
    private BigDecimal finalAmount;
    private BigDecimal discountAmount;
    private String discountInfo;
    private Boolean requestSeparateTickets;
    private String qrCodeBase64;
    
    // Booking seats
    private List<BookingSeatInfo> seats;
    
    // Cancellation info
    private LocalDateTime cancelledAt;
    private String cancellationReason;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BookingSeatInfo {
        private UUID bookingSeatId;
        private UUID seatId;
        private String ticketCode;
        private String venueSeatId;
        private String seatNumber;
        private String seatRow;
        private String section;
        private BigDecimal price;
        private Boolean isSharedAreaTicket;
        private Integer sharedAreaNumber;
        private Boolean checkedIn;
        private LocalDateTime checkedInAt;
        private String ticketQrCodeBase64;
    }
}
