package com.ticket.ticket_booking_system.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode;
import org.springframework.http.converter.FormHttpMessageConverter;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Web configuration for Spring Data Web support
 * Configures proper page serialization to fix PageImpl serialization warnings
 * Also provides RestTemplate and WebClient beans for HTTP client operations
 */
@Configuration
@EnableSpringDataWebSupport(pageSerializationMode = PageSerializationMode.VIA_DTO)
public class WebConfig {
    // This configuration enables proper page serialization
    // which prevents the "Serializing PageImpl instances as-is is not supported" warning
    // By using VIA_DTO mode, Spring will serialize pages as DTOs instead of the raw PageImpl

    /**
     * Provides RestTemplate bean for synchronous HTTP client operations
     * Used by MPGSPaymentService for MPGS API calls
     * Explicitly adds FormHttpMessageConverter for form-encoded requests
     */
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        RestTemplate restTemplate = builder.build();
        // Ensure FormHttpMessageConverter is available for application/x-www-form-urlencoded
        restTemplate.getMessageConverters().add(new FormHttpMessageConverter());
        return restTemplate;
    }

    /**
     * Provides WebClient.Builder bean for reactive HTTP client operations
     * Used by MPGSPaymentService for asynchronous MPGS API calls
     */
    @Bean
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }
}