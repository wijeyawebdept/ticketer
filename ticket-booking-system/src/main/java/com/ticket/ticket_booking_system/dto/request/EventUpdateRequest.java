package com.ticket.ticket_booking_system.dto.request;

import java.util.List;
import java.util.UUID;
import java.time.LocalDateTime;

import jakarta.validation.constraints.Positive;

public class EventUpdateRequest {
    
    private String name;
    private String description;
    
    private UUID venueId;
    

    @Positive(message = "Total capacity must be greater than zero")
    private Integer totalCapacity;
    
    private String status;
    private String imageUrl;
    private UUID categoryId;
    
    private LocalDateTime ticketCutoffTime;
    
    // Ticket categories for updates
    private List<TicketCategoryRequest> ticketCategories;
    
    // Getters and Setters
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public UUID getVenueId() {
        return venueId;
    }
    
    public void setVenueId(UUID venueId) {
        this.venueId = venueId;
    }
    

    public Integer getTotalCapacity() {
        return totalCapacity;
    }
    
    public void setTotalCapacity(Integer totalCapacity) {
        this.totalCapacity = totalCapacity;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public String getImageUrl() {
        return imageUrl;
    }
    
    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
    
    public UUID getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(UUID categoryId) {
        this.categoryId = categoryId;
    }
    
    public List<TicketCategoryRequest> getTicketCategories() {
        return ticketCategories;
    }
    
    public void setTicketCategories(List<TicketCategoryRequest> ticketCategories) {
        this.ticketCategories = ticketCategories;
    }
    
    public LocalDateTime getTicketCutoffTime() {
        return ticketCutoffTime;
    }
    
    public void setTicketCutoffTime(LocalDateTime ticketCutoffTime) {
        this.ticketCutoffTime = ticketCutoffTime;
    }
}