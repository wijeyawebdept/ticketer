package com.ticket.ticket_booking_system.config.ratelimit;

/**
 * Thread-safe Token Bucket implementation for rate limiting.
 * Smoothly refills tokens based on elapsed nanoseconds.
 */
public class TokenBucket {

    private final long capacity;
    private final double refillTokensPerNano;
    private final long durationSeconds;
    
    private double availableTokens;
    private long lastRefillTimeNanos;
    private volatile long lastAccessedTimeMillis;

    public TokenBucket(long capacity, long refillTokens, long durationSeconds) {
        this.capacity = capacity;
        this.availableTokens = capacity;
        this.durationSeconds = Math.max(1, durationSeconds);
        long durationNanos = this.durationSeconds * 1_000_000_000L;
        this.refillTokensPerNano = (double) refillTokens / (double) durationNanos;
        this.lastRefillTimeNanos = System.nanoTime();
        this.lastAccessedTimeMillis = System.currentTimeMillis();
    }

    public synchronized ConsumptionResult tryConsume(long tokensRequested) {
        this.lastAccessedTimeMillis = System.currentTimeMillis();
        long nowNanos = System.nanoTime();
        long elapsedNanos = Math.max(0, nowNanos - lastRefillTimeNanos);

        if (elapsedNanos > 0) {
            double tokensToAdd = elapsedNanos * refillTokensPerNano;
            this.availableTokens = Math.min(capacity, this.availableTokens + tokensToAdd);
            this.lastRefillTimeNanos = nowNanos;
        }

        if (this.availableTokens >= tokensRequested) {
            this.availableTokens -= tokensRequested;
            long remaining = (long) Math.floor(this.availableTokens);
            return new ConsumptionResult(true, remaining, capacity, 0);
        } else {
            double deficit = tokensRequested - this.availableTokens;
            long nanosUntilAvailable = (long) Math.ceil(deficit / refillTokensPerNano);
            long retryAfterSeconds = Math.max(1, (nanosUntilAvailable + 999_999_999L) / 1_000_000_000L);
            long remaining = (long) Math.floor(this.availableTokens);
            return new ConsumptionResult(false, remaining, capacity, retryAfterSeconds);
        }
    }

    public long getLastAccessedTimeMillis() {
        return lastAccessedTimeMillis;
    }

    public long getCapacity() {
        return capacity;
    }

    public static class ConsumptionResult {
        private final boolean isAllowed;
        private final long remainingTokens;
        private final long limit;
        private final long retryAfterSeconds;

        public ConsumptionResult(boolean isAllowed, long remainingTokens, long limit, long retryAfterSeconds) {
            this.isAllowed = isAllowed;
            this.remainingTokens = remainingTokens;
            this.limit = limit;
            this.retryAfterSeconds = retryAfterSeconds;
        }

        public boolean isAllowed() {
            return isAllowed;
        }

        public long getRemainingTokens() {
            return remainingTokens;
        }

        public long getLimit() {
            return limit;
        }

        public long getRetryAfterSeconds() {
            return retryAfterSeconds;
        }
    }
}
