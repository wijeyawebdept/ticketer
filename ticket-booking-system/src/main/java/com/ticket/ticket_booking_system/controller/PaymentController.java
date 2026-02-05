package com.ticket.ticket_booking_system.controller;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.request.InitiatePaymentRequest;
import com.ticket.ticket_booking_system.dto.response.MPGSPaymentResult;
import com.ticket.ticket_booking_system.dto.response.MPGSSessionResponse;
import com.ticket.ticket_booking_system.dto.response.PaymentVerificationResponse;
import com.ticket.ticket_booking_system.entity.Booking;
import com.ticket.ticket_booking_system.entity.Transaction;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.service.BookingService;
import com.ticket.ticket_booking_system.service.EmailService;
import com.ticket.ticket_booking_system.service.MPGSPaymentService;
import com.ticket.ticket_booking_system.service.SeatService;
import com.ticket.ticket_booking_system.service.TransactionService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Controller for MPGS payment operations
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final MPGSPaymentService mpgsPaymentService;
    private final TransactionService transactionService;
    private final BookingService bookingService;
    private final EmailService emailService;
    private final SeatService seatService;
    private final UserRepository userRepository;

    /**
     * Initiate payment - creates pending booking and MPGS session
     * POST /api/payments/initiate
     */
    @PostMapping("/initiate")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<MPGSSessionResponse> initiatePayment(
            @Valid @RequestBody InitiatePaymentRequest request,
            Authentication authentication) {

        log.info("Initiating payment for user: {}, amount: {}",
                authentication.getName(), request.getTotalAmount());

        try {
            // Get user from authentication
            UUID userId = extractUserIdFromAuth(authentication);

            // Create PENDING booking
            Booking booking = bookingService.createPendingBooking(userId, request);

            // Create checkout session with MPGS
            MPGSSessionResponse sessionResponse = mpgsPaymentService.createCheckoutSession(
                    booking.getBookingId(),
                    request.getTotalAmount(),
                    request.getCurrency()
            );

            // Create PENDING transaction record
            transactionService.createPendingTransaction(
                    booking.getBookingId(),
                    request.getTotalAmount(),
                    sessionResponse.getSessionId()
            );

            log.info("Payment initiated successfully. BookingID: {}, SessionID: {}",
                    booking.getBookingId(), sessionResponse.getSessionId());

            return ResponseEntity.ok(sessionResponse);

        } catch (Exception e) {
            log.error("Payment initiation failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    /**
     * Verify payment after MPGS redirect/completion
     * GET /api/payments/verify?sessionId={sessionId}
     */
    @GetMapping("/verify")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<PaymentVerificationResponse> verifyPayment(
            @RequestParam String sessionId,
            Authentication authentication) {

        log.info("Verifying payment for session: {}", sessionId);

        try {
            // Retrieve payment result from MPGS
            MPGSPaymentResult result = mpgsPaymentService.verifyPayment(sessionId);

            // Get transaction by session ID
            Transaction transaction = transactionService.getTransactionByReference(sessionId);
            if (transaction == null) {
                log.error("Transaction not found for session: {}", sessionId);
                return ResponseEntity.ok(PaymentVerificationResponse.builder()
                        .success(false)
                        .status("ERROR")
                        .message("Transaction not found. Please contact support.")
                        .build());
            }

            Booking booking = transaction.getBooking();

            // Update transaction status
            Transaction.TransactionStatus newStatus = result.isSuccess() ?
                    Transaction.TransactionStatus.SUCCESS :
                    Transaction.TransactionStatus.FAILED;

            transactionService.updateTransactionStatus(sessionId, newStatus, result.getRawResponse());

            if (result.isSuccess()) {
                // Confirm booking
                Booking confirmedBooking = bookingService.confirmBookingAfterPayment(booking.getBookingId());

                // Send confirmation email
                String customerEmail = booking.getUser().getEmail();
                emailService.sendBookingConfirmationEmail(confirmedBooking, customerEmail);

                log.info("Payment verified successfully. BookingRef: {}",
                        confirmedBooking.getBookingReference());

                return ResponseEntity.ok(PaymentVerificationResponse.builder()
                        .success(true)
                        .status("SUCCESS")
                        .transactionId(transaction.getTransactionId().toString())
                        .bookingId(confirmedBooking.getBookingId())
                        .bookingReference(confirmedBooking.getBookingReference())
                        .amount(confirmedBooking.getTotalAmount())
                        .message("Payment successful! Your booking is confirmed.")
                        .paymentMethod(result.getCardType())
                        .build());
            } else {
                // Cancel booking due to payment failure
                bookingService.cancelBookingAfterPaymentFailure(
                        booking.getBookingId(),
                        "Payment failed: " + result.getErrorMessage()
                );

                // Release seat holds
                try {
                    seatService.releaseSeatHolds(booking.getUser().getUserId());
                } catch (Exception e) {
                    log.warn("Error releasing seat holds: {}", e.getMessage());
                }

                // Send failure email
                String customerEmail = booking.getUser().getEmail();
                emailService.sendPaymentFailureEmail(
                        customerEmail,
                        booking.getEvent().getName(),
                        booking.getTotalAmount(),
                        result.getErrorMessage()
                );

                log.info("Payment verification failed. Reason: {}", result.getErrorMessage());

                return ResponseEntity.ok(PaymentVerificationResponse.builder()
                        .success(false)
                        .status("FAILED")
                        .message(result.getErrorMessage() != null ?
                                result.getErrorMessage() :
                                "Payment was declined. Please try again.")
                        .build());
            }

        } catch (Exception e) {
            log.error("Payment verification error", e);
            return ResponseEntity.ok(PaymentVerificationResponse.builder()
                    .success(false)
                    .status("ERROR")
                    .message("Failed to verify payment. Please contact support.")
                    .build());
        }
    }

    /**
     * Webhook endpoint for MPGS callbacks
     * POST /api/payments/webhook
     * Note: This endpoint is public and uses signature verification
     */
    @PostMapping("/webhook")
    public ResponseEntity<Void> handleWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "X-Gateway-Signature", required = false) String signature) {

        log.info("Received MPGS webhook");

        try {
            mpgsPaymentService.processWebhook(payload, signature);
            return ResponseEntity.ok().build();
        } catch (SecurityException e) {
            log.warn("Webhook signature verification failed");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (Exception e) {
            log.error("Webhook processing failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get payment status by session ID
     * GET /api/payments/status?sessionId={sessionId}
     */
    @GetMapping("/status")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<PaymentVerificationResponse> getPaymentStatus(
            @RequestParam String sessionId,
            Authentication authentication) {

        log.info("Getting payment status for session: {}", sessionId);

        try {
            Transaction transaction = transactionService.getTransactionByReference(sessionId);

            if (transaction == null) {
                return ResponseEntity.ok(PaymentVerificationResponse.builder()
                        .success(false)
                        .status("NOT_FOUND")
                        .message("Payment not found")
                        .build());
            }

            Booking booking = transaction.getBooking();
            boolean isSuccess = transaction.getStatus() == Transaction.TransactionStatus.SUCCESS;

            return ResponseEntity.ok(PaymentVerificationResponse.builder()
                    .success(isSuccess)
                    .status(transaction.getStatus().name())
                    .transactionId(transaction.getTransactionId().toString())
                    .bookingId(booking.getBookingId())
                    .bookingReference(booking.getBookingReference())
                    .amount(transaction.getAmount())
                    .build());

        } catch (Exception e) {
            log.error("Error getting payment status", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(PaymentVerificationResponse.builder()
                            .success(false)
                            .status("ERROR")
                            .message("Error checking payment status")
                            .build());
        }
    }

    /**
     * Extract user ID from authentication
     */
    private UUID extractUserIdFromAuth(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        return user.getUserId();
    }
}
