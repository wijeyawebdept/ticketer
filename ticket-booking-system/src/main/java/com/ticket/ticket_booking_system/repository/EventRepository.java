package com.ticket.ticket_booking_system.repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.entity.Venue;

@Repository
public interface EventRepository extends JpaRepository<Event, UUID> {

       Page<Event> findByStatus(Event.EventStatus status, Pageable pageable);

       java.util.Optional<Event> findBySlug(String slug);

       List<Event> findByStatusAndNotificationSentFalse(Event.EventStatus status);

       Page<Event> findByOrganizer(User organizer, Pageable pageable);

       Page<Event> findByVenue(Venue venue, Pageable pageable);

       Page<Event> findByNameContainingIgnoreCase(String name, Pageable pageable);

       @Query("SELECT e FROM Event e JOIN Booking b ON b.event = e GROUP BY e ORDER BY COUNT(b) DESC")
       List<Event> findTopSellingEvents(Pageable pageable);

       @Query("SELECT e FROM Event e JOIN Booking b ON b.event = e WHERE e.organizer.organizerId = :organizerId GROUP BY e ORDER BY COUNT(b) DESC")
       List<Event> findTopSellingEventsByOrganizer(UUID organizerId, Pageable pageable);

       long countByStatus(Event.EventStatus status);

       // Add JOIN FETCH queries to avoid LazyInitializationException
       // Changed to LEFT JOIN FETCH for organizer to include events created by
       // ADMIN/SUPER_ADMIN (organizer_id = NULL)
       // Filter out soft-deleted events (is_deleted = false)
       @Query("SELECT e FROM Event e JOIN FETCH e.venue v LEFT JOIN FETCH e.organizer u LEFT JOIN FETCH e.ticketCategories tc WHERE e.isDeleted = false")
       Page<Event> findAllWithVenueAndOrganizerAndTicketCategories(Pageable pageable);

       @Query("SELECT e FROM Event e JOIN FETCH e.venue v JOIN FETCH e.organizer u LEFT JOIN FETCH e.ticketCategories tc WHERE e.organizer = :organizer AND e.isDeleted = false")
       Page<Event> findByOrganizerWithVenueAndOrganizerAndTicketCategories(Organizer organizer, Pageable pageable);

       // Organizer-specific count queries
       long countByOrganizer_OrganizerId(UUID organizerId);

       long countByOrganizer_OrganizerIdAndStatus(UUID organizerId, Event.EventStatus status);

       Page<Event> findByOrganizer_OrganizerIdAndStatus(UUID organizerId, Event.EventStatus status, Pageable pageable);

       // Find all events by organizer ID
       List<Event> findByOrganizer_OrganizerId(UUID organizerId);

       // Same as above, excluding soft-deleted (recycle bin) events - used for reporting/listing
       List<Event> findByOrganizer_OrganizerIdAndIsDeletedFalse(UUID organizerId);

       // All events excluding soft-deleted (recycle bin) ones - used for reporting/listing
       List<Event> findAllByIsDeletedFalse();

       // Delete all events of a specific organizer
       void deleteByOrganizer_OrganizerId(UUID organizerId);

       // Public event queries (no authentication required)
       @Query("SELECT e FROM Event e JOIN FETCH e.venue v LEFT JOIN FETCH e.organizer o LEFT JOIN FETCH e.ticketCategories tc "
                     +
                     "WHERE e.status = 'PUBLISHED' AND e.isDeleted = false " +
                     "ORDER BY e.createdAt DESC")
       Page<Event> findAllPublishedEvents(Pageable pageable);

       @Query("SELECT e FROM Event e JOIN FETCH e.venue v LEFT JOIN FETCH e.organizer o LEFT JOIN FETCH e.ticketCategories tc "
                     +
                     "WHERE e.status = 'PUBLISHED' AND e.isDeleted = false " +
                     "ORDER BY e.createdAt DESC")
       Page<Event> findUpcomingPublishedEvents(Pageable pageable);

       @Query("SELECT e FROM Event e JOIN FETCH e.venue v LEFT JOIN FETCH e.organizer o LEFT JOIN FETCH e.ticketCategories tc "
                     +
                     "WHERE e.status = 'PUBLISHED' AND e.isDeleted = false " +
                     "AND e.category.id = :categoryId " +
                     "ORDER BY e.createdAt DESC")
       Page<Event> findPublishedEventsByCategory(UUID categoryId, Pageable pageable);

       @Query("SELECT e FROM Event e JOIN FETCH e.venue v LEFT JOIN FETCH e.organizer o LEFT JOIN FETCH e.ticketCategories tc "
                     +
                     "WHERE e.status = 'PUBLISHED' AND e.isDeleted = false " +
                     "AND (LOWER(e.name) LIKE LOWER(CONCAT('%', :query, '%')) " +
                     "OR LOWER(e.description) LIKE LOWER(CONCAT('%', :query, '%'))) " +
                     "ORDER BY e.createdAt DESC")
       Page<Event> searchPublishedEvents(String query, Pageable pageable);

       @Query("SELECT e FROM Event e WHERE e.status = 'PUBLISHED' AND e.isDeleted = false " +
                     "AND EXISTS (SELECT es FROM EventSchedule es WHERE es.event = e AND es.isDeleted = false) " +
                     "AND NOT EXISTS (SELECT es FROM EventSchedule es WHERE es.event = e AND es.isDeleted = false " +
                     "AND (es.scheduleDate > :currentDate OR (es.scheduleDate = :currentDate AND es.endTime >= :currentTime)))")
       List<Event> findExpiredEvents(@Param("currentDate") LocalDate currentDate,
                     @Param("currentTime") LocalTime currentTime);
}