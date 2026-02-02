package com.ticket.ticket_booking_system.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.TicketCategory;

@Repository
public interface TicketCategoryRepository extends JpaRepository<TicketCategory, UUID> {

    List<TicketCategory> findByEventId(UUID eventId);

    void deleteByEventId(UUID eventId);
    
    // Delete by event's eventId (for nested object)
    @Modifying
    @Query("DELETE FROM TicketCategory tc WHERE tc.event.eventId = :eventId")
    void deleteByEventEventId(UUID eventId);
    
    // Find shared area categories for an event
    @Query("SELECT tc FROM TicketCategory tc WHERE tc.event.eventId = :eventId AND tc.isSharedArea = true ORDER BY tc.sharedAreaNumber")
    List<TicketCategory> findSharedAreaCategoriesByEventId(UUID eventId);
}