package com.ticket.ticket_booking_system.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private UUID id;
    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
    private String role;
    private boolean active;
    private boolean emailVerified;
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
    
    // Manual getter methods for compatibility
    public UUID getId() {
        return id;
    }
    
    public String getFirstName() {
        return firstName;
    }
    
    public String getLastName() {
        return lastName;
    }
    
    public String getEmail() {
        return email;
    }
    
    public String getPhoneNumber() {
        return phoneNumber;
    }
    
    public String getRole() {
        return role;
    }
    
    public boolean isActive() {
        return active;
    }
    
    public boolean isEmailVerified() {
        return emailVerified;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public LocalDateTime getLastLoginAt() {
        return lastLoginAt;
    }
    
    // Static builder method for compatibility
    public static UserResponseBuilder builder() {
        return new UserResponseBuilder();
    }
    
    // Define builder class manually since Lombok's generated builder isn't being recognized
    public static class UserResponseBuilder {
        private UUID id;
        private String firstName;
        private String lastName;
        private String email;
        private String phoneNumber;
        private String role;
        private boolean active;
        private boolean emailVerified;
        private LocalDateTime createdAt;
        private LocalDateTime lastLoginAt;
        
        public UserResponseBuilder id(UUID id) {
            this.id = id;
            return this;
        }
        
        public UserResponseBuilder firstName(String firstName) {
            this.firstName = firstName;
            return this;
        }
        
        public UserResponseBuilder lastName(String lastName) {
            this.lastName = lastName;
            return this;
        }
        
        public UserResponseBuilder email(String email) {
            this.email = email;
            return this;
        }
        
        public UserResponseBuilder phoneNumber(String phoneNumber) {
            this.phoneNumber = phoneNumber;
            return this;
        }
        
        public UserResponseBuilder role(String role) {
            this.role = role;
            return this;
        }
        
        public UserResponseBuilder active(boolean active) {
            this.active = active;
            return this;
        }
        
        public UserResponseBuilder emailVerified(boolean emailVerified) {
            this.emailVerified = emailVerified;
            return this;
        }
        
        public UserResponseBuilder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }
        
        public UserResponseBuilder lastLoginAt(LocalDateTime lastLoginAt) {
            this.lastLoginAt = lastLoginAt;
            return this;
        }
        
        public UserResponse build() {
            UserResponse response = new UserResponse();
            response.id = this.id;
            response.firstName = this.firstName;
            response.lastName = this.lastName;
            response.email = this.email;
            response.phoneNumber = this.phoneNumber;
            response.role = this.role;
            response.active = this.active;
            response.emailVerified = this.emailVerified;
            response.createdAt = this.createdAt;
            response.lastLoginAt = this.lastLoginAt;
            return response;
        }
    }
}