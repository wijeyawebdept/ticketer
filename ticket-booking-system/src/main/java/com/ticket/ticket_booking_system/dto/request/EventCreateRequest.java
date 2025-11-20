package com.ticket.ticket_booking_system.dto.request;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class EventCreateRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Description is required")
    private String description;

    @NotNull(message = "Venue ID is required")
    private UUID venueId;

    @NotNull(message = "Base price is required")
    @Positive(message = "Base price must be greater than zero")
    private BigDecimal basePrice;

    @NotNull(message = "Total capacity is required")
    @Positive(message = "Total capacity must be greater than zero")
    private Integer totalCapacity;

    private String imageUrl;

    // Ticket categories for multiple pricing options
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

    public BigDecimal getBasePrice() {
        return basePrice;
    }

    public void setBasePrice(BigDecimal basePrice) {
        this.basePrice = basePrice;
    }

    public Integer getTotalCapacity() {
        return totalCapacity;
    }

    public void setTotalCapacity(Integer totalCapacity) {
        this.totalCapacity = totalCapacity;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public List<TicketCategoryRequest> getTicketCategories() {
        return ticketCategories;
    }

    public void setTicketCategories(List<TicketCategoryRequest> ticketCategories) {
        this.ticketCategories = ticketCategories;
    }
}