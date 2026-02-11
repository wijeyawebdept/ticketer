package com.ticket.ticket_booking_system.config;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import lombok.Getter;

@Configuration
@Getter
public class MPGSConfig {

    @Value("${mpgs.merchant.id}")
    private String merchantId;

    @Value("${mpgs.api.url}")
    private String apiUrl; // e.g. https://cbcmpgs.gateway.mastercard.com/api/rest

    @Value("${mpgs.api.version}")
    private String apiVersion; // e.g. 100

    @Value("${mpgs.api.password}")
    private String apiPassword;

    @Value("${mpgs.webhook-secret}")
    private String webhookSecret;

    @Value("${mpgs.currency:LKR}")
    private String currency;

    @Value("${mpgs.success-url}")
    private String successUrl;

    @Value("${mpgs.cancel-url}")
    private String cancelUrl;

    @Value("${mpgs.error-url}")
    private String errorUrl;

    /**
     * Build full API endpoint:
     * {apiUrl}/version/{v}/merchant/{merchantId}{path}
     */
    public String getApiEndpoint(String path) {
        String cleanPath = path.startsWith("/") ? path : "/" + path;
        return apiUrl + "/version/" + apiVersion + "/merchant/" + merchantId + cleanPath;
    }

    /**
     * MPGS uses HTTP Basic Auth:
     * username = "merchant.{merchantId}"
     * password = apiPassword
     */
    public String getBasicAuthHeader() {
        String username = "merchant." + merchantId;
        String raw = username + ":" + apiPassword;
        String encoded = Base64.getEncoder().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
        return "Basic " + encoded;
    }

    /**
     * Checkout.js URL for MPGS v63+:
     * https://{host}/static/checkout/checkout.min.js
     * 
     * The old format /checkout/version/{v}/checkout.js is deprecated for v63+
     */
    public String getCheckoutScriptUrl() {
        String base = apiUrl.replace("/api/rest", "");
        return base + "/static/checkout/checkout.min.js";
    }
}
