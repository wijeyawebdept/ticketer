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
public class AuditLogResponse {
    
    private UUID logId;
    private UUID adminId;
    private String adminEmail;
    private String adminName;
    private String action;
    private String entityType;
    private UUID entityId;
    private String details;
    private LocalDateTime timestamp;
}
