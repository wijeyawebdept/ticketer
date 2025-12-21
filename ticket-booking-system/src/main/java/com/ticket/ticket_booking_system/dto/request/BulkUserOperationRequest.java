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
public class BulkUserOperationRequest {
    
    @NotEmpty(message = "User IDs cannot be empty")
    private List<UUID> userIds;
    
    @NotNull(message = "Operation type is required")
    private OperationType operation;
    
    private String newRole; // For role change operation
    
    public enum OperationType {
        ACTIVATE,
        DEACTIVATE,
        CHANGE_ROLE,
        DELETE
    }
}
