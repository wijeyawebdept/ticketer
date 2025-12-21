package com.ticket.ticket_booking_system.service;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.ticket.ticket_booking_system.dto.request.AdminCreateRequest;
import com.ticket.ticket_booking_system.dto.request.AdminUpdateRequest;
import com.ticket.ticket_booking_system.dto.request.BulkAdminOperationRequest;
import com.ticket.ticket_booking_system.dto.response.AdminResponse;

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
     * Search admins with filters
     * @param searchTerm Search term for name/email
     * @param active Active status filter
     * @param pageable Pagination information
     * @return Page of admin responses
     */
    Page<AdminResponse> searchAdmins(String searchTerm, Boolean active, Pageable pageable);
    
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
    
    /**
     * Activate admin
     * @param adminId Admin UUID
     * @return Updated admin response
     */
    AdminResponse activateAdmin(UUID adminId);
    
    /**
     * Deactivate admin
     * @param adminId Admin UUID
     * @return Updated admin response
     */
    AdminResponse deactivateAdmin(UUID adminId);
    
    /**
     * Perform bulk operations on multiple admins
     * @param request Bulk operation request with admin IDs and operation type
     * @return Number of successfully processed admins
     */
    int bulkOperation(BulkAdminOperationRequest request);
}
