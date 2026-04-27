package com.ticket.ticket_booking_system.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.VenueSeat;

@Repository
public interface VenueSeatRepository extends JpaRepository<VenueSeat, String> {

    List<VenueSeat> findBySection(String section);

    List<VenueSeat> findByRowLabel(String rowLabel);

    @Query("SELECT vs FROM VenueSeat vs ORDER BY vs.section, vs.rowLabel, vs.seatNumber")
    List<VenueSeat> findAllOrderedByLayout();

    @Query("SELECT vs FROM VenueSeat vs WHERE vs.section = ?1 ORDER BY vs.rowLabel, vs.seatNumber")
    List<VenueSeat> findBySectionOrdered(String section);

    @Query("SELECT vs FROM VenueSeat vs WHERE vs.venue.venueId = ?1 ORDER BY vs.section, vs.rowLabel, vs.seatNumber")
    List<VenueSeat> findByVenueOrderedByLayout(UUID venueId);

    /**
     * Returns one row per distinct seat category for a venue.
     * Each row: [categoryName (String), colorCode (String), count (Long)]
     * Ordered by SeatCategory.displayOrder so they appear consistently.
     */
    @Query("SELECT vs.category.categoryName, vs.category.colorCode, COUNT(vs) " +
           "FROM VenueSeat vs " +
           "WHERE vs.venue.venueId = :venueId " +
           "GROUP BY vs.category.categoryName, vs.category.colorCode, vs.category.displayOrder " +
           "ORDER BY vs.category.displayOrder")
    List<Object[]> findCategoryCountsByVenueId(@org.springframework.data.repository.query.Param("venueId") UUID venueId);
}
