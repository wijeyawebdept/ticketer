package com.ticket.ticket_booking_system.config.ratelimit;

public enum RateLimitTier {
    AUTH("AUTH", 10, 60),          // 10 requests per 60 seconds (Auth endpoints)
    TRANSACTION("TRANSACTION", 25, 60), // 25 requests per 60 seconds (Seat holds / payments / bookings)
    GENERAL("GENERAL", 200, 60),      // 200 requests per 60 seconds (Public API / general browsing)
    BYPASS("BYPASS", Integer.MAX_VALUE, 1); // Static assets, health checks, OPTIONS

    private final String name;
    private final int defaultCapacity;
    private final int defaultDurationSeconds;

    RateLimitTier(String name, int defaultCapacity, int defaultDurationSeconds) {
        this.name = name;
        this.defaultCapacity = defaultCapacity;
        this.defaultDurationSeconds = defaultDurationSeconds;
    }

    public String getName() {
        return name;
    }

    public int getDefaultCapacity() {
        return defaultCapacity;
    }

    public int getDefaultDurationSeconds() {
        return defaultDurationSeconds;
    }
}
