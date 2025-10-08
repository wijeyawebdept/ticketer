package com.ticket.ticket_booking_system.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cache configuration to reduce duplicate database queries
 * Uses in-memory caching to improve performance for frequently accessed data
 */
@Configuration
@EnableCaching
public class CacheConfig {

    /**
     * Configure cache manager with predefined cache names
     * This will reduce duplicate queries for users, events, and venues
     */
    @Bean
    public CacheManager cacheManager() {
        ConcurrentMapCacheManager cacheManager = new ConcurrentMapCacheManager(
            "users",           // Cache user lookups by email/id
            "events",          // Cache event data
            "venues",          // Cache venue data
            "bookings",        // Cache booking statistics
            "userProfiles"     // Cache user profile data
        );
        
        // Set cache eviction policy (optional)
        cacheManager.setAllowNullValues(false);
        
        return cacheManager;
    }
}