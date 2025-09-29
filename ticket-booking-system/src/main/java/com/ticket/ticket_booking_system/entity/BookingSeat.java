package com.ticket.ticket_booking_system.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.GenericGenerator;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "booking_seats")
@Getter
@Setter
@ToString(exclude = "booking") // Prevent circular reference in toString
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingSeat {

    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "uuid2")
    @Column(name = "booking_seat_id", columnDefinition = "UUID")
    private UUID bookingSeatId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false, columnDefinition = "UUID")
    private Booking booking;
    
    public void setBooking(Booking booking) {
        this.booking = booking;
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seat_id", nullable = false, columnDefinition = "UUID")
    private Seat seat;

    @Column(nullable = false)
    private BigDecimal priceAtBooking;

    @Column(length = 36)
    private String ticketCode;
    
    // Add compatibility methods to support existing code
    public UUID getId() {
        return bookingSeatId;
    }
    
    public void setId(UUID id) {
        this.bookingSeatId = id;
    }
}