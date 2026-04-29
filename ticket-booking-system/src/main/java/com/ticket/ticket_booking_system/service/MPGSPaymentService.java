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

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
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
import reactor.util.retry.Retry;

/**
 * Service for MPGS (Mastercard Payment Gateway Services) integration
 * Handles session creation, payment verification, refunds, and webhooks
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MPGSPaymentService {

    private final MPGSConfig mpgsConfig;
    private final RestTemplate restTemplate;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;
    private final BookingRepository bookingRepository;
    private final TransactionRepository transactionRepository;

    public MPGSSessionResponse createCheckoutSession(
            UUID bookingId,
            BigDecimal amount,
            String currency,
            String returnUrl,
            String cancelUrl
    ) {
        String endpoint = mpgsConfig.getApiEndpoint("/session");

        String orderId = bookingId.toString();
        String amountStr = amount.setScale(2, RoundingMode.HALF_UP).toPlainString();
        String currencyStr = currency != null ? currency : mpgsConfig.getCurrency();

        // MPGS Hosted Checkout v67+: Initiate Checkout API
        // All order details must be sent during session creation
        Map<String, Object> order = new HashMap<>();
        order.put("id", orderId);
        order.put("amount", amountStr);
        order.put("currency", currencyStr);
        order.put("description", "Event ticket booking");

        Map<String, Object> interaction = new HashMap<>();
        interaction.put("operation", "PURCHASE");
        interaction.put("returnUrl", returnUrl);
        interaction.put("cancelUrl", cancelUrl);
        
        Map<String, Object> merchant = new HashMap<>();
        merchant.put("name", "Ticketer.lk");
        interaction.put("merchant", merchant);

        Map<String, Object> sessionRequest = new HashMap<>();
        sessionRequest.put("apiOperation", "INITIATE_CHECKOUT");
        sessionRequest.put("order", order);
        sessionRequest.put("interaction", interaction);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", mpgsConfig.getBasicAuthHeader());

        log.info("Creating MPGS checkout session: endpoint={}, orderId={}, amount={}, currency={}",
                endpoint, orderId, amountStr, currencyStr);
        log.debug("MPGS session request: {}", sessionRequest);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    endpoint,
                    HttpMethod.POST,
                    new HttpEntity<Map<String, Object>>(sessionRequest, headers),
                    String.class
            );

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new RuntimeException("MPGS session creation failed. Status=" + response.getStatusCode());
            }

            String responseBody = response.getBody();
            log.debug("MPGS session response: {}", responseBody);
            
            JsonNode responseJson = objectMapper.readTree(responseBody);
            
            if (!responseJson.has("session") || !responseJson.get("session").has("id")) {
                throw new RuntimeException("MPGS response missing session.id: " + responseBody);
            }

            String sessionId = responseJson.get("session").get("id").asText();

            // successIndicator is used to verify the payment after redirect (compare with resultIndicator)
            String successIndicator = responseJson.has("successIndicator")
                    ? responseJson.get("successIndicator").asText()
                    : null;

            return MPGSSessionResponse.builder()
                    .sessionId(sessionId)
                    .merchantId(mpgsConfig.getMerchantId())
                    .checkoutScriptUrl(mpgsConfig.getCheckoutScriptUrl())
                    .amount(amount)
                    .currency(currency != null ? currency : mpgsConfig.getCurrency())
                    .bookingId(bookingId)
                    .orderReference(bookingId.toString())
                    .successUrl(returnUrl)
                    .cancelUrl(cancelUrl)
                    .successIndicator(successIndicator)
                    .build();

        } catch (org.springframework.web.client.HttpClientErrorException e) {
            String errorBody = e.getResponseBodyAsString();
            log.error("MPGS rejected the request: Status={}, Body={}", e.getStatusCode(), errorBody);
            
            try {
                JsonNode errorJson = objectMapper.readTree(errorBody);
                String errorMessage = "MPGS Error: ";
                
                if (errorJson.has("error")) {
                    JsonNode error = errorJson.get("error");
                    if (error.has("explanation")) {
                        errorMessage += error.get("explanation").asText();
                    } else if (error.has("cause")) {
                        errorMessage += error.get("cause").asText();
                    } else {
                        errorMessage += errorBody;
                    }
                } else {
                    errorMessage += errorBody;
                }
                
                throw new RuntimeException(errorMessage, e);
            } catch (Exception parseEx) {
                throw new RuntimeException("MPGS Error: " + errorBody, e);
            }
        } catch (Exception e) {
            log.error("Unexpected error creating MPGS session", e);
            throw new RuntimeException("Failed to create payment session: " + e.getMessage(), e);
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
     * Verify payment result from MPGS using the Order ID (= booking UUID).
     * This is the correct approach for Hosted Checkout v67+: after redirect,
     * query GET /order/{orderId} to retrieve the real payment outcome.
     */
    public MPGSPaymentResult verifyPaymentByOrder(String orderId) {
        log.info("Verifying payment for MPGS order: {}", orderId);

        try {
            String endpoint = mpgsConfig.getApiEndpoint("/order/" + orderId);

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
            // MPGS GET /order/{id} may return the order at root or wrapped under "order"
            JsonNode order = responseJson.has("order") ? responseJson.get("order") : responseJson;

            String orderStatus = order.has("status") ? order.get("status").asText() : "";
            String gatewayCode = orderStatus;
            String errorMessage = "";
            String cardType = "";
            String cardLast4 = "";

            boolean isSuccess = "CAPTURED".equalsIgnoreCase(orderStatus)
                    || "APPROVED".equalsIgnoreCase(orderStatus)
                    || "SUCCESS".equalsIgnoreCase(orderStatus);

            if (order.has("transaction") && order.get("transaction").isArray() && order.get("transaction").size() > 0) {
                JsonNode tx = order.get("transaction").get(0);

                if (tx.has("gatewayCode")) {
                    gatewayCode = tx.get("gatewayCode").asText();
                    isSuccess = isSuccess || "APPROVED".equalsIgnoreCase(gatewayCode);
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

            BigDecimal amount = order.has("amount")
                    ? new BigDecimal(order.get("amount").asText())
                    : BigDecimal.ZERO;
            String currency = order.has("currency")
                    ? order.get("currency").asText()
                    : mpgsConfig.getCurrency();

            log.info("Order verification result: OrderID={}, Status={}, GatewayCode={}, Success={}",
                    orderId, orderStatus, gatewayCode, isSuccess);

            return MPGSPaymentResult.builder()
                    .success(isSuccess)
                    .resultIndicator(orderStatus)
                    .sessionVersion("1")
                    .orderId(orderId)
                    .transactionId(orderId)
                    .amount(amount)
                    .currency(currency)
                    .gatewayCode(gatewayCode)
                    .errorMessage(errorMessage)
                    .rawResponse(responseBody)
                    .cardType(cardType)
                    .cardLast4(cardLast4)
                    .build();

        } catch (WebClientResponseException e) {
            log.error("MPGS API error while verifying order: Status={}, Body={}",
                    e.getStatusCode(), e.getResponseBodyAsString(), e);
            throw new RuntimeException("Failed to verify payment: " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            log.error("Unexpected error verifying order", e);
            throw new RuntimeException("Failed to verify payment", e);
        }
    }

    /**
     * Process refund for a successful payment
     */
    @org.springframework.transaction.annotation.Transactional
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
                    .orElseThrow(() -> new RuntimeException("No successful payment found for booking " + bookingId));

            BigDecimal refundAmount = amount != null ? amount : originalTransaction.getAmount();

            // Determine the correct orderId used in the initial payment
            String orderId = bookingId.toString(); // Default fallback for our system
            try {
                if (originalTransaction.getPaymentGatewayResponse() != null) {
                    JsonNode originalResponse = objectMapper.readTree(originalTransaction.getPaymentGatewayResponse());
                    if (originalResponse.has("id")) {
                        orderId = originalResponse.get("id").asText();
                    } else if (originalResponse.has("order") && originalResponse.get("order").has("id")) {
                        orderId = originalResponse.get("order").get("id").asText();
                    }
                }
            } catch (Exception e) {
                log.warn("Could not parse original gateway response, using bookingId as orderId: {}", e.getMessage());
            }

            String transactionId = UUID.randomUUID().toString().substring(0, 10).toUpperCase();

            Map<String, Object> refundRequest = new HashMap<>();
            refundRequest.put("apiOperation", "REFUND");

            Map<String, Object> transaction = new HashMap<>();
            transaction.put("amount", refundAmount.setScale(2, RoundingMode.HALF_UP).toPlainString());
            transaction.put("currency", mpgsConfig.getCurrency());
            refundRequest.put("transaction", transaction);

            String endpoint = mpgsConfig.getApiEndpoint("/order/" + orderId + "/transaction/" + transactionId);

            log.info("Sending refund request to MPGS: endpoint={}, orderId={}, amount={}", 
                    endpoint, orderId, refundAmount);

            WebClient webClient = webClientBuilder
                    .defaultHeader(HttpHeaders.AUTHORIZATION, mpgsConfig.getBasicAuthHeader())
                    .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .build();

            String responseBody;
            try {
                responseBody = webClient.put()
                        .uri(endpoint)
                        .bodyValue(refundRequest)
                        .retrieve()
                        .bodyToMono(String.class)
                        .retryWhen(Retry.backoff(2, Duration.ofSeconds(1))
                                .filter(this::isRetryableException))
                        .block();
            } catch (WebClientResponseException e) {
                String errorBody = e.getResponseBodyAsString();
                log.error("MPGS Refund API error: Status={}, Body={}", e.getStatusCode(), errorBody);
                throw new RuntimeException("MPGS Refund Error: " + errorBody, e);
            }

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

            log.info("Refund processed: TransactionReference={}, Success={}",
                    refundTransaction.getTransactionReference(), refundSuccess);

            if (!refundSuccess) {
                String msg = responseJson.path("response").path("explanation").asText("Unknown gateway error");
                throw new RuntimeException("Refund rejected by gateway: " + msg);
            }

            return refundTransaction;

        } catch (RuntimeException e) {
            log.error("Refund processing failed: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error processing refund", e);
            throw new RuntimeException("Unexpected refund error: " + e.getMessage(), e);
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
