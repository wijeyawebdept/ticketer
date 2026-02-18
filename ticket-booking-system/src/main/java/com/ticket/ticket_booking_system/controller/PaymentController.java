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

    @PostMapping("/initiate")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> initiatePayment(
            @Valid @RequestBody InitiatePaymentRequest request,
            Authentication authentication) {

        log.info("Initiating payment for user: {}, amount: {}", authentication.getName(), request.getTotalAmount());

        Booking booking = null;
        try {
            UUID userId = extractUserIdFromAuth(authentication);

            booking = bookingService.createPendingBooking(userId, request);

            MPGSSessionResponse sessionResponse = mpgsPaymentService.createCheckoutSession(
                    booking.getBookingId(),
                    request.getTotalAmount(),
                    request.getCurrency(),
                    request.getReturnUrl(),
                    request.getCancelUrl()
            );

            transactionService.createPendingTransaction(
                    booking.getBookingId(),
                    request.getTotalAmount(),
                    sessionResponse.getSessionId()
            );

            return ResponseEntity.ok(sessionResponse);

        } catch (org.springframework.web.client.RestClientResponseException e) {
            log.error("MPGS error: status={}, body={}", e.getRawStatusCode(), e.getResponseBodyAsString());
            
            // cleanup so you don't keep PENDING junk
            if (booking != null) {
                bookingService.cancelBooking(booking.getBookingId().toString());
            }
            
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(java.util.Map.of(
                "message", "MPGS rejected the request",
                "status", e.getRawStatusCode(),
                "body", e.getResponseBodyAsString()
            ));
        } catch (Exception e) {
            log.error("Payment initiation failed: {}", e.getMessage(), e);

            // cleanup so you don't keep PENDING junk
            if (booking != null) {
                bookingService.cancelBooking(booking.getBookingId().toString());
            }

            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(java.util.Map.of(
                    "message", "Payment initiation failed",
                    "details", e.getMessage()
            ));
        }
    }

    @GetMapping("/verify")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<PaymentVerificationResponse> verifyPayment(
            @RequestParam String sessionId,
            Authentication authentication) {

        log.info("Verifying payment for session: {}", sessionId);

        try {
            MPGSPaymentResult result = mpgsPaymentService.verifyPayment(sessionId);

            Transaction transaction = transactionService.getTransactionByReference(sessionId);
            if (transaction == null) {
                return ResponseEntity.ok(PaymentVerificationResponse.builder()
                        .success(false)
                        .status("ERROR")
                        .message("Transaction not found. Please contact support.")
                        .build());
            }

            Booking booking = transaction.getBooking();

            Transaction.TransactionStatus newStatus = result.isSuccess()
                    ? Transaction.TransactionStatus.SUCCESS
                    : Transaction.TransactionStatus.FAILED;

            transactionService.updateTransactionStatus(sessionId, newStatus, result.getRawResponse());

            if (result.isSuccess()) {
                Booking confirmedBooking = bookingService.confirmBookingAfterPayment(booking.getBookingId());

                String customerEmail = booking.getUser().getEmail();
                emailService.sendBookingConfirmationEmail(confirmedBooking, customerEmail);

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
                bookingService.cancelBookingAfterPaymentFailure(
                        booking.getBookingId(),
                        "Payment failed: " + (result.getErrorMessage() != null ? result.getErrorMessage() : "Unknown")
                );

                try {
                    seatService.releaseSeatHolds(booking.getUser().getUserId());
                } catch (Exception e) {
                    log.warn("Error releasing seat holds: {}", e.getMessage());
                }

                String customerEmail = booking.getUser().getEmail();
                emailService.sendPaymentFailureEmail(
                        customerEmail,
                        booking.getEvent().getName(),
                        booking.getTotalAmount(),
                        result.getErrorMessage()
                );

                return ResponseEntity.ok(PaymentVerificationResponse.builder()
                        .success(false)
                        .status("FAILED")
                        .message(result.getErrorMessage() != null
                                ? result.getErrorMessage()
                                : "Payment was declined. Please try again.")
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

    @PostMapping("/webhook")
    public ResponseEntity<Void> handleWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "X-Gateway-Signature", required = false) String signature) {

        log.info("Received MPGS webhook");

        try {
            mpgsPaymentService.processWebhook(payload, signature);
            return ResponseEntity.ok().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (Exception e) {
            log.error("Webhook processing failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

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

    private UUID extractUserIdFromAuth(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        return user.getUserId();
    }
}
