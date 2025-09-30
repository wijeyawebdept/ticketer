package com.ticket.ticket_booking_system.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserUpdateRequest {

    @Size(min = 2, max = 50, message = "First name must be between 2 and 50 characters")
    private String firstName;

    @Size(min = 2, max = 50, message = "Last name must be between 2 and 50 characters")
    private String lastName;

    @Email(message = "Email should be valid")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String email;

    @Pattern(regexp = "^\\d{10}$", message = "Phone number must be 10 digits")
    private String phoneNumber;
    
    // Manual getter methods for compatibility
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
    
    public String getPhoneNumber() {
        return phoneNumber;
    }
    
    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }
    
    // Static builder method for compatibility
    public static UserUpdateRequestBuilder builder() {
        return new UserUpdateRequestBuilder();
    }
    
    // Define builder class manually since Lombok's generated builder isn't being recognized
    public static class UserUpdateRequestBuilder {
        private String firstName;
        private String lastName;
        private String email;
        private String phoneNumber;
        
        public UserUpdateRequestBuilder firstName(String firstName) {
            this.firstName = firstName;
            return this;
        }
        
        public UserUpdateRequestBuilder lastName(String lastName) {
            this.lastName = lastName;
            return this;
        }
        
        public UserUpdateRequestBuilder email(String email) {
            this.email = email;
            return this;
        }
        
        public UserUpdateRequestBuilder phoneNumber(String phoneNumber) {
            this.phoneNumber = phoneNumber;
            return this;
        }
        
        public UserUpdateRequest build() {
            UserUpdateRequest request = new UserUpdateRequest();
            request.setFirstName(firstName);
            request.setLastName(lastName);
            request.setEmail(email);
            request.setPhoneNumber(phoneNumber);
            return request;
        }
    }
}