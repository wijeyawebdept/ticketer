package com.ticket.ticket_booking_system.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleDTO {
    private UUID roleId;
    private String roleName;
    private String roleDescription;
    private Boolean isSystemRole;
    private Boolean canManageUsers;
    private Boolean canManageEvents;
    private Boolean canManageVenues;
    private Boolean canManageBookings;
    private Boolean canViewReports;
    private Boolean canManageRoles;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
