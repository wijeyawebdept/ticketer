package com.ticket.ticket_booking_system.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckInAttendeeDTO {

    private UUID bookingSeatId;
    private UUID bookingId;
    private String bookingReference;
    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private String customerNic;

    private String ticketCode;
    private String venueSeatId;
    private String section;
    private String rowLabel;
    private String seatNumber;

    private Boolean isSharedAreaTicket;
    private Integer sharedAreaNumber;
    private String categoryName;

    private Boolean checkedIn;
    private LocalDateTime checkedInAt;
    private String checkedInByName;
}
