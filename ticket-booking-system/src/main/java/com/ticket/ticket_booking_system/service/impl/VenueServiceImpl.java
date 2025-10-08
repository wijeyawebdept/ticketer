package com.ticket.ticket_booking_system.service.impl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ticket.ticket_booking_system.entity.Seat;
import com.ticket.ticket_booking_system.entity.Venue;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;
import com.ticket.ticket_booking_system.repository.SeatRepository;
import com.ticket.ticket_booking_system.repository.VenueRepository;
import com.ticket.ticket_booking_system.service.VenueService;

@Service
public class VenueServiceImpl implements VenueService {
    
    private final VenueRepository venueRepository;
    private final SeatRepository seatRepository;
    
    public VenueServiceImpl(VenueRepository venueRepository, SeatRepository seatRepository) {
        this.venueRepository = venueRepository;
        this.seatRepository = seatRepository;
    }
    
    @Override
    public List<Venue> getAllVenues() {
        return venueRepository.findAll();
    }
    
    @Override
    public Venue getVenueById(UUID venueId) {
        return venueRepository.findById(venueId)
                .orElseThrow(() -> new ResourceNotFoundException("Venue", "venueId", venueId.toString()));
    }
    
    @Override
    @Transactional
    public Venue createVenue(Venue venue) {
        venue.setCreatedAt(LocalDateTime.now());
        venue.setUpdatedAt(LocalDateTime.now());
        Venue savedVenue = venueRepository.save(venue);
        
        // Generate seats from configuration if provided
        if (venue.getSeatingChartConfig() != null && !venue.getSeatingChartConfig().trim().isEmpty()) {
            generateSeatsFromConfig(savedVenue);
        }
        
        return savedVenue;
    }
    
    @Override
    @Transactional
    public Venue updateVenue(UUID venueId, Venue venueDetails) {
        Venue venue = getVenueById(venueId);
        
        venue.setName(venueDetails.getName());
        venue.setDescription(venueDetails.getDescription());
        venue.setAddress(venueDetails.getAddress());
        venue.setCity(venueDetails.getCity());
        venue.setState(venueDetails.getState());
        venue.setZipCode(venueDetails.getZipCode());
        venue.setCapacity(venueDetails.getCapacity());
        venue.setLayoutType(venueDetails.getLayoutType());
        venue.setSeatingChartConfig(venueDetails.getSeatingChartConfig());
        venue.setSeatingLayout(venueDetails.getSeatingLayout());
        venue.setUpdatedAt(LocalDateTime.now());
        
        return venueRepository.save(venue);
    }
    
    @Override
    @Transactional
    public void deleteVenue(UUID venueId) {
        Venue venue = getVenueById(venueId);
        venueRepository.delete(venue);
    }
    
    @Override
    public List<Venue> searchVenuesByName(String name) {
        return venueRepository.findByNameContainingIgnoreCase(name);
    }
    
    @Override
    public List<Venue> findVenuesByCityAndState(String city, String state) {
        return venueRepository.findByCityAndState(city, state);
    }
    
    @Override
    public List<Venue> findVenuesByMinimumCapacity(int minCapacity) {
        return venueRepository.findByMinimumCapacity(minCapacity);
    }
    
    /**
     * Generate seats from venue seating chart configuration
     */
    @SuppressWarnings("unchecked")
    private void generateSeatsFromConfig(Venue venue) {
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            Map<String, Object> config = objectMapper.readValue(venue.getSeatingChartConfig(), 
                    new TypeReference<Map<String, Object>>() {});
            
            Map<String, Object> sections = (Map<String, Object>) config.get("sections");

            for (String sectionName : sections.keySet()) {
                Map<String, Object> section = (Map<String, Object>) sections.get(sectionName);
                List<String> rows = (List<String>) section.get("rows");
                Integer cols = (Integer) section.get("cols");
                Number priceNumber = (Number) section.get("price");
                double price = priceNumber.doubleValue();

                for (String row : rows) {
                    for (int col = 1; col <= cols; col++) {
                        Seat seat = Seat.builder()
                                .venue(venue)
                                .section(sectionName)
                                .rowNumber(row)
                                .seatNumber(String.valueOf(col))
                                .seatType("REGULAR")
                                .price(BigDecimal.valueOf(price))
                                .isAvailable(true)
                                .isBlocked(false)
                                .build();
                        seatRepository.save(seat);
                    }
                }
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to generate seats from configuration: " + e.getMessage(), e);
        }
    }
}