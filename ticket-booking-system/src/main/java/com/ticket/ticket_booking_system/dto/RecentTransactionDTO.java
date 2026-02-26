package com.ticket.ticket_booking_system.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.ticket.ticket_booking_system.entity.Transaction.TransactionStatus;
import com.ticket.ticket_booking_system.entity.Transaction.TransactionType;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RecentTransactionDTO {
    private UUID transactionId;
    private String transactionReference;
    private BigDecimal amount;
    private TransactionType type;
    private TransactionStatus status;
    private LocalDateTime createdAt;

    private UUID bookingId;
    private String bookingReference;

    private UUID eventId;
    private String eventName;
}
