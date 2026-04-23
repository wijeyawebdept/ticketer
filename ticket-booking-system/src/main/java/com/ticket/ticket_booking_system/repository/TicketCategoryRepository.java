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

    // Deal-specific queries — ACTIVE only
    @Query("SELECT tc FROM TicketCategory tc WHERE tc.dealActive = true ORDER BY tc.createdAt DESC")
    List<TicketCategory> findAllWithActiveDeals();

    @Query("SELECT tc FROM TicketCategory tc WHERE tc.event.eventId = :eventId AND tc.dealActive = true")
    List<TicketCategory> findActiveDealsForEvent(UUID eventId);

    @Query("SELECT CASE WHEN COUNT(tc) > 0 THEN true ELSE false END FROM TicketCategory tc WHERE tc.event.eventId = :eventId AND tc.dealActive = true")
    boolean existsActiveDealForEvent(UUID eventId);

    @Query("SELECT tc FROM TicketCategory tc WHERE tc.event.organizer.id = :organizerId AND tc.dealActive = true")
    List<TicketCategory> findActiveDealsForOrganizer(UUID organizerId);

    // Deal-specific queries — ALL (active + inactive) — used by management tables
    // Also catches legacy deals created before dealType column was added (dealType IS NULL but dealActive/dealDiscountPercentage set)
    @Query("SELECT tc FROM TicketCategory tc WHERE tc.dealType IS NOT NULL OR tc.dealActive = true OR tc.dealDiscountPercentage IS NOT NULL OR tc.dealBuyQuantity IS NOT NULL ORDER BY tc.dealActive DESC, tc.createdAt DESC")
    List<TicketCategory> findAllDeals();

    @Query("SELECT tc FROM TicketCategory tc WHERE tc.event.eventId = :eventId AND (tc.dealType IS NOT NULL OR tc.dealActive = true OR tc.dealDiscountPercentage IS NOT NULL OR tc.dealBuyQuantity IS NOT NULL)")
    List<TicketCategory> findAllDealsForEvent(UUID eventId);

    @Query("SELECT tc FROM TicketCategory tc WHERE tc.event.organizer.organizerId = :organizerId AND (tc.dealType IS NOT NULL OR tc.dealActive = true OR tc.dealDiscountPercentage IS NOT NULL OR tc.dealBuyQuantity IS NOT NULL) ORDER BY tc.dealActive DESC, tc.createdAt DESC")
    List<TicketCategory> findAllDealsForOrganizer(UUID organizerId);
}