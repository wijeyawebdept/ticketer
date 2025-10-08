package com.ticket.ticket_booking_system.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode;

/**
 * Web configuration for Spring Data Web support
 * Configures proper page serialization to fix PageImpl serialization warnings
 */
@Configuration
@EnableSpringDataWebSupport(pageSerializationMode = PageSerializationMode.VIA_DTO)
public class WebConfig {
    // This configuration enables proper page serialization
    // which prevents the "Serializing PageImpl instances as-is is not supported" warning
    // By using VIA_DTO mode, Spring will serialize pages as DTOs instead of the raw PageImpl
}