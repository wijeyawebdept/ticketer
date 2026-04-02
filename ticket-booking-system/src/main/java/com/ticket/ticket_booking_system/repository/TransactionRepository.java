package com.ticket.ticket_booking_system.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.Booking;
import com.ticket.ticket_booking_system.entity.Transaction;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

        @Query("SELECT t FROM Transaction t " +
               "LEFT JOIN FETCH t.booking b " +
               "LEFT JOIN FETCH b.event " +
               "ORDER BY t.createdAt DESC")
        List<Transaction> findAllRecentTransactionsEager();

        // Fallback paginated query for backward compatibility
        Page<Transaction> findAllByOrderByCreatedAtDesc(Pageable pageable);

        Optional<Transaction> findByTransactionReference(String transactionReference);

        List<Transaction> findByBooking(Booking booking);

        // Find transactions by booking ID
        List<Transaction> findByBooking_BookingId(UUID bookingId);

        // Find transactions by booking ID and type
        List<Transaction> findByBooking_BookingIdAndType(UUID bookingId, Transaction.TransactionType type);

        // Find transactions by booking ID, type, and status
        List<Transaction> findByBooking_BookingIdAndTypeAndStatus(
                UUID bookingId,
                Transaction.TransactionType type,
                Transaction.TransactionStatus status
        );

        // Find transactions by status and type, ordered by creation date
        List<Transaction> findByStatusAndTypeOrderByCreatedAtDesc(
                Transaction.TransactionStatus status,
                Transaction.TransactionType type
        );

        Page<Transaction> findByType(Transaction.TransactionType type, Pageable pageable);

        Page<Transaction> findByStatus(Transaction.TransactionStatus status, Pageable pageable);

        @Query("SELECT t FROM Transaction t WHERE t.createdAt BETWEEN :startDate AND :endDate")
        List<Transaction> findByDateRange(LocalDateTime startDate, LocalDateTime endDate);

        @Query("SELECT SUM(t.amount) FROM Transaction t WHERE t.type = 'PAYMENT' AND t.status = 'SUCCESS'")
        BigDecimal findTotalRevenue();

        @Query("SELECT SUM(t.amount) FROM Transaction t WHERE t.type = 'PAYMENT' AND t.status = 'SUCCESS' AND t.createdAt BETWEEN :startDate AND :endDate")
        BigDecimal findRevenueForPeriod(LocalDateTime startDate, LocalDateTime endDate);

        @Query("SELECT SUM(t.amount) FROM Transaction t WHERE t.type = 'REFUND' AND t.status = 'SUCCESS'")
        BigDecimal findTotalRefunds();
}