package com.ticket.ticket_booking_system.service;

import java.util.List;
import java.util.UUID;

import com.ticket.ticket_booking_system.entity.Venue;

public interface VenueService {
    
    List<Venue> getAllVenues();
    
    Venue getVenueById(UUID venueId);
    
    Venue createVenue(Venue venue);
    
    Venue updateVenue(UUID venueId, Venue venue);
    
    void deleteVenue(UUID venueId);
    
    List<Venue> searchVenuesByName(String name);
    
    List<Venue> findVenuesByCityAndState(String city, String state);
    
    List<Venue> findVenuesByMinimumCapacity(int minCapacity);
}