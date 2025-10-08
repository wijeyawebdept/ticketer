package com.ticket.ticket_booking_system.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.entity.Venue;
import com.ticket.ticket_booking_system.service.VenueService;

@RestController
@RequestMapping("/api/venues")
public class VenueController {
    
    private final VenueService venueService;
    
    public VenueController(VenueService venueService) {
        this.venueService = venueService;
    }
    
    @GetMapping
    public ResponseEntity<List<Venue>> getAllVenues() {
        List<Venue> venues = venueService.getAllVenues();
        return ResponseEntity.ok(venues);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Venue> getVenueById(@PathVariable UUID id) {
        Venue venue = venueService.getVenueById(id);
        return ResponseEntity.ok(venue);
    }
    
    @GetMapping("/search")
    public ResponseEntity<List<Venue>> searchVenuesByName(@RequestParam String name) {
        List<Venue> venues = venueService.searchVenuesByName(name);
        return ResponseEntity.ok(venues);
    }
    
    @GetMapping("/location")
    public ResponseEntity<List<Venue>> findVenuesByCityAndState(
            @RequestParam String city, 
            @RequestParam String state) {
        List<Venue> venues = venueService.findVenuesByCityAndState(city, state);
        return ResponseEntity.ok(venues);
    }
    
    @GetMapping("/capacity")
    public ResponseEntity<List<Venue>> findVenuesByMinimumCapacity(@RequestParam int minCapacity) {
        List<Venue> venues = venueService.findVenuesByMinimumCapacity(minCapacity);
        return ResponseEntity.ok(venues);
    }
}