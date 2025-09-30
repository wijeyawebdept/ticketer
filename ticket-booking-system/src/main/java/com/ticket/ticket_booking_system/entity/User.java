package com.ticket.ticket_booking_system.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.GenericGenerator;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "uuid2")
    @Column(name = "user_id", columnDefinition = "UUID")
    private UUID userId;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;
    
    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "active", nullable = false)
    private boolean active;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        active = true; // Default to active when user is created
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum Role {
        USER, ORGANIZER, ADMIN
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return this.password;
    }
    
    // passwordHash methods removed

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return active;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active && emailVerified;
    }
    
    // Add compatibility methods to support existing code
    public UUID getId() {
        return userId;
    }
    
    public void setId(UUID id) {
        this.userId = id;
    }
    
    // Additional compatibility methods
    public Role getRole() {
        return role;
    }
    
    public void setRole(Role role) {
        this.role = role;
    }
    
    // isActive is already defined by isAccountNonLocked()
    public void setActive(boolean active) {
        this.active = active;
    }
    
    public boolean isEmailVerified() {
        return emailVerified;
    }
    
    public void setEmailVerified(boolean emailVerified) {
        this.emailVerified = emailVerified;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getLastLoginAt() {
        return lastLoginAt;
    }
    
    public void setLastLoginAt(LocalDateTime lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }
    
    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }
    
    // Additional getter and setter methods
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
    
    // getEmail is already defined by getUsername() in UserDetails
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getPhoneNumber() {
        return phoneNumber;
    }
    
    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }
    
    public void setPassword(String password) {
        this.password = password;
    }
    
    // getUserId is already defined by getId()
    public void setUserId(UUID userId) {
        this.userId = userId;
    }
    
    // Static builder method and builder class implementation
    public static UserBuilder builder() {
        return new UserBuilder();
    }
    
    public static class UserBuilder {
        private UUID userId;
        private String firstName;
        private String lastName;
        private String email;
        private String password;
        private String phoneNumber;
        private LocalDate dateOfBirth;
        private Role role;
        private boolean active;
        private boolean emailVerified;
        private LocalDateTime createdAt;
        private LocalDateTime lastLoginAt;
        private LocalDateTime updatedAt;
        
        public UserBuilder userId(UUID userId) {
            this.userId = userId;
            return this;
        }
        
        public UserBuilder firstName(String firstName) {
            this.firstName = firstName;
            return this;
        }
        
        public UserBuilder lastName(String lastName) {
            this.lastName = lastName;
            return this;
        }
        
        public UserBuilder email(String email) {
            this.email = email;
            return this;
        }
        
        public UserBuilder password(String password) {
            this.password = password;
            return this;
        }
        
        public UserBuilder phoneNumber(String phoneNumber) {
            this.phoneNumber = phoneNumber;
            return this;
        }
        
        public UserBuilder dateOfBirth(LocalDate dateOfBirth) {
            this.dateOfBirth = dateOfBirth;
            return this;
        }
        
        public UserBuilder role(Role role) {
            this.role = role;
            return this;
        }
        
        public UserBuilder active(boolean active) {
            this.active = active;
            return this;
        }
        
        public UserBuilder emailVerified(boolean emailVerified) {
            this.emailVerified = emailVerified;
            return this;
        }
        
        public UserBuilder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }
        
        public UserBuilder lastLoginAt(LocalDateTime lastLoginAt) {
            this.lastLoginAt = lastLoginAt;
            return this;
        }
        
        public UserBuilder updatedAt(LocalDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }
        
        public User build() {
            User user = new User();
            user.userId = this.userId;
            user.firstName = this.firstName;
            user.lastName = this.lastName;
            user.email = this.email;
            user.password = this.password;
            user.phoneNumber = this.phoneNumber;
            user.dateOfBirth = this.dateOfBirth;
            user.role = this.role;
            user.active = this.active;
            user.emailVerified = this.emailVerified;
            user.createdAt = this.createdAt;
            user.lastLoginAt = this.lastLoginAt;
            user.updatedAt = this.updatedAt;
            return user;
        }
    }
}