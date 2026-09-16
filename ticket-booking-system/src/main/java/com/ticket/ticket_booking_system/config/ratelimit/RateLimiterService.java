package com.ticket.ticket_booking_system.config.ratelimit;

import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.servlet.http.HttpServletRequest;

@Service
public class RateLimiterService {

    private static final Logger logger = LoggerFactory.getLogger(RateLimiterService.class);

    @Value("${security.ratelimit.enabled:true}")
    private boolean enabled;

    @Value("${security.ratelimit.auth.capacity:10}")
    private long authCapacity;

    @Value("${security.ratelimit.auth.refill-duration-seconds:60}")
    private long authDurationSeconds;

    @Value("${security.ratelimit.transaction.capacity:25}")
    private long transactionCapacity;

    @Value("${security.ratelimit.transaction.refill-duration-seconds:60}")
    private long transactionDurationSeconds;

    @Value("${security.ratelimit.general.capacity:200}")
    private long generalCapacity;

    @Value("${security.ratelimit.general.refill-duration-seconds:60}")
    private long generalDurationSeconds;

    private final ConcurrentHashMap<String, TokenBucket> buckets = new ConcurrentHashMap<>();

    public boolean isEnabled() {
        return enabled;
    }

    public RateLimitTier resolveTier(HttpServletRequest request) {
        String method = request.getMethod();
        if ("OPTIONS".equalsIgnoreCase(method)) {
            return RateLimitTier.BYPASS;
        }

        String uri = request.getRequestURI();
        if (uri == null) {
            return RateLimitTier.BYPASS;
        }

        String lowerUri = uri.toLowerCase();

        // Bypass static assets, documentation, health checks, web sockets
        if (lowerUri.startsWith("/actuator/health") ||
            lowerUri.startsWith("/swagger") ||
            lowerUri.startsWith("/v3/api-docs") ||
            lowerUri.startsWith("/ws") ||
            lowerUri.startsWith("/favicon.ico") ||
            lowerUri.startsWith("/images/") ||
            lowerUri.startsWith("/static/")) {
            return RateLimitTier.BYPASS;
        }

        // Strict Auth tier: login, register, password resets, gate logins
        if (lowerUri.startsWith("/api/auth/") ||
            lowerUri.startsWith("/api/v1/auth/") ||
            lowerUri.contains("/gate-staff/login") ||
            lowerUri.contains("/forgot-password") ||
            lowerUri.contains("/reset-password")) {
            return RateLimitTier.AUTH;
        }

        // High-risk transaction tier: seat holding, payments, booking creation
        if (lowerUri.contains("/seats/hold") ||
            lowerUri.contains("/venue-seats/hold") ||
            lowerUri.startsWith("/api/payments") ||
            lowerUri.startsWith("/api/v1/payments") ||
            lowerUri.startsWith("/api/bookings") ||
            lowerUri.startsWith("/api/v1/bookings")) {
            return RateLimitTier.TRANSACTION;
        }

        // General public API
        if (lowerUri.startsWith("/api/")) {
            return RateLimitTier.GENERAL;
        }

        return RateLimitTier.BYPASS;
    }

    public String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            String[] ips = xff.split(",");
            if (ips.length > 0) {
                String firstIp = ips[0].trim();
                if (!firstIp.isEmpty()) {
                    return firstIp;
                }
            }
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            return xRealIp.trim();
        }

        String cfConnectingIp = request.getHeader("CF-Connecting-IP");
        if (cfConnectingIp != null && !cfConnectingIp.isBlank()) {
            return cfConnectingIp.trim();
        }

        String remoteAddr = request.getRemoteAddr();
        return (remoteAddr != null && !remoteAddr.isBlank()) ? remoteAddr : "unknown";
    }

    public TokenBucket.ConsumptionResult checkRateLimit(HttpServletRequest request) {
        if (!enabled) {
            return new TokenBucket.ConsumptionResult(true, 1000, 1000, 0);
        }

        RateLimitTier tier = resolveTier(request);
        if (tier == RateLimitTier.BYPASS) {
            return new TokenBucket.ConsumptionResult(true, 1000, 1000, 0);
        }

        String clientIp = resolveClientIp(request);
        String bucketKey = tier.getName() + ":" + clientIp;

        long capacity;
        long duration;

        switch (tier) {
            case AUTH:
                capacity = authCapacity;
                duration = authDurationSeconds;
                break;
            case TRANSACTION:
                capacity = transactionCapacity;
                duration = transactionDurationSeconds;
                break;
            case GENERAL:
            default:
                capacity = generalCapacity;
                duration = generalDurationSeconds;
                break;
        }

        TokenBucket bucket = buckets.computeIfAbsent(bucketKey, k -> new TokenBucket(capacity, capacity, duration));
        return bucket.tryConsume(1);
    }

    @Scheduled(fixedRate = 600000) // Clean up every 10 minutes
    public void cleanupInactiveBuckets() {
        long now = System.currentTimeMillis();
        long threshold = 10 * 60 * 1000L; // 10 minutes idle

        int initialSize = buckets.size();
        buckets.entrySet().removeIf(entry -> (now - entry.getValue().getLastAccessedTimeMillis()) > threshold);
        int removed = initialSize - buckets.size();

        if (removed > 0) {
            logger.info("Cleaned up {} inactive rate limit IP buckets. Active buckets remaining: {}", removed, buckets.size());
        }
    }
}
