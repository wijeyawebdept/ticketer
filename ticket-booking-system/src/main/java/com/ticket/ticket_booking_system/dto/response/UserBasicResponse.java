package com.ticket.ticket_booking_system.dto.response;

import java.util.UUID;

public class UserBasicResponse {
    private UUID id;
    private String firstName;
    private String lastName;
    private String email;
    
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
    
    public String getFirstName() {
        return firstName;
    }
    
    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }
    
    public String getLastName() {
        return lastName;
    }
    
    public void setLastName(String lastName) {
        this.lastName = lastName;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    // Builder class
    public static class Builder {
        private final UserBasicResponse userResponse = new UserBasicResponse();
        
        public Builder id(UUID id) {
            userResponse.setId(id);
            return this;
        }
        
        public Builder firstName(String firstName) {
            userResponse.setFirstName(firstName);
            return this;
        }
        
        public Builder lastName(String lastName) {
            userResponse.setLastName(lastName);
            return this;
        }
        
        public Builder email(String email) {
            userResponse.setEmail(email);
            return this;
        }
        
        public UserBasicResponse build() {
            return userResponse;
        }
    }
}