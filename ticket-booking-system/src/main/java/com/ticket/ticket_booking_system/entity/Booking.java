package com.ticket.ticket_booking_system.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.GenericGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "bookings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Booking {

    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "uuid2")
    @Column(name = "booking_id", columnDefinition = "UUID")
    private UUID bookingId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, columnDefinition = "UUID")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false, columnDefinition = "UUID")
    private Event event;

    @Column(nullable = false)
    private LocalDateTime bookingTime;

    @Column(nullable = false)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status;

    @Column(unique = true, length = 36)
    private String bookingReference;

    private Boolean attended;

    private LocalDateTime cancelledAt;
    
    @Column(columnDefinition = "TEXT")
    private String cancellationReason;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<BookingSeat> bookingSeats = new HashSet<>();

    @PrePersist
    protected void onCreate() {
        bookingTime = LocalDateTime.now();
        if (status == null) {
            status = BookingStatus.PENDING;
        }
    }

    public void addSeat(BookingSeat bookingSeat) {
        bookingSeats.add(bookingSeat);
        bookingSeat.setBooking(this);
    }

    public void removeSeat(BookingSeat bookingSeat) {
        bookingSeats.remove(bookingSeat);
        bookingSeat.setBooking(null);
    }

    public enum BookingStatus {
        PENDING, CONFIRMED, CANCELLED, REFUNDED
    }
    
    // Add compatibility methods to support existing code
    public UUID getId() {
        return bookingId;
    }
    
    public void setId(UUID id) {
        this.bookingId = id;
    }
}