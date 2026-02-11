package com.ticket.ticket_booking_system.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a temporary hold on a venue seat for a specific event schedule.
 * Holds expire after a configurable duration to prevent seat hoarding.
 */
@Entity
@Table(name = "seat_holds", 
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"venue_seat_id", "schedule_id"}, name = "uk_seat_hold_venue_seat_schedule")
    },
    indexes = {
        @Index(name = "idx_seat_holds_schedule", columnList = "schedule_id"),
        @Index(name = "idx_seat_holds_user", columnList = "user_id"),
        @Index(name = "idx_seat_holds_expires", columnList = "expires_at")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatHold {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "hold_id")
    private UUID holdId;

    @Column(name = "venue_seat_id", nullable = false, length = 20)
    private String venueSeatId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id", nullable = false)
    private EventSchedule eventSchedule;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "is_permanent")
    @Builder.Default
    private Boolean isPermanent = false;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    /**
     * Check if this hold has expired.
     */
    public boolean isExpired() {
        return !isPermanent && LocalDateTime.now().isAfter(expiresAt);
    }

    /**
     * Check if this hold is still active (not expired).
     */
    public boolean isActive() {
        return isPermanent || LocalDateTime.now().isBefore(expiresAt);
    }
}
