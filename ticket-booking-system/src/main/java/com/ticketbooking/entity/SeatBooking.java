package com.ticketbooking.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "seat_bookings", 
    uniqueConstraints = @UniqueConstraint(name = "unique_seat_event", columnNames = {"seat_id", "event_schedule_id"}),
    indexes = {
        @Index(name = "idx_schedule", columnList = "event_schedule_id"),
        @Index(name = "idx_status", columnList = "status"),
        @Index(name = "idx_hold_expires", columnList = "hold_expires_at")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeatBooking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "booking_id")
    private Long bookingId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "seat_id", nullable = false)
    private VenueSeat seat;

    @Column(name = "event_schedule_id", nullable = false)
    private Long eventScheduleId;

    @Column(name = "booking_ref_id")
    private Long bookingRefId; // Reference to main bookings table

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SeatStatus status = SeatStatus.AVAILABLE;

    @Column(name = "price_override", precision = 10, scale = 2)
    private BigDecimal priceOverride; // Event-specific pricing

    @Column(name = "hold_expires_at")
    private LocalDateTime holdExpiresAt; // For temporary holds (5-minute timer)

    @Column(name = "booked_by_user_id")
    private Long bookedByUserId;

    @Column(name = "booked_at")
    private LocalDateTime bookedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = SeatStatus.AVAILABLE;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum SeatStatus {
        AVAILABLE,
        TEMPORARY_HOLD,
        BOOKED,
        LOCKED,
        NOT_FOR_SALE
    }
}
