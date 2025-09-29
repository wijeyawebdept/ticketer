package com.ticket.ticket_booking_system.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.GenericGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transactions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "uuid2")
    @Column(name = "transaction_id", columnDefinition = "UUID")
    private UUID transactionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false, columnDefinition = "UUID")
    private Booking booking;

    @Column(nullable = false, unique = true, length = 50)
    private String transactionReference;

    @Column(nullable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionStatus status;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @Column(columnDefinition = "TEXT")
    private String paymentGatewayResponse;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum TransactionType {
        PAYMENT, REFUND, CHARGEBACK
    }

    public enum TransactionStatus {
        PENDING, SUCCESS, FAILED, CANCELLED
    }
    
    // Add compatibility methods to support existing code
    public UUID getId() {
        return transactionId;
    }
    
    public void setId(UUID id) {
        this.transactionId = id;
    }
    
    // Additional methods needed as shown in compilation errors
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public TransactionType getType() {
        return type;
    }
    
    public TransactionStatus getStatus() {
        return status;
    }
    
    public BigDecimal getAmount() {
        return amount;
    }
}