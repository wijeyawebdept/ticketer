package com.ticket.ticket_booking_system.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.request.RefundRequest;
import com.ticket.ticket_booking_system.dto.response.PaymentVerificationResponse;
import com.ticket.ticket_booking_system.entity.Booking;
import com.ticket.ticket_booking_system.entity.Transaction;
import com.ticket.ticket_booking_system.repository.BookingRepository;
import com.ticket.ticket_booking_system.service.BookingService;
import com.ticket.ticket_booking_system.service.EmailService;
import com.ticket.ticket_booking_system.service.EventScheduleService;
import com.ticket.ticket_booking_system.service.MPGSPaymentService;
import com.ticket.ticket_booking_system.service.TransactionService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Controller for refund operations
 */
@RestController
@RequestMapping("/api/refunds")
@RequiredArgsConstructor
@Slf4j
public class RefundController {

        private final MPGSPaymentService mpgsPaymentService;
        private final TransactionService transactionService;
        private final BookingService bookingService;
        private final BookingRepository bookingRepository;
        private final EmailService emailService;
        private final EventScheduleService eventScheduleService;

        /**
      * Initiate a refund
      * POST /api/refunds/initiate
      */
        @PostMapping("/initiate")
        @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER')")
        public ResponseEntity<PaymentVerificationResponse> initiateRefund(
                @Valid @RequestBody RefundRequest request) {

        log.info("Initiating refund for booking: {}, amount: {}",
                request.getBookingId(), request.getAmount());

        try {
            // Validate booking exists and is eligible for refund
                Booking booking = bookingRepository.findById(request.getBookingId())
                        .orElseThrow(() -> new RuntimeException("Booking not found"));

                if (booking.getStatus() != Booking.BookingStatus.CONFIRMED) {
                return ResponseEntity.badRequest().body(PaymentVerificationResponse.builder()
                        .success(false)
                        .status("INVALID")
                        .message("Only confirmed bookings can be refunded. Current status: " + booking.getStatus())
                        .build());
                }

            // Check if there's a successful payment
                if (!transactionService.hasSuccessfulPayment(request.getBookingId())) {
                return ResponseEntity.badRequest().body(PaymentVerificationResponse.builder()
                        .success(false)
                        .status("INVALID")
                        .message("No successful payment found for this booking")
                        .build());
                }

            // Process refund through MPGS
                Transaction refundTransaction = mpgsPaymentService.processRefund(
                        request.getBookingId(),
                        request.getAmount(),
                        request.getReason()
                );

                if (refundTransaction.getStatus() == Transaction.TransactionStatus.SUCCESS) {
                // Update booking status to REFUNDED
                booking.setStatus(Booking.BookingStatus.REFUNDED);
                booking.setCancellationReason(request.getReason());
                bookingRepository.save(booking);

                // Release seats back to inventory
                int seatsToRelease = booking.getBookingSeats().size();
                eventScheduleService.releaseSeats(booking.getEventSchedule().getScheduleId(), seatsToRelease);

                // Determine refund amount
                BigDecimal refundAmount = request.getAmount() != null ?
                        request.getAmount() : booking.getTotalAmount();

                // Send refund confirmation email
                String customerEmail = booking.getUser().getEmail();
                emailService.sendRefundConfirmationEmail(
                        booking,
                        customerEmail,
                        refundAmount,
                        request.getReason()
                );

                log.info("Refund processed successfully. BookingRef: {}, Amount: {}",
                        booking.getBookingReference(), refundAmount);

                return ResponseEntity.ok(PaymentVerificationResponse.builder()
                        .success(true)
                        .status("SUCCESS")
                        .transactionId(refundTransaction.getTransactionId().toString())
                        .bookingId(booking.getBookingId())
                        .bookingReference(booking.getBookingReference())
                        .amount(refundAmount)
                        .message("Refund processed successfully")
                        .build());
                } else {
                log.error("Refund failed for booking: {}", request.getBookingId());
                return ResponseEntity.ok(PaymentVerificationResponse.builder()
                        .success(false)
                        .status("FAILED")
                        .message("Refund processing failed. Please try again or contact MPGS support.")
                        .build());
                }

        } catch (Exception e) {
                log.error("Refund initiation failed", e);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(PaymentVerificationResponse.builder()
                                .success(false)
                                .status("ERROR")
                                .message("Refund failed: " + e.getMessage())
                                .build());
        }
        }

        /**
     * Get refund status for a booking
     * GET /api/refunds/booking/{bookingId}
     */
        @GetMapping("/booking/{bookingId}")
        @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'USER')")
        public ResponseEntity<?> getRefundStatus(@PathVariable UUID bookingId) {

        log.info("Getting refund status for booking: {}", bookingId);

        try {
            // Get booking
                Booking booking = bookingRepository.findById(bookingId)
                        .orElseThrow(() -> new RuntimeException("Booking not found"));

            // Get all transactions for this booking
                List<Transaction> transactions = transactionService.getTransactionsByBookingId(bookingId);

            // Find refund transactions
                List<Transaction> refundTransactions = transactions.stream()
                        .filter(t -> t.getType() == Transaction.TransactionType.REFUND)
                        .toList();

                if (refundTransactions.isEmpty()) {
                return ResponseEntity.ok(PaymentVerificationResponse.builder()
                        .success(false)
                        .status("NO_REFUND")
                        .bookingId(bookingId)
                        .bookingReference(booking.getBookingReference())
                        .message("No refund found for this booking")
                        .build());
                }

            // Get the most recent refund
                Transaction latestRefund = refundTransactions.get(0);

                return ResponseEntity.ok(PaymentVerificationResponse.builder()
                        .success(latestRefund.getStatus() == Transaction.TransactionStatus.SUCCESS)
                        .status(latestRefund.getStatus().name())
                        .transactionId(latestRefund.getTransactionId().toString())
                        .bookingId(bookingId)
                        .bookingReference(booking.getBookingReference())
                        .amount(latestRefund.getAmount())
                        .message("Refund status: " + latestRefund.getStatus())
                        .build());

        } catch (Exception e) {
                log.error("Error getting refund status", e);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(PaymentVerificationResponse.builder()
                                .success(false)
                                .status("ERROR")
                                .message("Error checking refund status: " + e.getMessage())
                                .build());
        }
        }

        /**
     * Get all refund transactions for a booking
     * GET /api/refunds/booking/{bookingId}/transactions
     */
        @GetMapping("/booking/{bookingId}/transactions")
        @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER')")
        public ResponseEntity<List<Transaction>> getRefundTransactions(@PathVariable UUID bookingId) {

        log.info("Getting refund transactions for booking: {}", bookingId);

        try {
                List<Transaction> transactions = transactionService.getTransactionsByBookingId(bookingId);

                List<Transaction> refundTransactions = transactions.stream()
                        .filter(t -> t.getType() == Transaction.TransactionType.REFUND)
                        .toList();

                return ResponseEntity.ok(refundTransactions);

        } catch (Exception e) {
                log.error("Error getting refund transactions", e);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
        }
}
