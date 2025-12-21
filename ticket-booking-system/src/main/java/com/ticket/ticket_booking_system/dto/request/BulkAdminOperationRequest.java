package com.ticket.ticket_booking_system.dto.request;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkAdminOperationRequest {
    
    @NotEmpty(message = "Admin IDs cannot be empty")
    private List<UUID> adminIds;
    
    @NotNull(message = "Operation type is required")
    private OperationType operation;
    
    private String newRole; // For role change operation (ADMIN, SUPER_ADMIN)
    
    public enum OperationType {
        ACTIVATE,
        DEACTIVATE,
        CHANGE_ROLE,
        DELETE
    }
}
