package com.ticket.ticket_booking_system.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.GenericGenerator;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "parentOrganizer"})
@Table(name = "organizers")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Organizer implements UserDetails {

    @SuppressWarnings("deprecation")
    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "uuid2")
    @Column(name = "organizer_id", columnDefinition = "UUID")
    private UUID organizerId;

    // Authentication fields from User table
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

    @Column(name = "profile_picture")
    private String profilePicture;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Role role = Role.ORGANIZER;

    @Column(name = "status", nullable = false)
    @Builder.Default
    private int active = 1; // 1 = active, 0 = deactivated, -1 = soft deleted

    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    private boolean emailVerified = false;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    // Organizer-specific fields

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_organizer_id")
    private Organizer parentOrganizer;

    @Column(name = "organization_name", nullable = false, length = 255)
    private String organizationName;

    @Column(name = "organization_type", length = 100)
    private String organizationType;

    @Column(name = "business_registration_number", length = 100)
    private String businessRegistrationNumber;

    @Column(name = "tax_id", length = 100)
    private String taxId;

    @Column(name = "business_address", columnDefinition = "TEXT")
    private String businessAddress;

    @Column(name = "business_phone", length = 20)
    private String businessPhone;

    @Column(name = "business_email", length = 255)
    private String businessEmail;

    @Column(name = "website_url", length = 500)
    private String websiteUrl;

    @Column(name = "is_verified")
    @Builder.Default
    private Boolean isVerified = false;

    @Column(name = "is_employee")
    @Builder.Default
    private Boolean isEmployee = false;

    @Column(name = "employee_position", length = 100)
    private String employeePosition;

    @Column(name = "can_create_employees")
    @Builder.Default
    private Boolean canCreateEmployees = true;

    @Column(name = "bank_account_number", length = 100)
    private String bankAccountNumber;

    @Column(name = "bank_name", length = 255)
    private String bankName;

    @Column(name = "bank_routing_number", length = 50)
    private String bankRoutingNumber;

    @Column(name = "commission_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal commissionRate = BigDecimal.ZERO;

    @Column(name = "total_events_created")
    @Builder.Default
    private Integer totalEventsCreated = 0;

    @Column(name = "total_revenue", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalRevenue = BigDecimal.ZERO;

    @Column(name = "rating", precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal rating = BigDecimal.ZERO;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "verification_documents", columnDefinition = "jsonb")
    private String verificationDocuments;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // UserDetails implementation
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_ORGANIZER"));
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return active == 1; // Only active organizers (status = 1)
    }

    @Override
    public boolean isAccountNonLocked() {
        return active == 1; // Only active organizers (status = 1)
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return active == 1; // Only active organizers (status = 1)
    }

    @Override
    public boolean isEnabled() {
        return active == 1;
    }
    
    // Helper method for backward compatibility
    public boolean isActive() {
        return active == 1;
    }

    public enum Role {
        ORGANIZER
    }
}
