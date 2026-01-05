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
public class BulkEventCategoryOperationRequest {
    
    @NotEmpty(message = "Category IDs cannot be empty")
    private List<UUID> categoryIds;
    
    @NotNull(message = "Operation type is required")
    private OperationType operation;
    
    public enum OperationType {
        ACTIVATE,
        DEACTIVATE,
        DELETE,
        RESTORE
    }
}
