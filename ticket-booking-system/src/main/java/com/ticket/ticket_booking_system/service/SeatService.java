package com.ticket.ticket_booking_system.service;

import java.util.List;
import java.util.UUID;

import com.ticket.ticket_booking_system.entity.Seat;

public interface SeatService {
    
    /**
     * Generate seats for an event by duplicating venue seats
     */
    void generateSeatsForEvent(UUID venueId, UUID eventId);
    
    /**
     * Get all seats for an event
     */
    List<Seat> getSeatsByEvent(UUID eventId);
    
    /**
     * Get available seats for an event
     */
    List<Seat> getAvailableSeatsByEvent(UUID eventId);
    
    /**
     * Toggle seat blocking status
     */
    void toggleBlock(UUID seatId, boolean block);
    
    /**
     * Hold seats for a user temporarily
     */
    void holdSeats(List<UUID> seatIds, UUID userId, int holdDurationMinutes);
    
    /**
     * Reserve seats (mark as unavailable)
     */
    void reserveSeats(List<UUID> seatIds);
    
    /**
     * Release seat holds for a user
     */
    void releaseSeatHolds(UUID userId);
    
    /**
     * Release all expired holds automatically
     */
    void releaseExpiredHolds();
    
    /**
     * Get seat by ID
     */
    Seat getSeatById(UUID seatId);
    
    /**
     * Get seat availability statistics for an event
     */
    SeatAvailabilityStats getAvailabilityStats(UUID eventId);
    
    public static class SeatAvailabilityStats {
        private long totalSeats;
        private long availableSeats;
        private long bookedSeats;
        private long heldSeats;
        private long blockedSeats;
        
        public SeatAvailabilityStats(long totalSeats, long availableSeats, long bookedSeats, long heldSeats, long blockedSeats) {
            this.totalSeats = totalSeats;
            this.availableSeats = availableSeats;
            this.bookedSeats = bookedSeats;
            this.heldSeats = heldSeats;
            this.blockedSeats = blockedSeats;
        }
        
        // Getters and setters
        public long getTotalSeats() { return totalSeats; }
        public void setTotalSeats(long totalSeats) { this.totalSeats = totalSeats; }
        
        public long getAvailableSeats() { return availableSeats; }
        public void setAvailableSeats(long availableSeats) { this.availableSeats = availableSeats; }
        
        public long getBookedSeats() { return bookedSeats; }
        public void setBookedSeats(long bookedSeats) { this.bookedSeats = bookedSeats; }
        
        public long getHeldSeats() { return heldSeats; }
        public void setHeldSeats(long heldSeats) { this.heldSeats = heldSeats; }
        
        public long getBlockedSeats() { return blockedSeats; }
        public void setBlockedSeats(long blockedSeats) { this.blockedSeats = blockedSeats; }
    }
}