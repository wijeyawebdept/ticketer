package com.ticket.ticket_booking_system.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List; // Added import
import java.util.UUID;

public class EventResponse {

    private UUID id;
    private String name;
    private String description;
    private VenueBasicResponse venue;
    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;
    private BigDecimal basePrice;
    private Integer totalCapacity;
    private Integer availableSeats;
    private String status;
    private String imageUrl;
    private UserBasicResponse organizer;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Added ticket categories field
    private List<TicketCategoryResponse> ticketCategories;

    // Builder pattern
    public static Builder builder() {
        return new Builder();
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

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

    public VenueBasicResponse getVenue() {
        return venue;
    }

    public void setVenue(VenueBasicResponse venue) {
        this.venue = venue;
    }

    public LocalDateTime getStartDateTime() {
        return startDateTime;
    }

    public void setStartDateTime(LocalDateTime startDateTime) {
        this.startDateTime = startDateTime;
    }

    public LocalDateTime getEndDateTime() {
        return endDateTime;
    }

    public void setEndDateTime(LocalDateTime endDateTime) {
        this.endDateTime = endDateTime;
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

    public Integer getAvailableSeats() {
        return availableSeats;
    }

    public void setAvailableSeats(Integer availableSeats) {
        this.availableSeats = availableSeats;
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

    public UserBasicResponse getOrganizer() {
        return organizer;
    }

    public void setOrganizer(UserBasicResponse organizer) {
        this.organizer = organizer;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    // Added getter and setter for ticketCategories
    public List<TicketCategoryResponse> getTicketCategories() {
        return ticketCategories;
    }

    public void setTicketCategories(List<TicketCategoryResponse> ticketCategories) {
        this.ticketCategories = ticketCategories;
    }

    // Builder class
    public static class Builder {
        private final EventResponse eventResponse = new EventResponse();

        public Builder id(UUID id) {
            eventResponse.setId(id);
            return this;
        }

        public Builder name(String name) {
            eventResponse.setName(name);
            return this;
        }

        public Builder description(String description) {
            eventResponse.setDescription(description);
            return this;
        }

        public Builder venue(VenueBasicResponse venue) {
            eventResponse.setVenue(venue);
            return this;
        }

        public Builder startDateTime(LocalDateTime startDateTime) {
            eventResponse.setStartDateTime(startDateTime);
            return this;
        }

        public Builder endDateTime(LocalDateTime endDateTime) {
            eventResponse.setEndDateTime(endDateTime);
            return this;
        }

        public Builder basePrice(BigDecimal basePrice) {
            eventResponse.setBasePrice(basePrice);
            return this;
        }

        public Builder totalCapacity(Integer totalCapacity) {
            eventResponse.setTotalCapacity(totalCapacity);
            return this;
        }

        public Builder availableSeats(Integer availableSeats) {
            eventResponse.setAvailableSeats(availableSeats);
            return this;
        }

        public Builder status(String status) {
            eventResponse.setStatus(status);
            return this;
        }

        public Builder imageUrl(String imageUrl) {
            eventResponse.setImageUrl(imageUrl);
            return this;
        }

        public Builder organizer(UserBasicResponse organizer) {
            eventResponse.setOrganizer(organizer);
            return this;
        }

        public Builder createdAt(LocalDateTime createdAt) {
            eventResponse.setCreatedAt(createdAt);
            return this;
        }

        public Builder updatedAt(LocalDateTime updatedAt) {
            eventResponse.setUpdatedAt(updatedAt);
            return this;
        }

        // Added builder method for ticketCategories
        public Builder ticketCategories(List<TicketCategoryResponse> ticketCategories) {
            eventResponse.setTicketCategories(ticketCategories);
            return this;
        }

        public EventResponse build() {
            return eventResponse;
        }
    }
}