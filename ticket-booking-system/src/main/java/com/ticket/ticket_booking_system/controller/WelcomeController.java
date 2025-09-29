package com.ticket.ticket_booking_system.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class WelcomeController {

    @GetMapping("/")
    public Map<String, Object> welcome() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Welcome to Ticket Booking System API");
        response.put("version", "1.0.0");
        
        Map<String, String> links = new HashMap<>();
        links.put("documentation", "/swagger-ui.html");
        links.put("api-docs", "/v3/api-docs");
        links.put("auth", "/api/auth");
        
        response.put("links", links);
        
        return response;
    }
}
