package com.ticket.ticket_booking_system.service;

import com.ticket.ticket_booking_system.dto.request.OrganizerCreateRequest;
import com.ticket.ticket_booking_system.dto.request.OrganizerUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.OrganizerResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface OrganizerManagementService {
    
    /**
     * Create a new organizer
     * @param request Organizer creation request
     * @return Created organizer response
     */
    OrganizerResponse createOrganizer(OrganizerCreateRequest request);
    
    /**
     * Get all organizers with pagination
     * @param pageable Pagination information
     * @return Page of organizer responses
     */
    Page<OrganizerResponse> getAllOrganizers(Pageable pageable);
    
    /**
     * Get organizer by ID
     * @param organizerId Organizer UUID
     * @return Organizer response
     */
    OrganizerResponse getOrganizerById(UUID organizerId);
    
    /**
     * Update organizer
     * @param organizerId Organizer UUID
     * @param request Organizer update request
     * @return Updated organizer response
     */
    OrganizerResponse updateOrganizer(UUID organizerId, OrganizerUpdateRequest request);
    
    /**
     * Soft delete organizer (move to recycle bin)
     * @param organizerId Organizer UUID
     */
    void softDeleteOrganizer(UUID organizerId);
    
    /**
     * Toggle organizer active status
     * @param organizerId Organizer UUID
     * @return Updated organizer response
     */
    OrganizerResponse toggleOrganizerStatus(UUID organizerId);
}
