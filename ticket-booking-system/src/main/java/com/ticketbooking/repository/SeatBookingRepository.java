package com.ticketbooking.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ticketbooking.entity.SeatBooking;
import com.ticketbooking.entity.SeatBooking.SeatStatus;

@Repository
public interface SeatBookingRepository extends JpaRepository<SeatBooking, Long> {

    List<SeatBooking> findByEventScheduleId(Long eventScheduleId);

    Optional<SeatBooking> findBySeat_SeatIdAndEventScheduleId(String seatId, Long eventScheduleId);

    @Query("SELECT sb FROM SeatBooking sb WHERE sb.eventScheduleId = :scheduleId AND sb.status = :status")
    List<SeatBooking> findByEventScheduleIdAndStatus(
        @Param("scheduleId") Long scheduleId, 
        @Param("status") SeatStatus status
    );

    @Query("SELECT sb.seat.seatId FROM SeatBooking sb WHERE sb.eventScheduleId = :scheduleId AND sb.status IN :statuses")
    List<String> findSeatIdsByEventScheduleIdAndStatusIn(
        @Param("scheduleId") Long scheduleId, 
        @Param("statuses") List<SeatStatus> statuses
    );

    @Query("SELECT sb FROM SeatBooking sb WHERE sb.status = 'TEMPORARY_HOLD' AND sb.holdExpiresAt < :now")
    List<SeatBooking> findExpiredHolds(@Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE SeatBooking sb SET sb.status = 'AVAILABLE', sb.holdExpiresAt = NULL WHERE sb.status = 'TEMPORARY_HOLD' AND sb.holdExpiresAt < :now")
    int releaseExpiredHolds(@Param("now") LocalDateTime now);

    @Query("SELECT COUNT(sb) FROM SeatBooking sb WHERE sb.eventScheduleId = :scheduleId AND sb.status = 'AVAILABLE'")
    long countAvailableSeats(@Param("scheduleId") Long scheduleId);

    boolean existsBySeat_SeatIdAndEventScheduleIdAndStatus(String seatId, Long eventScheduleId, SeatStatus status);
}
