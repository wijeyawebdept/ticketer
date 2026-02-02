package com.ticket.ticket_booking_system.entity;

import java.math.BigDecimal;
import java.util.UUID;

import org.hibernate.annotations.GenericGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

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
    @Column(name = "booking_seat_id")
    private UUID bookingSeatId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;
    
    public void setBooking(Booking booking) {
        this.booking = booking;
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seat_id", nullable = true) // Allow NULL for shared area tickets
    private Seat seat;

    @Column(nullable = false)
    private BigDecimal priceAtBooking;

    @Column(length = 36)
    private String ticketCode;
    
    // Shared area support
    @Builder.Default
    @Column(name = "is_shared_area_ticket")
    private Boolean isSharedAreaTicket = false;
    
    @Column(name = "shared_area_number")
    private Integer sharedAreaNumber;
    
    // Add compatibility methods to support existing code
    public UUID getId() {
        return bookingSeatId;
    }
    
    public void setId(UUID id) {
        this.bookingSeatId = id;
    }
}