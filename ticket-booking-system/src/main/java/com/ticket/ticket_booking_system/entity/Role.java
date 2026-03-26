package com.ticket.ticket_booking_system.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "roles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Role {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "role_id", columnDefinition = "UUID")
    private UUID roleId;

    @Column(name = "role_name", unique = true, nullable = false, length = 50)
    private String roleName;

    @Column(name = "role_description", columnDefinition = "TEXT")
    private String roleDescription;

    @Column(name = "is_system_role", nullable = false)
    @Builder.Default
    private Boolean isSystemRole = false;

    @Column(name = "can_manage_users", nullable = false)
    @Builder.Default
    private Boolean canManageUsers = false;

    @Column(name = "can_manage_events", nullable = false)
    @Builder.Default
    private Boolean canManageEvents = false;

    @Column(name = "can_manage_venues", nullable = false)
    @Builder.Default
    private Boolean canManageVenues = false;

    @Column(name = "can_manage_bookings", nullable = false)
    @Builder.Default
    private Boolean canManageBookings = false;

    @Column(name = "can_view_reports", nullable = false)
    @Builder.Default
    private Boolean canViewReports = false;

    @Column(name = "can_manage_roles", nullable = false)
    @Builder.Default
    private Boolean canManageRoles = false;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
