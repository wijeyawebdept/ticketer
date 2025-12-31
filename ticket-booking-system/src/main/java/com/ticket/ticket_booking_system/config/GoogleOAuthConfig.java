package com.ticket.ticket_booking_system.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GoogleOAuthConfig {
    
    @Value("${google.oauth.client-id:}")
    private String clientId;
    
    public String getClientId() {
        return clientId;
    }
}
