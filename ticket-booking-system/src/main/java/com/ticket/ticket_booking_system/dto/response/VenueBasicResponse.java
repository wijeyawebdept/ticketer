package com.ticket.ticket_booking_system.dto.response;

import java.util.UUID;

public class VenueBasicResponse {
    private UUID id;
    private String name;
    private String address;
    private Integer capacity;
    
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
    
    public String getAddress() {
        return address;
    }
    
    public void setAddress(String address) {
        this.address = address;
    }
    
    public Integer getCapacity() {
        return capacity;
    }
    
    public void setCapacity(Integer capacity) {
        this.capacity = capacity;
    }
    
    // Builder class
    public static class Builder {
        private final VenueBasicResponse venueResponse = new VenueBasicResponse();
        
        public Builder id(UUID id) {
            venueResponse.setId(id);
            return this;
        }
        
        public Builder name(String name) {
            venueResponse.setName(name);
            return this;
        }
        
        public Builder address(String address) {
            venueResponse.setAddress(address);
            return this;
        }
        
        public Builder capacity(Integer capacity) {
            venueResponse.setCapacity(capacity);
            return this;
        }
        
        public VenueBasicResponse build() {
            return venueResponse;
        }
    }
}