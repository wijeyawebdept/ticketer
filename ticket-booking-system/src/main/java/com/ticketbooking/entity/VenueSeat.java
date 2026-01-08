package com.ticketbooking.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "venue_seats", indexes = {
    @Index(name = "idx_section", columnList = "section"),
    @Index(name = "idx_row", columnList = "row_label"),
    @Index(name = "idx_category", columnList = "category_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VenueSeat {

    @Id
    @Column(name = "seat_id", length = 20)
    private String seatId; // Format: SECTION-ROW-NUMBER (e.g., L-A-01)

    @Column(name = "section", nullable = false, length = 20)
    private String section; // LEFT, CENTER, RIGHT, BALCONY_LEFT, etc.

    @Column(name = "row_label", nullable = false, length = 5)
    private String rowLabel; // A, B, C, D, etc.

    @Column(name = "seat_number", nullable = false)
    private Integer seatNumber;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id", nullable = false)
    private SeatCategory category;

    @Column(name = "x_position", nullable = false, precision = 8, scale = 2)
    private BigDecimal xPosition; // SVG/Canvas X coordinate

    @Column(name = "y_position", nullable = false, precision = 8, scale = 2)
    private BigDecimal yPosition; // SVG/Canvas Y coordinate

    @Column(name = "is_aisle_seat")
    private Boolean isAisleSeat = false;

    @Column(name = "is_accessible")
    private Boolean isAccessible = false; // Wheelchair accessible

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (isAisleSeat == null) isAisleSeat = false;
        if (isAccessible == null) isAccessible = false;
    }
}
