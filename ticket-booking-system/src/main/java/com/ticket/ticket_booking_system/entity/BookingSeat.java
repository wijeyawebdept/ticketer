package com.ticket.ticket_booking_system.entity;

import java.math.BigDecimal;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

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
    @GeneratedValue
    @UuidGenerator
    @Column(name = "booking_seat_id")
    private UUID bookingSeatId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    @JsonBackReference
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "bookings", "seats", "organizer", "eventSchedules"})
    private Event event;

    public void setBooking(Booking booking) {
        this.booking = booking;
        // Also set the event from the booking
        if (booking != null && booking.getEvent() != null) {
            this.event = booking.getEvent();
        }
    }

    // Seat entity reference removed as seats table was dropped in favor of VenueSeat

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

    // VenueSeat support - stores the VenueSeat ID (String format like "L-A-01")
    @Column(name = "venue_seat_id", length = 20)
    private String venueSeatId;
    
    @Column(name = "seat_id")
    private UUID seatId;

    @Column(name = "checked_in")
    @Builder.Default
    private Boolean checkedIn = false;

    @Column(name = "checked_in_at")
    private java.time.LocalDateTime checkedInAt;

    @Column(name = "checked_in_by")
    private UUID checkedInBy;
    
    // Add compatibility methods to support existing code
    public UUID getId() {
        return bookingSeatId;
    }
    
    public void setId(UUID id) {
        this.bookingSeatId = id;
    }
}