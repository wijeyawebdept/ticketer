package com.ticket.ticket_booking_system.dto.request;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckInScanRequest {

    @NotBlank(message = "QR data or code is required")
    private String qrData;

    private UUID eventScheduleId;

    private UUID eventId;

    @Builder.Default
    private Boolean checkInAll = true;

    // Optional specific ticket code if checking in single ticket from a group
    private String ticketCode;

    // Optional list of specific ticket codes selected for partial group check-in
    private java.util.List<String> selectedTicketCodes;

    // Scan Mode: "CHECK_IN" (default) or "CHECK_OUT" (Pass-Out)
    @Builder.Default
    private String scanMode = "CHECK_IN";

    // Gate & Zone configuration
    private String gateName;
    private String allowedZone;

    // Offline scan support (original timestamp when device was offline)
    private Long offlineTimestamp;
}
