package com.ticket.ticket_booking_system.entity;

import java.math.BigDecimal;
import java.util.UUID;

import org.hibernate.annotations.GenericGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "uuid2")
    @Column(name = "seat_id")
    private UUID seatId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Column(nullable = false, length = 20)
    private String seatNumber;

    @Column(nullable = false, length = 50)
    private String section;

    @Column(nullable = false, length = 10)
    private String row;

    @Column(nullable = false)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SeatStatus status;
    
    @Column
    private boolean isBlocked;
    
    @Column(nullable = false)
    private String seatType; // e.g., "REGULAR", "VIP", "PREMIUM"

    public enum SeatStatus {
        AVAILABLE, RESERVED, BOOKED
    }
    
    // Add compatibility methods to support existing code
    public UUID getId() {
        return seatId;
    }
    
    public void setId(UUID id) {
        this.seatId = id;
    }
}