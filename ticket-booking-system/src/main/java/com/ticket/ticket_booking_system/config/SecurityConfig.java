package com.ticket.ticket_booking_system.config;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private static final Logger logger = LoggerFactory.getLogger(SecurityConfig.class);

    @Value("${CORS_ALLOWED_ORIGINS:http://localhost:3000}")
    private String allowedOrigins;

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter, UserDetailsService userDetailsService) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/auth/**",
                                "/auth/**",
                                "/h2-console/**",
                                "/swagger-ui/**",
                                "/v3/api-docs/**",
                                "/uploads/**",
                                "/uploads/profile-pictures/**",
                                "/api/public/**",
                                "/api/venues/**",
                                "/api/venue-seats/layout/**",
                                "/api/venue-seats/availability/**",
                                "/api/payments/webhook",
                                "/api/pages/**",
                                "/api/contact",
                                "/contact",
                                "/ws/**",
                                "/error")
                        .permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/public/blog/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/admin/banners", "/api/admin/banners/*").permitAll()
                        .requestMatchers("/api/admin/event-categories/active", "/api/admin/event-categories/{id}")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_ORGANIZER", "ROLE_ORGANIZER_EMPLOYEE",
                                "ADMIN", "SUPER_ADMIN", "ORGANIZER", "ORGANIZER_EMPLOYEE")
                        .requestMatchers("/api/admin/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_SUPER_ADMIN", "ADMIN", "SUPER_ADMIN")
                        .anyRequest().authenticated())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationProvider(authenticationProvider(userDetailsService, passwordEncoder()))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        http.headers(headers -> headers
                // Clickjacking protection. H2 console (the only historical reason this was
                // ever disabled) is already off via spring.h2.console.enabled=false, so there's
                // no reason to weaken this app-wide.
                .frameOptions(frameOptions -> frameOptions.deny())
                // X-Content-Type-Options: nosniff is on by default and kept implicit here.
                // Strict-Transport-Security is on by default for HTTPS requests; made explicit
                // below with the standard 1-year max-age + subdomains + preload.
                .httpStrictTransportSecurity(hsts -> hsts
                        .includeSubDomains(true)
                        .preload(true)
                        .maxAgeInSeconds(31536000))
                .contentSecurityPolicy(csp -> csp.policyDirectives(
                        "default-src 'self'; " +
                        "script-src 'self' 'unsafe-inline'; " +
                        "style-src 'self' 'unsafe-inline'; " +
                        "img-src 'self' data: https://res.cloudinary.com; " +
                        "connect-src 'self'; " +
                        "frame-ancestors 'none'; " +
                        "object-src 'none'; " +
                        "base-uri 'self'")));

        return http.build();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider(UserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder);
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(s -> s.trim())
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());

        boolean anyLocalhost = origins.stream()
                .anyMatch(o -> o.contains("localhost") || o.contains("127.0.0.1"));
        if (anyLocalhost) {
            logger.warn("CORS_ALLOWED_ORIGINS includes a localhost/127.0.0.1 entry ({}). " +
                    "This must NOT be present in a production deployment.", origins);
        }
        logger.info("Configuring CORS with allowed origins: {}", origins);

        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept"));
        configuration.setExposedHeaders(Arrays.asList("Authorization"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}