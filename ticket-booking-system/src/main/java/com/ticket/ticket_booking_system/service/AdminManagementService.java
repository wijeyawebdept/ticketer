package com.ticket.ticket_booking_system.service;

import com.ticket.ticket_booking_system.dto.request.AdminCreateRequest;
import com.ticket.ticket_booking_system.dto.request.AdminUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.AdminResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface AdminManagementService {
    
    /**
     * Create a new admin
     * @param request Admin creation request
     * @return Created admin response
     */
    AdminResponse createAdmin(AdminCreateRequest request);
    
    /**
     * Get all admins with pagination
     * @param pageable Pagination information
     * @return Page of admin responses
     */
    Page<AdminResponse> getAllAdmins(Pageable pageable);
    
    /**
     * Get admin by ID
     * @param adminId Admin UUID
     * @return Admin response
     */
    AdminResponse getAdminById(UUID adminId);
    
    /**
     * Update admin
     * @param adminId Admin UUID
     * @param request Admin update request
     * @return Updated admin response
     */
    AdminResponse updateAdmin(UUID adminId, AdminUpdateRequest request);
    
    /**
     * Soft delete admin (move to recycle bin)
     * @param adminId Admin UUID
     */
    void softDeleteAdmin(UUID adminId);
    
    /**
     * Toggle admin active status
     * @param adminId Admin UUID
     * @return Updated admin response
     */
    AdminResponse toggleAdminStatus(UUID adminId);
}
