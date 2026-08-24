package com.ticket.ticket_booking_system.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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
public class CheckInResponse {

    private boolean valid;
    private boolean alreadyCheckedIn;
    private String message;
    private String statusType; // "SUCCESS", "ALREADY_CHECKED_IN", "INVALID_EVENT", "CANCELLED", "ERROR"

    private UUID bookingId;
    private String bookingReference;
    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private String customerNic;

    private UUID eventId;
    private String eventName;
    private UUID scheduleId;
    private String scheduleDate;
    private String scheduleTime;
    private String venueName;

    private Integer totalTickets;
    private Integer checkedInTickets;
    private LocalDateTime checkedInAt;
    private String checkedInByName;

    private List<CheckInTicketDetail> seatedTickets;
    private List<CheckInTicketDetail> sharedAreaTickets;
    private List<CheckInTicketDetail> allTickets;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CheckInTicketDetail {
        private UUID bookingSeatId;
        private String ticketCode;
        private String venueSeatId;
        private String section;
        private String rowLabel;
        private String seatNumber;
        private Boolean isSharedAreaTicket;
        private Integer sharedAreaNumber;
        private String categoryName;
        private BigDecimal price;
        private Boolean checkedIn;
        private LocalDateTime checkedInAt;
    }
}
