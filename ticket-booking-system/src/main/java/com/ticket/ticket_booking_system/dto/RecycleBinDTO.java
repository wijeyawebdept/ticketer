package com.ticket.ticket_booking_system.dto;

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
public class RecycleBinDTO {
    private UUID recycleId;
    private String entityType;
    private UUID entityId;
    private String entityName;
    private String entityData;
    private UUID deletedBy;
    private String deletedByName;
    private LocalDateTime deletedAt;
    private String reason;
    
    // Owner tracking
    private UUID adminId;
    private UUID organizerId;
    private UUID organizerEmployeeId;
    private UUID userId;
}
