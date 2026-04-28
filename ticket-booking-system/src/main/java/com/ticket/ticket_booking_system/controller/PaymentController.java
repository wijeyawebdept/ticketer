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

            // Embed bookingId in returnUrl so MPGS sends it back in the redirect URL.
            // This avoids any localStorage/sessionStorage unreliability after external
            // redirects.
            String returnUrl = request.getReturnUrl()
                    + (request.getReturnUrl().contains("?") ? "&" : "?")
                    + "bookingId=" + booking.getBookingId().toString();

            MPGSSessionResponse sessionResponse = mpgsPaymentService.createCheckoutSession(
                    booking.getBookingId(),
                    request.getTotalAmount(),
                    request.getCurrency(),
                    returnUrl,
                    request.getCancelUrl());

            transactionService.createPendingTransaction(
                    booking.getBookingId(),
                    request.getTotalAmount(),
                    sessionResponse.getSessionId(),
                    sessionResponse.getSuccessIndicator());

            return ResponseEntity.ok(sessionResponse);

        } catch (org.springframework.web.client.RestClientResponseException e) {
            log.error("MPGS error: status={}, body={}", e.getStatusCode().value(), e.getResponseBodyAsString());

            // cleanup so you don't keep PENDING junk
            if (booking != null) {
                bookingService.cancelBooking(booking.getBookingId().toString());
            }

            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(java.util.Map.of(
                    "message", "MPGS rejected the request",
                    "status", e.getStatusCode().value(),
                    "body", e.getResponseBodyAsString()));
        } catch (Exception e) {
            log.error("Payment initiation failed: {}", e.getMessage(), e);

            // cleanup so you don't keep PENDING junk
            if (booking != null) {
                bookingService.cancelBooking(booking.getBookingId().toString());
            }

            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(java.util.Map.of(
                    "message", "Payment initiation failed",
                    "details", e.getMessage()));
        }
    }

    @GetMapping("/verify")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<PaymentVerificationResponse> verifyPayment(
            @RequestParam String sessionId,
            Authentication authentication) {

        log.info("Verifying payment for session: {}", sessionId);

        try {
            // Look up transaction first to get the MPGS orderId (= booking UUID)
            Transaction transaction = transactionService.getTransactionByReference(sessionId);
            if (transaction == null) {
                return ResponseEntity.ok(PaymentVerificationResponse.builder()
                        .success(false)
                        .status("ERROR")
                        .message("Transaction not found. Please contact support.")
                        .build());
            }

            Booking booking = transaction.getBooking();

            // Idempotency: if booking is already confirmed (e.g. page refresh), return
            // success immediately
            if (booking.getStatus() == Booking.BookingStatus.CONFIRMED) {
                log.info("Booking {} already confirmed, returning cached success", booking.getBookingId());
                return ResponseEntity.ok(PaymentVerificationResponse.builder()
                        .success(true)
                        .status("SUCCESS")
                        .transactionId(transaction.getTransactionId().toString())
                        .bookingId(booking.getBookingId())
                        .bookingReference(booking.getBookingReference())
                        .amount(booking.getTotalAmount())
                        .message("Payment successful! Your booking is confirmed.")
                        .build());
            }

            // Verify against MPGS using the ORDER endpoint (orderId = bookingId = MPGS
            // order.id set during session creation)
            String orderId = booking.getBookingId().toString();
            MPGSPaymentResult result = mpgsPaymentService.verifyPaymentByOrder(orderId);

            Transaction.TransactionStatus newStatus = result.isSuccess()
                    ? Transaction.TransactionStatus.SUCCESS
                    : Transaction.TransactionStatus.FAILED;

            transactionService.updateTransactionStatus(sessionId, newStatus, result.getRawResponse());

            if (result.isSuccess()) {
                Booking confirmedBooking = bookingService.confirmBookingAfterPayment(booking.getBookingId());

                String customerEmail = booking.getUser().getEmail();
                emailService.sendBookingConfirmationEmail(
                        confirmedBooking,
                        customerEmail,
                        transaction.getTransactionId().toString(),
                        result.getCardType());

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
                        "Payment failed: " + (result.getErrorMessage() != null ? result.getErrorMessage() : "Unknown"));

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
                        result.getErrorMessage());

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

    /**
     * Verify payment using the booking ID that MPGS echoes back in the returnUrl
     * redirect.
     * Uses the successIndicator/resultIndicator comparison — the official MPGS
     * Hosted Checkout
     * verification approach, requires no additional MPGS API call.
     */
    @GetMapping("/verify-by-booking")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<PaymentVerificationResponse> verifyPaymentByBooking(
            @RequestParam UUID bookingId,
            @RequestParam(required = false) String resultIndicator,
            Authentication authentication) {

        log.info("Verifying payment by bookingId: {}, resultIndicator: {}", bookingId, resultIndicator);

        try {
            Booking booking;
            try {
                booking = bookingService.getBookingById(bookingId.toString());
            } catch (RuntimeException e) {
                return ResponseEntity.ok(PaymentVerificationResponse.builder()
                        .success(false)
                        .status("ERROR")
                        .message("Booking not found. Please contact support.")
                        .build());
            }

            // Idempotency: already confirmed (e.g. page refresh)
            if (booking.getStatus() == Booking.BookingStatus.CONFIRMED) {
                log.info("Booking {} already confirmed, returning cached success", bookingId);
                return ResponseEntity.ok(PaymentVerificationResponse.builder()
                        .success(true)
                        .status("SUCCESS")
                        .bookingId(booking.getBookingId())
                        .bookingReference(booking.getBookingReference())
                        .amount(booking.getTotalAmount())
                        .message("Payment successful! Your booking is confirmed.")
                        .build());
            }

            // Look up the PENDING transaction to retrieve stored successIndicator
            Transaction transaction = transactionService.getTransactionsByBookingId(bookingId)
                    .stream()
                    .filter(t -> t.getType() == Transaction.TransactionType.PAYMENT)
                    .findFirst()
                    .orElse(null);

            if (transaction == null) {
                return ResponseEntity.ok(PaymentVerificationResponse.builder()
                        .success(false)
                        .status("ERROR")
                        .message("Transaction not found. Please contact support.")
                        .build());
            }

            // Extract successIndicator stored during session creation
            boolean isSuccess = false;
            String storedSuccessIndicator = null;
            try {
                String gatewayResponse = transaction.getPaymentGatewayResponse();
                if (gatewayResponse != null) {
                    com.fasterxml.jackson.databind.JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper()
                            .readTree(gatewayResponse);
                    if (node.has("successIndicator")) {
                        storedSuccessIndicator = node.get("successIndicator").asText();
                    }
                }
            } catch (Exception parseEx) {
                log.warn("Could not parse stored gateway response: {}", parseEx.getMessage());
            }

            if (resultIndicator != null && storedSuccessIndicator != null) {
                // Official MPGS approach: compare resultIndicator from redirect URL vs stored
                // successIndicator
                isSuccess = resultIndicator.equals(storedSuccessIndicator);
                log.info("MPGS indicator comparison: result={}, stored={}, match={}",
                        resultIndicator, storedSuccessIndicator, isSuccess);
            } else {
                // Fallback: query the MPGS order API directly
                log.warn("Falling back to MPGS order API (resultIndicator={}, storedSuccessIndicator={})",
                        resultIndicator, storedSuccessIndicator);
                MPGSPaymentResult fallbackResult = mpgsPaymentService.verifyPaymentByOrder(bookingId.toString());
                isSuccess = fallbackResult.isSuccess();
                log.info("MPGS order API fallback result: success={}", isSuccess);
            }

            String rawResponse = "{\"resultIndicator\":\"" + resultIndicator + "\","
                    + "\"successIndicator\":\"" + storedSuccessIndicator + "\","
                    + "\"match\":" + isSuccess + "}";

            Transaction.TransactionStatus newStatus = isSuccess
                    ? Transaction.TransactionStatus.SUCCESS
                    : Transaction.TransactionStatus.FAILED;

            transactionService.updateTransactionStatus(
                    transaction.getTransactionReference(), newStatus, rawResponse);

            if (isSuccess) {
                Booking confirmedBooking = bookingService.confirmBookingAfterPayment(bookingId);

                // Build receipt details from the fully-loaded confirmedBooking
                String eventName = confirmedBooking.getEvent() != null ? confirmedBooking.getEvent().getName() : "N/A";
                String eventDate = "N/A";
                String eventTime = "N/A";
                if (confirmedBooking.getEventSchedule() != null) {
                    if (confirmedBooking.getEventSchedule().getScheduleDate() != null)
                        eventDate = confirmedBooking.getEventSchedule().getScheduleDate()
                                .format(java.time.format.DateTimeFormatter.ofPattern("dd MMMM yyyy"));
                    if (confirmedBooking.getEventSchedule().getStartTime() != null)
                        eventTime = confirmedBooking.getEventSchedule().getStartTime()
                                .format(java.time.format.DateTimeFormatter.ofPattern("hh:mm a"));
                }
                String venueName = "N/A";
                if (confirmedBooking.getEvent() != null) {
                    venueName = confirmedBooking.getEvent().getVenueName() != null
                            ? confirmedBooking.getEvent().getVenueName()
                            : (confirmedBooking.getEvent().getVenue() != null
                                    ? confirmedBooking.getEvent().getVenue().getName()
                                    : "N/A");
                }
                String seatDetails = confirmedBooking.getBookingSeats().stream()
                        .sorted((a, b) -> {
                            if (Boolean.TRUE.equals(a.getIsSharedAreaTicket())
                                    && !Boolean.TRUE.equals(b.getIsSharedAreaTicket()))
                                return 1;
                            if (!Boolean.TRUE.equals(a.getIsSharedAreaTicket())
                                    && Boolean.TRUE.equals(b.getIsSharedAreaTicket()))
                                return -1;
                            return 0;
                        })
                        .map(bs -> {
                            if (Boolean.TRUE.equals(bs.getIsSharedAreaTicket()))
                                return "Shared Area #" + bs.getSharedAreaNumber() + " - " + bs.getTicketCode();
                            String seatLabel = bs.getVenueSeatId() != null ? bs.getVenueSeatId() : "Seat";
                            return seatLabel + " - " + bs.getTicketCode();
                        })
                        .collect(java.util.stream.Collectors.joining("\n"));
                String paymentDate = java.time.LocalDateTime.now()
                        .format(java.time.format.DateTimeFormatter.ofPattern("dd MMMM yyyy, hh:mm a"));

                String customerEmail = confirmedBooking.getUser().getEmail();
                emailService.sendBookingConfirmationEmail(
                        confirmedBooking,
                        customerEmail,
                        transaction.getTransactionId().toString(),
                        null);

                return ResponseEntity.ok(PaymentVerificationResponse.builder()
                        .success(true)
                        .status("SUCCESS")
                        .transactionId(transaction.getTransactionId().toString())
                        .bookingId(confirmedBooking.getBookingId())
                        .bookingReference(confirmedBooking.getBookingReference())
                        .amount(confirmedBooking.getTotalAmount())
                        .message("Payment successful! Your booking is confirmed.")
                        .eventName(eventName)
                        .eventDate(eventDate)
                        .eventTime(eventTime)
                        .venueName(venueName)
                        .ticketCount(confirmedBooking.getBookingSeats().size())
                        .seatDetails(seatDetails)
                        .paymentDate(paymentDate)
                        .build());
            } else {
                bookingService.cancelBookingAfterPaymentFailure(
                        bookingId,
                        "Payment indicators did not match");

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
                        "Payment verification failed");

                return ResponseEntity.ok(PaymentVerificationResponse.builder()
                        .success(false)
                        .status("FAILED")
                        .message("Payment was declined. Please try again.")
                        .build());
            }

        } catch (Exception e) {
            log.error("Payment verification by booking error: {}", e.getMessage(), e);
            return ResponseEntity.ok(PaymentVerificationResponse.builder()
                    .success(false)
                    .status("ERROR")
                    .message("Failed to verify payment: " + e.getMessage())
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
