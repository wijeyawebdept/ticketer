package com.ticket.ticket_booking_system.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.entity.Booking;
import com.ticket.ticket_booking_system.entity.Transaction;
import com.ticket.ticket_booking_system.repository.BookingRepository;
import com.ticket.ticket_booking_system.repository.TransactionRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for managing payment transactions
 */
@Service
@Slf4j
@Transactional
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final BookingRepository bookingRepository;

    /**
     * Create initial pending transaction record
     *
     * @param bookingId Booking ID
     * @param amount Transaction amount
     * @param gatewaySessionId Session ID from payment gateway
     * @return Created transaction
     */
    public Transaction createPendingTransaction(UUID bookingId, BigDecimal amount, String gatewaySessionId, String successIndicator) {
        log.info("Creating pending transaction for booking: {}, amount: {}, sessionId: {}",
                 bookingId, amount, gatewaySessionId);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));

        // Store successIndicator in paymentGatewayResponse so it can be retrieved during verification
        String initialResponse = successIndicator != null
                ? "{\"successIndicator\":\"" + successIndicator + "\"}"
                : null;

        Transaction transaction = Transaction.builder()
                .booking(booking)
                .userId(booking.getUser() != null ? booking.getUser().getUserId() : null)
                .paymentMethod("MPGS") // Default for this flow
                .transactionReference(gatewaySessionId)
                .amount(amount)
                .type(Transaction.TransactionType.PAYMENT)
                .status(Transaction.TransactionStatus.PENDING)
                .paymentGatewayResponse(initialResponse)
                .build();

        transaction = transactionRepository.save(transaction);

        log.info("Pending transaction created: TransactionID={}", transaction.getTransactionId());

        return transaction;
    }

    /**
     * Update transaction status after payment verification
     *
     * @param transactionRef Transaction reference (session ID)
     * @param status New transaction status
     * @param gatewayResponse Raw response from payment gateway
     * @return Updated transaction
     */
    public Transaction updateTransactionStatus(
            String transactionRef,
            Transaction.TransactionStatus status,
            String gatewayResponse) {

        log.info("Updating transaction status: TransactionRef={}, Status={}",
                 transactionRef, status);

        Transaction transaction = transactionRepository
                .findByTransactionReference(transactionRef)
                .orElseThrow(() -> new RuntimeException("Transaction not found: " + transactionRef));

        transaction.setStatus(status);
        transaction.setPaymentGatewayResponse(gatewayResponse);
        
        // Try to extract error message if failed
        if (status == Transaction.TransactionStatus.FAILED && gatewayResponse != null) {
            try {
                com.fasterxml.jackson.databind.JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper()
                        .readTree(gatewayResponse);
                if (node.has("errorMessage")) {
                    transaction.setErrorMessage(node.get("errorMessage").asText());
                } else if (node.has("response") && node.get("response").has("explanation")) {
                    transaction.setErrorMessage(node.get("response").get("explanation").asText());
                }
            } catch (Exception e) {
                log.warn("Failed to parse gateway response for error message: {}", e.getMessage());
            }
        }

        transaction = transactionRepository.save(transaction);

        log.info("Transaction updated: TransactionID={}, NewStatus={}",
                 transaction.getTransactionId(), status);

        return transaction;
    }

    /**
     * Get all transactions for a booking
     *
     * @param bookingId Booking ID
     * @return List of transactions
     */
    public List<Transaction> getTransactionsByBookingId(UUID bookingId) {
        return transactionRepository.findByBooking_BookingId(bookingId);
    }

    /**
     * Get successful payment transaction for a booking
     *
     * @param bookingId Booking ID
     * @return Successful payment transaction if exists
     */
    public Transaction getSuccessfulPaymentTransaction(UUID bookingId) {
        return transactionRepository
                .findByBooking_BookingIdAndTypeAndStatus(
                        bookingId,
                        Transaction.TransactionType.PAYMENT,
                        Transaction.TransactionStatus.SUCCESS
                )
                .stream()
                .findFirst()
                .orElse(null);
    }

    /**
     * Get transaction by transaction reference
     *
     * @param transactionRef Transaction reference (session ID)
     * @return Transaction if found
     */
    public Transaction getTransactionByReference(String transactionRef) {
        return transactionRepository.findByTransactionReference(transactionRef)
                .orElse(null);
    }

    /**
     * Check if booking has successful payment
     *
     * @param bookingId Booking ID
     * @return true if booking has successful payment
     */
    public boolean hasSuccessfulPayment(UUID bookingId) {
        return getSuccessfulPaymentTransaction(bookingId) != null;
    }

    /**
     * Get total revenue for a date range
     *
     * @param startDate Start date
     * @param endDate End date
     * @return Total revenue
     */
    public BigDecimal getRevenueForPeriod(LocalDateTime startDate, LocalDateTime endDate) {
        BigDecimal revenue = transactionRepository.findRevenueForPeriod(startDate, endDate);
        return revenue != null ? revenue : BigDecimal.ZERO;
    }

    /**
     * Get total refunds
     *
     * @return Total refund amount
     */
    public BigDecimal getTotalRefunds() {
        BigDecimal refunds = transactionRepository.findTotalRefunds();
        return refunds != null ? refunds : BigDecimal.ZERO;
    }

    /**
     * Get recent transactions by status and type
     *
     * @param status Transaction status
     * @param type Transaction type
     * @return List of transactions
     */
    public List<Transaction> getRecentTransactions(
            Transaction.TransactionStatus status,
            Transaction.TransactionType type) {
        return transactionRepository.findByStatusAndTypeOrderByCreatedAtDesc(status, type);
    }
}
