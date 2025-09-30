package com.ticket.ticket_booking_system.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
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
public class UserCreateRequest {

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 50, message = "First name must be between 2 and 50 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 50, message = "Last name must be between 2 and 50 characters")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters long")
    @Pattern(regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=])(?=\\S+$).{8,}$", 
             message = "Password must contain at least one digit, one lowercase letter, one uppercase letter, one special character, and no whitespace")
    private String password;

    @Pattern(regexp = "^[0-9]{10}$", message = "Phone number must be 10 digits")
    private String phoneNumber;

    private String role; // Will be validated in the service layer
    
    // Manual getter methods for compatibility
    public String getFirstName() {
        return firstName;
    }
    
    public String getLastName() {
        return lastName;
    }
    
    public String getEmail() {
        return email;
    }
    
    public String getPassword() {
        return password;
    }
    
    public String getPhoneNumber() {
        return phoneNumber;
    }
    
    public String getRole() {
        return role;
    }
    
    // Static builder method for compatibility
    public static UserCreateRequestBuilder builder() {
        return new UserCreateRequestBuilder();
    }
    
    // Define builder class manually since Lombok's generated builder isn't being recognized
    public static class UserCreateRequestBuilder {
        private String firstName;
        private String lastName;
        private String email;
        private String password;
        private String phoneNumber;
        private String role;
        
        public UserCreateRequestBuilder firstName(String firstName) {
            this.firstName = firstName;
            return this;
        }
        
        public UserCreateRequestBuilder lastName(String lastName) {
            this.lastName = lastName;
            return this;
        }
        
        public UserCreateRequestBuilder email(String email) {
            this.email = email;
            return this;
        }
        
        public UserCreateRequestBuilder password(String password) {
            this.password = password;
            return this;
        }
        
        public UserCreateRequestBuilder phoneNumber(String phoneNumber) {
            this.phoneNumber = phoneNumber;
            return this;
        }
        
        public UserCreateRequestBuilder role(String role) {
            this.role = role;
            return this;
        }
        
        public UserCreateRequest build() {
            UserCreateRequest request = new UserCreateRequest();
            request.firstName = firstName;
            request.lastName = lastName;
            request.email = email;
            request.password = password;
            request.phoneNumber = phoneNumber;
            request.role = role;
            return request;
        }
    }
}