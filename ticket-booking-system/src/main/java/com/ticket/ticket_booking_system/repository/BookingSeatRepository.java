package com.ticket.ticket_booking_system.repository;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.BookingSeat;

@Repository
public interface BookingSeatRepository extends JpaRepository<BookingSeat, UUID> {

    /**
     * Find all venue seat IDs that are booked for a specific event schedule.
     * Only includes confirmed and pending bookings (excludes cancelled/refunded).
     *
     * @param scheduleId the event schedule UUID
     * @return set of booked venue seat IDs
     */
    @Query("SELECT bs.venueSeatId FROM BookingSeat bs " +
           "WHERE bs.booking.eventSchedule.scheduleId = :scheduleId " +
           "AND bs.venueSeatId IS NOT NULL " +
           "AND bs.booking.status IN ('CONFIRMED', 'PENDING')")
    Set<String> findBookedVenueSeatIdsByScheduleId(UUID scheduleId);

    /**
     * Find venue seat IDs with a CONFIRMED (successfully paid) booking only -
     * used where display must distinguish "actually sold" from "payment still pending".
     */
    @Query("SELECT bs.venueSeatId FROM BookingSeat bs " +
           "WHERE bs.booking.eventSchedule.scheduleId = :scheduleId " +
           "AND bs.venueSeatId IS NOT NULL " +
           "AND bs.booking.status = 'CONFIRMED'")
    Set<String> findConfirmedVenueSeatIdsByScheduleId(UUID scheduleId);

    /**
     * Find all booking seats for a specific event schedule.
     *
     * @param scheduleId the event schedule UUID
     * @return list of booking seats
     */
    @Query("SELECT bs FROM BookingSeat bs " +
           "WHERE bs.booking.eventSchedule.scheduleId = :scheduleId " +
           "AND bs.booking.status IN ('CONFIRMED', 'PENDING')")
    List<BookingSeat> findByScheduleId(UUID scheduleId);

    /**
     * Count booked seats for a specific event schedule.
     *
     * @param scheduleId the event schedule UUID
     * @return count of booked seats
     */
    @Query("SELECT COUNT(bs) FROM BookingSeat bs " +
           "WHERE bs.booking.eventSchedule.scheduleId = :scheduleId " +
           "AND bs.venueSeatId IS NOT NULL " +
           "AND bs.booking.status IN ('CONFIRMED', 'PENDING')")
    Long countBookedSeatsForSchedule(UUID scheduleId);

    /**
     * Count held seats (pending bookings) for a specific event schedule.
     *
     * @param scheduleId the event schedule UUID
     * @return count of held seats
     */
    @Query("SELECT COUNT(bs) FROM BookingSeat bs " +
           "WHERE bs.booking.eventSchedule.scheduleId = :scheduleId " +
           "AND bs.venueSeatId IS NOT NULL " +
           "AND bs.booking.status = 'PENDING'")
    Long countHeldSeatsForSchedule(UUID scheduleId);

    /**
     * Check if a specific seat is booked for a schedule.
     *
     * @param venueSeatId the venue seat ID
     * @param scheduleId the event schedule UUID
     * @return true if seat is booked
     */
    @Query("SELECT COUNT(bs) > 0 FROM BookingSeat bs " +
           "WHERE bs.venueSeatId = :venueSeatId " +
           "AND bs.booking.eventSchedule.scheduleId = :scheduleId " +
           "AND bs.booking.status IN ('CONFIRMED', 'PENDING')")
    boolean isSeatBooked(String venueSeatId, UUID scheduleId);

    /**
     * Delete booking seat by venue seat ID and schedule ID.
     * Used by admin to unreserve a seat.
     *
     * @param venueSeatId the venue seat ID
     * @param scheduleId the event schedule UUID
     */
    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM BookingSeat bs " +
           "WHERE bs.venueSeatId = :venueSeatId " +
           "AND bs.booking.eventSchedule.scheduleId = :scheduleId")
    void deleteByVenueSeatIdAndScheduleId(String venueSeatId, UUID scheduleId);
}
