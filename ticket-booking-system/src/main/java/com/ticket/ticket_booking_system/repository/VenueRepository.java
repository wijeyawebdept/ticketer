package com.ticket.ticket_booking_system.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.Venue;

@Repository
public interface VenueRepository extends JpaRepository<Venue, UUID> {
    
    List<Venue> findByNameContainingIgnoreCase(String name);
    
    List<Venue> findByCityAndState(String city, String state);
    
    @Query("SELECT v FROM Venue v WHERE v.capacity >= :minCapacity")
    List<Venue> findByMinimumCapacity(int minCapacity);
    
    @Query("SELECT v FROM Venue v JOIN Event e ON e.venue = v GROUP BY v ORDER BY COUNT(e) DESC")
    List<Venue> findTopUsedVenues();
    
    // Find all active venues (exclude soft-deleted venues in recycle bin)
    @Query("SELECT v FROM Venue v WHERE v.isDeleted = false")
    List<Venue> findAllActive();
}