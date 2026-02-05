package com.ticket.ticket_booking_system.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import lombok.Data;

@Configuration
@ConfigurationProperties(prefix = "mpgs")
@Data
public class MPGSConfig {

    private Merchant merchant = new Merchant();
    private Api api = new Api();
    private String baseUrl;
    private String webhookSecret;
    private String currency;
    private String successUrl;
    private String cancelUrl;
    private String errorUrl;

    @Data
    public static class Merchant {
        private String id;
    }

    @Data
    public static class Api {
        private String url;
        private String version;
        private String password;
    }

    /**
     * Get the MPGS Checkout script URL for frontend
     * @param sessionId The session ID for checkout
     * @return Full checkout.js script URL
     */
    public String getCheckoutScriptUrl(String sessionId) {
        return baseUrl + "/checkout/version/" + api.version + "/checkout.js";
    }

    /**
     * Get the API endpoint URL for a specific path
     * @param path The API path (e.g., "/session","/order/123")
     * @return Full API endpoint URL
     */
    public String getApiEndpoint(String path) {
        return api.url + "/version/" + api.version + "/merchant/" + merchant.id + path;
    }

    /**
     * Get Basic Authentication header for MPGS API calls
     * Format: Basic base64(merchant.{merchantId}:{apiPassword})
     * @return Basic auth header value
     */
    public String getBasicAuthHeader() {
        String credentials = "merchant." + merchant.id + ":" + api.password;
        return "Basic " + java.util.Base64.getEncoder()
                .encodeToString(credentials.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
}
