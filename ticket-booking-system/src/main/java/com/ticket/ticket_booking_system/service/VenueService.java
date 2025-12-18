package com.ticket.ticket_booking_system.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.ticket.ticket_booking_system.dto.VenueResponse;
import com.ticket.ticket_booking_system.entity.Venue;

public interface VenueService {

    List<Venue> getAllVenues();

    Venue getVenueById(UUID venueId);

    Venue createVenue(Venue venue);

    Venue updateVenue(UUID venueId, Venue venue);

    void softDeleteVenue(UUID venueId);

    void deleteVenue(UUID venueId);

    List<Venue> searchVenuesByName(String name);

    List<Venue> findVenuesByCityAndState(String city, String state);

    List<Venue> findVenuesByMinimumCapacity(int minCapacity);

    // New method for seating arrangement management
    Venue updateSeatingLayout(UUID venueId, Map<String, Object> seatingLayout);
    
    // Generate template seats for a venue
    int generateSeatsForVenue(UUID venueId);
    
    // Toggle venue status (active/inactive)
    VenueResponse toggleVenueStatus(UUID venueId);
}