package com.ticket.ticket_booking_system.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
     * Create a checkout session with MPGS for Hosted Checkout
     *
     * CBMPGS session creation accepts ONLY:
     * - apiOperation: CREATE_CHECKOUT_SESSION
     * 
     * Everything else (order, interaction) must be in frontend Checkout.configure()
     */
    public MPGSSessionResponse createCheckoutSession(UUID bookingId, BigDecimal amount, String currency) {
        log.info("Creating MPGS checkout session for booking: {}, amount: {}, currency: {}",
                bookingId, amount, currency);

        try {
            String orderReference = "ORD-" + bookingId.toString().substring(0, 13).toUpperCase();

            // CBMPGS only accepts apiOperation - NOTHING else!
            Map<String, Object> sessionRequest = new HashMap<>();
            sessionRequest.put("apiOperation", "CREATE_CHECKOUT_SESSION");

            // Log the payload for debugging
            log.info("MPGS session payload: {}", objectMapper.writeValueAsString(sessionRequest));

            String endpoint = mpgsConfig.getApiEndpoint("/session");

            WebClient webClient = webClientBuilder
                    .defaultHeader(HttpHeaders.AUTHORIZATION, mpgsConfig.getBasicAuthHeader())
                    .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .build();

            String responseBody = webClient.post()
                    .uri(endpoint)
                    .bodyValue(sessionRequest)
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                            response -> response.bodyToMono(String.class).flatMap(body -> {
                                log.error("MPGS create session failed. Status={}, Body={}",
                                        response.statusCode().value(), body);
                                return Mono.error(new RuntimeException("MPGS Error: " + body));
                            }))
                    .bodyToMono(String.class)
                    .block();

            JsonNode json = objectMapper.readTree(responseBody);
            String sessionId = json.get("session").get("id").asText();

            log.info("MPGS session created successfully: {}", sessionId);

            return MPGSSessionResponse.builder()
                    .sessionId(sessionId)
                    .merchantId(mpgsConfig.getMerchantId())
                    .checkoutScriptUrl(mpgsConfig.getCheckoutScriptUrl())
                    .amount(amount)
                    .currency(currency)
                    .bookingId(bookingId)
                    .successUrl(mpgsConfig.getSuccessUrl())
                    .cancelUrl(mpgsConfig.getCancelUrl())
                    .errorUrl(mpgsConfig.getErrorUrl())
                    .orderReference(orderReference)
                    .build();

        } catch (WebClientResponseException e) {
            log.error("MPGS API error while creating session: Status={}, Body={}",
                    e.getStatusCode(), e.getResponseBodyAsString(), e);
            throw new RuntimeException("Failed to create MPGS session: " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            log.error("Unexpected error creating MPGS session", e);
            throw new RuntimeException("Failed to create MPGS session", e);
        }
    }

    /**
     * Verify payment result from MPGS after checkout completion
     */
    public MPGSPaymentResult verifyPayment(String sessionId) {
        log.info("Verifying payment for MPGS session: {}", sessionId);

        try {
            String endpoint = mpgsConfig.getApiEndpoint("/session/" + sessionId);

            WebClient webClient = webClientBuilder
                    .defaultHeader(HttpHeaders.AUTHORIZATION, mpgsConfig.getBasicAuthHeader())
                    .build();

            String responseBody = webClient.get()
                    .uri(endpoint)
                    .retrieve()
                    .bodyToMono(String.class)
                    .retryWhen(Retry.backoff(3, Duration.ofSeconds(2))
                            .maxBackoff(Duration.ofSeconds(10))
                            .filter(this::isRetryableException))
                    .block();

            JsonNode responseJson = objectMapper.readTree(responseBody);
            JsonNode session = responseJson.path("session");
            JsonNode order = responseJson.has("order") ? responseJson.get("order") : null;

            String updateStatus = session.has("updateStatus") ? session.get("updateStatus").asText() : "UNKNOWN";

            boolean isSuccess = false;
            String gatewayCode = "";
            String errorMessage = "";
            String cardType = "";
            String cardLast4 = "";

            if (order != null && !order.isMissingNode()) {
                String orderStatus = order.has("status") ? order.get("status").asText() : "";
                gatewayCode = orderStatus;

                // Most gateways: CAPTURED / APPROVED indicates success
                isSuccess = "CAPTURED".equalsIgnoreCase(orderStatus)
                        || "APPROVED".equalsIgnoreCase(orderStatus)
                        || "SUCCESS".equalsIgnoreCase(orderStatus);

                if (order.has("transaction") && order.get("transaction").isArray() && order.get("transaction").size() > 0) {
                    JsonNode tx = order.get("transaction").get(0);

                    if (tx.has("gatewayCode")) {
                        gatewayCode = tx.get("gatewayCode").asText();
                    }

                    if (tx.has("sourceOfFunds")) {
                        JsonNode sof = tx.get("sourceOfFunds");
                        if (sof.has("provided") && sof.get("provided").has("card")) {
                            JsonNode card = sof.get("provided").get("card");
                            if (card.has("number")) {
                                String fullCard = card.get("number").asText();
                                cardLast4 = fullCard.length() >= 4
                                        ? fullCard.substring(fullCard.length() - 4)
                                        : fullCard;
                            }
                            if (card.has("scheme")) {
                                cardType = card.get("scheme").asText();
                            }
                        }
                    }
                }

                if (!isSuccess && order.has("error")) {
                    JsonNode err = order.get("error");
                    if (err.has("explanation")) errorMessage = err.get("explanation").asText();
                    else if (err.has("cause")) errorMessage = err.get("cause").asText();
                }
            } else {
                errorMessage = "Payment was not completed";
            }

            String orderId = (order != null && order.has("id")) ? order.get("id").asText() : "";
            String transactionId = sessionId;

            BigDecimal amount = (order != null && order.has("amount"))
                    ? new BigDecimal(order.get("amount").asText())
                    : BigDecimal.ZERO;

            String currency = (order != null && order.has("currency"))
                    ? order.get("currency").asText()
                    : mpgsConfig.getCurrency();

            log.info("Payment verification result: SessionID={}, Success={}, GatewayCode={}, OrderID={}",
                    sessionId, isSuccess, gatewayCode, orderId);

            return MPGSPaymentResult.builder()
                    .success(isSuccess)
                    .resultIndicator(updateStatus)
                    .sessionVersion(session.path("version").asText("1"))
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
            throw new RuntimeException("Failed to verify payment: " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            log.error("Unexpected error verifying payment", e);
            throw new RuntimeException("Failed to verify payment", e);
        }
    }

    /**
     * Process refund for a successful payment
     */
    public Transaction processRefund(UUID bookingId, BigDecimal amount, String reason) {
        log.info("Processing refund for booking: {}, amount: {}, reason: {}",
                bookingId, amount, reason);

        try {
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

            BigDecimal refundAmount = amount != null ? amount : originalTransaction.getAmount();

            JsonNode originalResponse = objectMapper.readTree(originalTransaction.getPaymentGatewayResponse());
            String orderId = originalResponse.has("orderId")
                    ? originalResponse.get("orderId").asText()
                    : "ORD-" + bookingId.toString().substring(0, 13).toUpperCase();

            String transactionId = UUID.randomUUID().toString();

            Map<String, Object> refundRequest = new HashMap<>();
            refundRequest.put("apiOperation", "REFUND");

            Map<String, Object> transaction = new HashMap<>();
            transaction.put("amount", refundAmount.setScale(2, RoundingMode.HALF_UP).toPlainString());
            transaction.put("currency", mpgsConfig.getCurrency());
            refundRequest.put("transaction", transaction);

            String endpoint = mpgsConfig.getApiEndpoint("/order/" + orderId + "/transaction/" + transactionId);

            WebClient webClient = webClientBuilder
                    .defaultHeader(HttpHeaders.AUTHORIZATION, mpgsConfig.getBasicAuthHeader())
                    .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .build();

            String responseBody = webClient.put()
                    .uri(endpoint)
                    .bodyValue(refundRequest)
                    .retrieve()
                    .bodyToMono(String.class)
                    .retryWhen(Retry.backoff(3, Duration.ofSeconds(2))
                            .maxBackoff(Duration.ofSeconds(10))
                            .filter(this::isRetryableException))
                    .block();

            JsonNode responseJson = objectMapper.readTree(responseBody);
            String result = responseJson.has("result") ? responseJson.get("result").asText() : "UNKNOWN";
            boolean refundSuccess = "SUCCESS".equalsIgnoreCase(result);

            Transaction refundTransaction = Transaction.builder()
                    .booking(booking)
                    .transactionReference("REFUND-" + transactionId)
                    .amount(refundAmount)
                    .type(Transaction.TransactionType.REFUND)
                    .status(refundSuccess ? Transaction.TransactionStatus.SUCCESS : Transaction.TransactionStatus.FAILED)
                    .paymentGatewayResponse(responseBody)
                    .build();

            refundTransaction = transactionRepository.save(refundTransaction);

            log.info("Refund processed: TransactionID={}, Success={}",
                    refundTransaction.getTransactionId(), refundSuccess);

            return refundTransaction;

        } catch (Exception e) {
            log.error("Unexpected error processing refund", e);
            throw new RuntimeException("Failed to process refund", e);
        }
    }

    public void processWebhook(String payload, String signature) {
        log.info("Processing MPGS webhook");

        try {
            if (!verifyWebhookSignature(payload, signature)) {
                log.warn("Invalid webhook signature - potential spoofing attempt");
                throw new SecurityException("Invalid webhook signature");
            }

            JsonNode webhookData = objectMapper.readTree(payload);

            String sessionId = webhookData.has("sessionId") ? webhookData.get("sessionId").asText() : null;

            if (sessionId != null) {
                MPGSPaymentResult result = verifyPayment(sessionId);

                Transaction transaction = transactionRepository
                        .findByTransactionReference(sessionId)
                        .orElse(null);

                if (transaction != null) {
                    transaction.setStatus(result.isSuccess()
                            ? Transaction.TransactionStatus.SUCCESS
                            : Transaction.TransactionStatus.FAILED);
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

    private boolean verifyWebhookSignature(String payload, String signature) {
        try {
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

    private boolean isRetryableException(Throwable throwable) {
        if (throwable instanceof WebClientResponseException) {
            WebClientResponseException ex = (WebClientResponseException) throwable;
            int statusCode = ex.getStatusCode().value();
            return statusCode >= 500 || statusCode == 429;
        }
        return false;
    }
}
