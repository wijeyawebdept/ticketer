package com.ticket.ticket_booking_system.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Standardized API Response wrapper for all operations
 * Provides consistent message structure across the application
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {
    
    private boolean success;
    private String message;
    private T data;
    private String operation; // e.g., "CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT"
    
    /**
     * Create a success response with data
     */
    public static <T> ApiResponse<T> success(String message, T data, String operation) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .operation(operation)
                .build();
    }
    
    /**
     * Create a success response without data
     */
    public static <T> ApiResponse<T> success(String message, String operation) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(null)
                .operation(operation)
                .build();
    }
    
    /**
     * Create an error response
     */
    public static <T> ApiResponse<T> error(String message, String operation) {
        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .data(null)
                .operation(operation)
                .build();
    }
}
