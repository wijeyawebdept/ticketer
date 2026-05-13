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

    private UUID auditId;
    private UUID performedBy;
    private String performedByName;
    private String performedByEmail;
    private String action;
    private String entityType;
    private UUID entityId;
    private String oldValues;
    private String newValues;
    private String ipAddress;
    private LocalDateTime createdAt;
}
