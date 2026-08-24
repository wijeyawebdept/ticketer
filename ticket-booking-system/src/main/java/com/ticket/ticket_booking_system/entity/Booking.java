package com.ticket.ticket_booking_system.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "bookings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Booking {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "booking_id")
    private UUID bookingId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "bookings", "password", "refreshToken", "googleId"})
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "bookings", "seats", "organizer", "eventSchedules"})
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "event", "bookings"})
    private EventSchedule eventSchedule;

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
    
    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "number_of_tickets")
    private Integer numberOfTickets;

    @Column(name = "customer_email", length = 255)
    private String customerEmail;

    @Column(name = "customer_phone", length = 20)
    private String customerPhone;

    @Column(name = "customer_nic", length = 50)
    private String customerNic;

    @Column(name = "final_amount")
    private BigDecimal finalAmount;

    @Column(name = "discount_amount")
    private BigDecimal discountAmount;

    @Column(name = "discount_info", columnDefinition = "TEXT")
    private String discountInfo;

    @Column(name = "currency", length = 10)
    private String currency;

    @Column(name = "refund_amount")
    private BigDecimal refundAmount;

    @Column(name = "refunded_at")
    private LocalDateTime refundedAt;

    @Column(name = "payment_status", length = 20)
    private String paymentStatus;

    @Column(name = "booking_status", length = 20)
    private String bookingStatus;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "request_separate_tickets")
    @Builder.Default
    private Boolean requestSeparateTickets = false;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @org.hibernate.annotations.BatchSize(size = 20)
    @Builder.Default
    private Set<BookingSeat> bookingSeats = new HashSet<>();

    @JsonIgnore
    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @org.hibernate.annotations.BatchSize(size = 10)
    private java.util.List<Transaction> transactions;

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