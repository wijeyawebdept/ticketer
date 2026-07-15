package com.ticket.ticket_booking_system.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DatabaseFixConfig {
    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void fixCheckConstraints() {
        try {
            jdbcTemplate.execute("ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;");
            log.info("Successfully dropped old events_status_check constraint");
        } catch (Exception e) {
            log.error("Failed to update check constraints", e);
        }
    }
}
