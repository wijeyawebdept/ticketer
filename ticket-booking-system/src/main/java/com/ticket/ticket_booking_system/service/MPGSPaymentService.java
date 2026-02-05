package com.ticket.ticket_booking_system.service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ticket.ticket_booking_system.config.MPGSConfig;
import com.ticket.ticket_booking_system.dto.response.MPGSPaymentResult;
import com.ticket.ticket_booking_system.dto.response.MPGSSessionResponse;
import com.ticket.ticket_booking_system.entity.Booking;
import com.ticket.ticket_booking_system.entity.Transaction;
import com.ticket.ticket_booking_system.repository.BookingRepository;
import com.ticket.ticket_booking_system.repository.TransactionRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

/**
 * Service for MPGS (Mastercard Payment Gateway Services) integration
 * Handles session creation, payment verification, refunds, and webhooks
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MPGSPaymentService {

    private final MPGSConfig mpgsConfig;
    private final WebClient.Builder webClientBuilder;
    private final TransactionRepository transactionRepository;
    private final BookingRepository bookingRepository;
    private final ObjectMapper objectMapper;

    /**
     * Create a checkout session with MPGS for Hosted Checkout (Lightbox)
     *
     * @param bookingId UUID of the booking
     * @param amount Payment amount
     * @param currency Currency code (e.g., "LKR")
     * @return MPGSSessionResponse containing session ID and checkout details
     */
    public MPGSSessionResponse createCheckoutSession(UUID bookingId, BigDecimal amount, String currency) {
        log.info("Creating MPGS checkout session for booking: {}, amount: {}, currency: {}",
                 bookingId, amount, currency);

        try {
            // Generate unique order reference
            String orderReference = "ORD-" + bookingId.toString().substring(0, 13).toUpperCase();

            // Build session request payload
            Map<String, Object> sessionRequest = new HashMap<>();

            // Order details
            Map<String, Object> order = new HashMap<>();
            order.put("id", orderReference);
            order.put("amount", amount.toString());
            order.put("currency", currency);
            order.put("description", "Event Ticket Booking - " + orderReference);
            sessionRequest.put("order", order);

            // Interaction settings
            Map<String, Object> interaction = new HashMap<>();
            interaction.put("operation", "PURCHASE");
            Map<String, Object> merchant = new HashMap<>();
            merchant.put("name", "Ticket Booking System");
            interaction.put("merchant", merchant);

            Map<String, Object> displayControl = new HashMap<>();
            displayControl.put("billingAddress", "HIDE");
            displayControl.put("customerEmail", "HIDE");
            displayControl.put("orderSummary", "HIDE");
            displayControl.put("shipping", "HIDE");
            interaction.put("displayControl", displayControl);

            sessionRequest.put("interaction", interaction);

            // Call MPGS API to create session
            String endpoint = mpgsConfig.getApiEndpoint("/session");

            WebClient webClient = webClientBuilder
                    .baseUrl(endpoint)
                    .defaultHeader(HttpHeaders.AUTHORIZATION, mpgsConfig.getBasicAuthHeader())
                    .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .build();

            String responseBody = webClient.post()
                    .bodyValue(sessionRequest)
                    .retrieve()

                    //credentials harida balanna damme
                    .onStatus(status -> status.is4xxClientError(), response -> {
                        return response.bodyToMono(String.class)
                            .flatMap(body -> {
                                if (response.statusCode().value() == 401) {
                                    return Mono.error(new RuntimeException("========>MPGS authentication failed. Check merchant ID and API password."));
                                }
                                return Mono.error(new RuntimeException("=======>Payment gateway error: " + body));
                            });
                    })
                    
                    .bodyToMono(String.class)
                    .retryWhen(Retry.backoff(3, Duration.ofSeconds(2))
                            .maxBackoff(Duration.ofSeconds(10))
                            .filter(this::isRetryableException))
                    .block();

            // Parse response
            JsonNode responseJson = objectMapper.readTree(responseBody);
            String sessionId = responseJson.get("session").get("id").asText();
            String sessionVersion = responseJson.get("session").get("version").asText();

            log.info("MPGS checkout session created successfully. SessionID: {}, Version: {}",
                     sessionId, sessionVersion);

            // Build response
            return MPGSSessionResponse.builder()
                    .sessionId(sessionId)
                    .merchantId(mpgsConfig.getMerchant().getId())
                    .checkoutScriptUrl(mpgsConfig.getCheckoutScriptUrl(sessionId))
                    .amount(amount)
                    .currency(currency)
                    .bookingId(bookingId)
                    .successUrl(mpgsConfig.getSuccessUrl())
                    .cancelUrl(mpgsConfig.getCancelUrl())
                    .errorUrl(mpgsConfig.getErrorUrl())
                    .build();

        } catch (WebClientResponseException e) {
            log.error("MPGS API error while creating session: Status={}, Body={}",
                      e.getStatusCode(), e.getResponseBodyAsString(), e);
            throw new RuntimeException("Failed to create MPGS session: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Unexpected error creating MPGS session", e);
            throw new RuntimeException("Failed to create MPGS session", e);
        }
    }

    /**
     * Verify payment result from MPGS after checkout completion
     *
     * @param sessionId MPGS session ID
     * @return MPGSPaymentResult containing verification details
     */
    public MPGSPaymentResult verifyPayment(String sessionId) {
        log.info("Verifying payment for MPGS session: {}", sessionId);

        try {
            // Retrieve session details from MPGS
            String endpoint = mpgsConfig.getApiEndpoint("/session/" + sessionId);

            WebClient webClient = webClientBuilder
                    .baseUrl(endpoint)
                    .defaultHeader(HttpHeaders.AUTHORIZATION, mpgsConfig.getBasicAuthHeader())
                    .build();

            String responseBody = webClient.get()
                    .retrieve()
                    .bodyToMono(String.class)
                    .retryWhen(Retry.backoff(3, Duration.ofSeconds(2))
                            .maxBackoff(Duration.ofSeconds(10))
                            .filter(this::isRetryableException))
                    .block();

            // Parse response
            JsonNode responseJson = objectMapper.readTree(responseBody);
            JsonNode session = responseJson.get("session");
            JsonNode order = responseJson.has("order") ? responseJson.get("order") : null;

            // Extract payment status
            String status = session.has("updateStatus") ?
                           session.get("updateStatus").asText() : "UNKNOWN";

            boolean isSuccess = false;
            String gatewayCode = "";
            String errorMessage = "";
            String cardType = "";
            String cardLast4 = "";

            // Check if order exists (payment attempted)
            if (order != null) {
                String orderStatus = order.has("status") ? order.get("status").asText() : "";
                gatewayCode = orderStatus;
                isSuccess = "CAPTURED".equalsIgnoreCase(orderStatus) ||
                           "APPROVED".equalsIgnoreCase(orderStatus);

                // Extract transaction details if available
                if (order.has("transaction")) {
                    JsonNode transactions = order.get("transaction");
                    if (transactions.isArray() && transactions.size() > 0) {
                        JsonNode transaction = transactions.get(0);

                        // Gateway code
                        if (transaction.has("gatewayCode")) {
                            gatewayCode = transaction.get("gatewayCode").asText();
                        }

                        // Card details
                        if (transaction.has("sourceOfFunds")) {
                            JsonNode sourceOfFunds = transaction.get("sourceOfFunds");
                            if (sourceOfFunds.has("type")) {
                                cardType = sourceOfFunds.get("type").asText();
                            }
                            if (sourceOfFunds.has("provided") &&
                                sourceOfFunds.get("provided").has("card")) {
                                JsonNode card = sourceOfFunds.get("provided").get("card");
                                if (card.has("number")) {
                                    String fullCard = card.get("number").asText();
                                    cardLast4 = fullCard.length() >= 4 ?
                                               fullCard.substring(fullCard.length() - 4) : fullCard;
                                }
                                if (card.has("scheme")) {
                                    cardType = card.get("scheme").asText();
                                }
                            }
                        }
                    }
                }

                // Extract error message if payment failed
                if (!isSuccess && order.has("error")) {
                    JsonNode error = order.get("error");
                    if (error.has("explanation")) {
                        errorMessage = error.get("explanation").asText();
                    } else if (error.has("cause")) {
                        errorMessage = error.get("cause").asText();
                    }
                }
            } else {
                errorMessage = "Payment was not completed";
            }

            String orderId = order != null && order.has("id") ? order.get("id").asText() : "";
            String transactionId = order != null && order.has("transaction") &&
                                  order.get("transaction").isArray() &&
                                  order.get("transaction").size() > 0 ?
                                  order.get("transaction").get(0).get("id").asText() : sessionId;

            BigDecimal amount = order != null && order.has("amount") ?
                               new BigDecimal(order.get("amount").asText()) : BigDecimal.ZERO;

            String currency = order != null && order.has("currency") ?
                             order.get("currency").asText() : mpgsConfig.getCurrency();

            log.info("Payment verification result: SessionID={}, Success={}, GatewayCode={}, OrderID={}",
                     sessionId, isSuccess, gatewayCode, orderId);

            return MPGSPaymentResult.builder()
                    .success(isSuccess)
                    .resultIndicator(status)
                    .sessionVersion(session.get("version").asText())
                    .orderId(orderId)
                    .transactionId(transactionId)
                    .amount(amount)
                    .currency(currency)
                    .gatewayCode(gatewayCode)
                    .errorMessage(errorMessage)
                    .rawResponse(responseBody)
                    .cardType(cardType)
                    .cardLast4(cardLast4)
                    .build();

        } catch (WebClientResponseException e) {
            log.error("MPGS API error while verifying payment: Status={}, Body={}",
                      e.getStatusCode(), e.getResponseBodyAsString(), e);
            throw new RuntimeException("Failed to verify payment: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Unexpected error verifying payment", e);
            throw new RuntimeException("Failed to verify payment", e);
        }
    }

    /**
     * Process refund for a successful payment
     *
     * @param bookingId Booking ID to refund
     * @param amount Refund amount (null for full refund)
     * @param reason Refund reason
     * @return Transaction representing the refund
     */
    public Transaction processRefund(UUID bookingId, BigDecimal amount, String reason) {
        log.info("Processing refund for booking: {}, amount: {}, reason: {}",
                 bookingId, amount, reason);

        try {
            // Find booking and original payment transaction
            Booking booking = bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));

            Transaction originalTransaction = transactionRepository
                    .findByBooking_BookingIdAndTypeAndStatus(
                            bookingId,
                            Transaction.TransactionType.PAYMENT,
                            Transaction.TransactionStatus.SUCCESS
                    )
                    .stream()
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("No successful payment found for booking"));

            // Determine refund amount
            BigDecimal refundAmount = amount != null ? amount : originalTransaction.getAmount();

            // Parse original transaction to get order ID and transaction ID
            JsonNode originalResponse = objectMapper.readTree(originalTransaction.getPaymentGatewayResponse());
            String orderId = originalResponse.has("orderId") ?
                            originalResponse.get("orderId").asText() :
                            "ORD-" + bookingId.toString().substring(0, 13).toUpperCase();

            String transactionId = UUID.randomUUID().toString();

            // Build refund request
            Map<String, Object> refundRequest = new HashMap<>();
            refundRequest.put("apiOperation", "REFUND");

            Map<String, Object> transaction = new HashMap<>();
            transaction.put("amount", refundAmount.toString());
            transaction.put("currency", originalTransaction.getAmount() != null ?
                           mpgsConfig.getCurrency() : "LKR");
            refundRequest.put("transaction", transaction);

            // Call MPGS refund API
            String endpoint = mpgsConfig.getApiEndpoint(
                    "/order/" + orderId + "/transaction/" + transactionId
            );

            WebClient webClient = webClientBuilder
                    .baseUrl(endpoint)
                    .defaultHeader(HttpHeaders.AUTHORIZATION, mpgsConfig.getBasicAuthHeader())
                    .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .build();

            String responseBody = webClient.put()
                    .bodyValue(refundRequest)
                    .retrieve()
                    .bodyToMono(String.class)
                    .retryWhen(Retry.backoff(3, Duration.ofSeconds(2))
                            .maxBackoff(Duration.ofSeconds(10))
                            .filter(this::isRetryableException))
                    .block();

            // Parse response
            JsonNode responseJson = objectMapper.readTree(responseBody);
            String result = responseJson.has("result") ?
                           responseJson.get("result").asText() : "UNKNOWN";

            boolean refundSuccess = "SUCCESS".equalsIgnoreCase(result);

            // Create refund transaction record
            Transaction refundTransaction = Transaction.builder()
                    .booking(booking)
                    .transactionReference("REFUND-" + transactionId)
                    .amount(refundAmount)
                    .type(Transaction.TransactionType.REFUND)
                    .status(refundSuccess ? Transaction.TransactionStatus.SUCCESS :
                                           Transaction.TransactionStatus.FAILED)
                    .paymentGatewayResponse(responseBody)
                    .build();

            refundTransaction = transactionRepository.save(refundTransaction);

            log.info("Refund processed: TransactionID={}, Success={}",
                     refundTransaction.getTransactionId(), refundSuccess);

            return refundTransaction;

        } catch (WebClientResponseException e) {
            log.error("MPGS API error while processing refund: Status={}, Body={}",
                      e.getStatusCode(), e.getResponseBodyAsString(), e);
            throw new RuntimeException("Failed to process refund: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Unexpected error processing refund", e);
            throw new RuntimeException("Failed to process refund", e);
        }
    }

    /**
     * Process webhook notification from MPGS
     *
     * @param payload Webhook payload
     * @param signature Webhook signature for verification
     */
    public void processWebhook(String payload, String signature) {
        log.info("Processing MPGS webhook");

        try {
            // Verify webhook signature
            if (!verifyWebhookSignature(payload, signature)) {
                log.warn("Invalid webhook signature - potential spoofing attempt");
                throw new SecurityException("Invalid webhook signature");
            }

            // Parse webhook payload
            JsonNode webhookData = objectMapper.readTree(payload);

            // Extract session/order ID and process accordingly
            String sessionId = webhookData.has("sessionId") ?
                              webhookData.get("sessionId").asText() : null;

            if (sessionId != null) {
                // Verify payment and update transaction
                MPGSPaymentResult result = verifyPayment(sessionId);

                // Find transaction by session ID and update
                Transaction transaction = transactionRepository
                        .findByTransactionReference(sessionId)
                        .orElse(null);

                if (transaction != null) {
                    transaction.setStatus(result.isSuccess() ?
                            Transaction.TransactionStatus.SUCCESS :
                            Transaction.TransactionStatus.FAILED);
                    transaction.setPaymentGatewayResponse(result.getRawResponse());
                    transactionRepository.save(transaction);

                    log.info("Transaction updated via webhook: TransactionID={}, Status={}",
                             transaction.getTransactionId(), transaction.getStatus());
                }
            }

        } catch (Exception e) {
            log.error("Error processing webhook", e);
            throw new RuntimeException("Webhook processing failed", e);
        }
    }

    /**
     * Verify webhook signature to prevent spoofing
     *
     * @param payload Webhook payload
     * @param signature Received signature
     * @return true if signature is valid
     */
    private boolean verifyWebhookSignature(String payload, String signature) {
        try {
            // Handle null or empty signature
            if (signature == null || signature.isEmpty()) {
                log.warn("Missing webhook signature");
                return false;
            }

            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(
                    mpgsConfig.getWebhookSecret().getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256"
            );
            mac.init(secretKey);

            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String expectedSignature = java.util.Base64.getEncoder().encodeToString(hash);

            return MessageDigest.isEqual(
                    signature.getBytes(StandardCharsets.UTF_8),
                    expectedSignature.getBytes(StandardCharsets.UTF_8)
            );
        } catch (Exception e) {
            log.error("Webhook signature verification failed", e);
            return false;
        }
    }

    /**
     * Check if exception is retryable
     *
     * @param throwable Exception to check
     * @return true if retryable
     */
    private boolean isRetryableException(Throwable throwable) {
        if (throwable instanceof WebClientResponseException) {
            WebClientResponseException ex = (WebClientResponseException) throwable;
            int statusCode = ex.getStatusCode().value();
            return statusCode >= 500 || statusCode == 429; // Server errors or rate limiting
        }
        return false;
    }
}
