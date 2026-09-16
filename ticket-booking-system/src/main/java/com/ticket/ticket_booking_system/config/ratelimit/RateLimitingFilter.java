package com.ticket.ticket_booking_system.config.ratelimit;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitingFilter.class);

    private final RateLimiterService rateLimiterService;

    public RateLimitingFilter(RateLimiterService rateLimiterService) {
        this.rateLimiterService = rateLimiterService;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        RateLimitTier tier = rateLimiterService.resolveTier(request);
        if (tier == RateLimitTier.BYPASS || !rateLimiterService.isEnabled()) {
            filterChain.doFilter(request, response);
            return;
        }

        TokenBucket.ConsumptionResult result = rateLimiterService.checkRateLimit(request);

        response.setHeader("X-RateLimit-Limit", String.valueOf(result.getLimit()));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(result.getRemainingTokens()));

        if (!result.isAllowed()) {
            String clientIp = rateLimiterService.resolveClientIp(request);
            logger.warn("Rate limit exceeded for IP [{}] on URI [{}] (Tier: {}). Retry after {}s",
                    clientIp, request.getRequestURI(), tier.getName(), result.getRetryAfterSeconds());

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(result.getRetryAfterSeconds()));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");

            String jsonPayload = String.format(
                    "{\"success\":false,\"status\":429,\"error\":\"TOO_MANY_REQUESTS\",\"message\":\"Too many requests. Please slow down and try again in %d seconds.\",\"retryAfterSeconds\":%d}",
                    result.getRetryAfterSeconds(),
                    result.getRetryAfterSeconds()
            );

            response.getWriter().write(jsonPayload);
            response.getWriter().flush();
            return;
        }

        filterChain.doFilter(request, response);
    }
}
