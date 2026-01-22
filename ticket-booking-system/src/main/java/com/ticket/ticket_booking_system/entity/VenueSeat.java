package com.ticket.ticket_booking_system.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "venue_seats", indexes = {
    @Index(name = "idx_section", columnList = "section"),
    @Index(name = "idx_row", columnList = "row_label"),
    @Index(name = "idx_category", columnList = "category_id"),
    @Index(name = "idx_venue_seats_venue_id", columnList = "venue_id")
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id")
    @JsonIgnore // Ignore venue field during JSON serialization to prevent LazyInitializationException
    private Venue venue; // Reference to the venue this seat belongs to

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

    // Transient fields for frontend
    @Transient
    public Integer getCategoryId() {
        return category != null ? category.getCategoryId() : null;
    }

    @Transient
    public String getCategoryName() {
        return category != null ? category.getCategoryName() : null;
    }

    @Transient
    public String getColorCode() {
        return category != null ? category.getColorCode() : null;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (isAisleSeat == null) isAisleSeat = false;
        if (isAccessible == null) isAccessible = false;
    }
}
