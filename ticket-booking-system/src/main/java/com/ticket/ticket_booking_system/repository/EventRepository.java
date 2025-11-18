package com.ticket.ticket_booking_system.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.entity.Venue;

@Repository
public interface EventRepository extends JpaRepository<Event, UUID> {

    Page<Event> findByStatus(Event.EventStatus status, Pageable pageable);

    Page<Event> findByOrganizer(User organizer, Pageable pageable);

    Page<Event> findByVenue(Venue venue, Pageable pageable);

    Page<Event> findByNameContainingIgnoreCase(String name, Pageable pageable);

    List<Event> findByStartDateTimeBetween(LocalDateTime start, LocalDateTime end);

    @Query("SELECT e FROM Event e WHERE e.startDateTime >= :now AND e.status = 'PUBLISHED' ORDER BY e.startDateTime ASC")
    List<Event> findUpcomingEvents(LocalDateTime now);

    @Query("SELECT e FROM Event e JOIN Booking b ON b.event = e GROUP BY e ORDER BY COUNT(b) DESC")
    List<Event> findTopSellingEvents(Pageable pageable);

    // Add JOIN FETCH queries to avoid LazyInitializationException
    // Changed to LEFT JOIN FETCH for organizer to include events created by ADMIN/SUPER_ADMIN (organizer_id = NULL)
    // Filter out soft-deleted events (is_deleted = false)
    @Query("SELECT e FROM Event e JOIN FETCH e.venue v LEFT JOIN FETCH e.organizer u LEFT JOIN FETCH e.ticketCategories tc WHERE e.isDeleted = false")
    Page<Event> findAllWithVenueAndOrganizerAndTicketCategories(Pageable pageable);

    @Query("SELECT e FROM Event e JOIN FETCH e.venue v JOIN FETCH e.organizer u LEFT JOIN FETCH e.ticketCategories tc WHERE e.organizer = :organizer AND e.isDeleted = false")
    Page<Event> findByOrganizerWithVenueAndOrganizerAndTicketCategories(User organizer, Pageable pageable);
}