package com.ticket.ticket_booking_system.entity;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "seats")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "seat_id")
    private UUID seatId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id")
    private Venue venue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    private Event event;

    @Column(nullable = false, length = 50)
    private String section;

    @Column(name = "row_number", nullable = false, length = 10)
    private String rowNumber;

    @Column(name = "seat_number", nullable = false, length = 20)
    private String seatNumber;

    @Column(name = "seat_type", nullable = false)
    private String seatType; // e.g., "REGULAR", "VIP", "PREMIUM"

    @Column(nullable = false)
    private BigDecimal price;

    @Column(name = "is_available")
    @Builder.Default
    private Boolean isAvailable = true;
    
    @Column(name = "is_blocked")
    @Builder.Default
    private Boolean isBlocked = false;

    @Column(name = "hold_expires_at")
    private LocalDateTime holdExpiresAt;

    @Column(name = "held_by_user")
    private UUID heldByUser;

    @Column(name = "created_at")
    private Timestamp createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = new Timestamp(System.currentTimeMillis());
    }

    public enum SeatStatus {
        AVAILABLE, RESERVED, BOOKED, HELD
    }
    
    // Helper methods
    public boolean isHeld() {
        return holdExpiresAt != null && LocalDateTime.now().isBefore(holdExpiresAt);
    }
    
    public boolean isAvailableForBooking() {
        return Boolean.TRUE.equals(isAvailable) && 
               !Boolean.TRUE.equals(isBlocked) && 
               !isHeld();
    }
    
    // Add compatibility methods to support existing code
    public UUID getId() {
        return seatId;
    }
    
    public void setId(UUID id) {
        this.seatId = id;
    }
}