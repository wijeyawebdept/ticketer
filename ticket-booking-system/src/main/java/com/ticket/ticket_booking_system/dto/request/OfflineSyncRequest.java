package com.ticket.ticket_booking_system.dto.request;

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
public class OfflineSyncRequest {

    private UUID eventScheduleId;
    private UUID eventId;
    private String gateName;
    private List<OfflineScanItem> scans;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OfflineScanItem {
        private String qrData;
        private String ticketCode;
        private Long offlineTimestamp;
        private String scanMode; // "CHECK_IN" or "CHECK_OUT"
    }
}
