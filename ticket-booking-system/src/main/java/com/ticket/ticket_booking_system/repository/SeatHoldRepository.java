package com.ticket.ticket_booking_system.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.SeatHold;

@Repository
public interface SeatHoldRepository extends JpaRepository<SeatHold, UUID> {

    /**
     * Find all active (non-expired) holds for a specific schedule.
     */
    @Query("SELECT sh FROM SeatHold sh WHERE sh.eventSchedule.scheduleId = :scheduleId " +
           "AND (sh.isPermanent = true OR sh.expiresAt > :now)")
    List<SeatHold> findActiveHoldsByScheduleId(UUID scheduleId, LocalDateTime now);

    /**
     * Find all venue seat IDs that are currently held for a specific schedule.
     */
    @Query("SELECT sh.venueSeatId FROM SeatHold sh WHERE sh.eventSchedule.scheduleId = :scheduleId " +
           "AND (sh.isPermanent = true OR sh.expiresAt > :now)")
    Set<String> findHeldVenueSeatIdsByScheduleId(UUID scheduleId, LocalDateTime now);

    /**
     * Count active holds for a specific schedule.
     */
    @Query("SELECT COUNT(sh) FROM SeatHold sh WHERE sh.eventSchedule.scheduleId = :scheduleId " +
           "AND (sh.isPermanent = true OR sh.expiresAt > :now)")
    Long countActiveHoldsByScheduleId(UUID scheduleId, LocalDateTime now);

    /**
     * Find a specific hold by venue seat ID and schedule ID.
     */
    @Query("SELECT sh FROM SeatHold sh WHERE sh.venueSeatId = :venueSeatId " +
           "AND sh.eventSchedule.scheduleId = :scheduleId")
    Optional<SeatHold> findByVenueSeatIdAndScheduleId(String venueSeatId, UUID scheduleId);

    /**
     * Find all holds by user for a specific schedule.
     */
    @Query("SELECT sh FROM SeatHold sh WHERE sh.userId = :userId " +
           "AND sh.eventSchedule.scheduleId = :scheduleId " +
           "AND (sh.isPermanent = true OR sh.expiresAt > :now)")
    List<SeatHold> findActiveHoldsByUserAndSchedule(UUID userId, UUID scheduleId, LocalDateTime now);

    /**
     * Find all holds by user across all schedules.
     */
    @Query("SELECT sh FROM SeatHold sh WHERE sh.userId = :userId " +
           "AND (sh.isPermanent = true OR sh.expiresAt > :now)")
    List<SeatHold> findActiveHoldsByUser(UUID userId, LocalDateTime now);

    /**
     * Delete expired holds.
     */
    @Modifying
    @Query("DELETE FROM SeatHold sh WHERE sh.isPermanent = false AND sh.expiresAt < :now")
    int deleteExpiredHolds(LocalDateTime now);

    /**
     * Delete holds for specific venue seats in a schedule.
     */
    @Modifying
    @Query("DELETE FROM SeatHold sh WHERE sh.venueSeatId IN :venueSeatIds " +
           "AND sh.eventSchedule.scheduleId = :scheduleId")
    int deleteByVenueSeatIdsAndScheduleId(List<String> venueSeatIds, UUID scheduleId);

    /**
     * Delete all holds by user for a specific schedule.
     */
    @Modifying
    @Query("DELETE FROM SeatHold sh WHERE sh.userId = :userId " +
           "AND sh.eventSchedule.scheduleId = :scheduleId")
    int deleteByUserAndScheduleId(UUID userId, UUID scheduleId);

    /**
     * Check if a specific seat is held (excluding a specific user's hold).
     */
    @Query("SELECT COUNT(sh) > 0 FROM SeatHold sh WHERE sh.venueSeatId = :venueSeatId " +
           "AND sh.eventSchedule.scheduleId = :scheduleId " +
           "AND sh.userId != :excludeUserId " +
           "AND (sh.isPermanent = true OR sh.expiresAt > :now)")
    boolean isSeatHeldByOther(String venueSeatId, UUID scheduleId, UUID excludeUserId, LocalDateTime now);
}
