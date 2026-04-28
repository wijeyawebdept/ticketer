package com.ticket.ticket_booking_system.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "event_schedules")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventSchedule {

    @Id
    @GeneratedValue
    @Column(name = "schedule_id", updatable = false, nullable = false)
    private UUID scheduleId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Column(name = "schedule_date", nullable = false)
    private LocalDate scheduleDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "capacity", nullable = false)
    private Integer capacity;

    @Column(name = "available_seats", nullable = false)
    private Integer availableSeats;

    @Builder.Default
    @Column(name = "price_adjustment", precision = 10, scale = 2)
    private BigDecimal priceAdjustment = BigDecimal.ZERO;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ScheduleStatus status = ScheduleStatus.ACTIVE;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder.Default
    @Column(name = "is_deleted")
    private Boolean isDeleted = false;

    public enum ScheduleStatus {
        ACTIVE,
        CANCELLED,
        SOLD_OUT,
        COMPLETED
    }

    // Helper method to check if schedule is bookable
    public boolean isBookable() {
        return status == ScheduleStatus.ACTIVE 
            && !isDeleted 
            && availableSeats > 0
            && scheduleDate.isAfter(LocalDate.now().minusDays(1));
    }

    // Helper method to calculate final price
    public BigDecimal calculateFinalPrice(BigDecimal basePrice) {
        return basePrice.add(priceAdjustment != null ? priceAdjustment : BigDecimal.ZERO);
    }

    // Helper method to reserve seats
    public boolean reserveSeats(int numberOfSeats) {
        if (availableSeats >= numberOfSeats && isBookable()) {
            availableSeats -= numberOfSeats;
            if (availableSeats == 0) {
                status = ScheduleStatus.SOLD_OUT;
            }
            return true;
        }
        return false;
    }

    // Helper method to release seats (for cancellations)
    public void releaseSeats(int numberOfSeats) {
        availableSeats += numberOfSeats;
        if (availableSeats > capacity) {
            availableSeats = capacity;
        }
        if (status == ScheduleStatus.SOLD_OUT && availableSeats > 0) {
            status = ScheduleStatus.ACTIVE;
        }
    }
}
