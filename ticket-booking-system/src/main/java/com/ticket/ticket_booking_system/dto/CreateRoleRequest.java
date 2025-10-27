package com.ticket.ticket_booking_system.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateRoleRequest {
    private String roleName;
    private String roleDescription;
    private boolean canManageUsers;
    private boolean canManageEvents;
    private boolean canManageVenues;
    private boolean canManageBookings;
    private boolean canViewReports;
    private boolean canManageRoles;
}
