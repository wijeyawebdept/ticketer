package com.ticket.ticket_booking_system.dto.request;

import jakarta.validation.constraints.NotBlank;

public class GoogleLoginRequest {
    
    @NotBlank(message = "Google token is required")
    private String token;
    
    // Default constructor
    public GoogleLoginRequest() {}
    
    // Parameterized constructor
    public GoogleLoginRequest(String token) {
        this.token = token;
    }
    
    // Getters and setters
    public String getToken() {
        return token;
    }
    
    public void setToken(String token) {
        this.token = token;
    }
}
