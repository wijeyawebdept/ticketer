package com.ticket.ticket_booking_system.service;

import java.util.List;
import java.util.UUID;

import com.ticket.ticket_booking_system.dto.response.SeatResponse;
import com.ticket.ticket_booking_system.entity.Seat;

/**
 * Service for managing venue seating templates
 * Handles the creation and cloning of seat layouts from venues to events
 */
public interface VenueSeatingService {
    
    /**
     * Create template seats for a venue (one-time setup)
     * This is called when venue is first created with seating layout
     */
    void createVenueSeatingTemplate(UUID venueId, List<Seat> seats);
    
    /**
     * Get all template seats for a venue (without event assignment)
     */
    List<Seat> getVenueSeatingTemplate(UUID venueId);
    
    /**
     * Get all template seats for a venue as DTOs
     */
    List<SeatResponse> getVenueSeatingTemplateAsResponse(UUID venueId);
    
    /**
     * Clone venue template seats to an event
     * This creates event-specific seat instances from the venue template
     */
    void cloneSeatsToEvent(UUID venueId, UUID eventId);
    
    /**
     * Delete venue template seats (used when venue is deleted permanently)
     */
    void deleteVenueSeatingTemplate(UUID venueId);
    
    /**
     * Update seat position coordinates for frontend rendering
     */
    void updateSeatPosition(UUID seatId, Integer xPosition, Integer yPosition);
    
    /**
     * Batch update seat positions
     */
    void batchUpdateSeatPositions(List<UUID> seatIds, List<Integer> xPositions, List<Integer> yPositions);
    
    /**
     * Get total count of template seats for a venue
     */
    long countVenueSeats(UUID venueId);
}
