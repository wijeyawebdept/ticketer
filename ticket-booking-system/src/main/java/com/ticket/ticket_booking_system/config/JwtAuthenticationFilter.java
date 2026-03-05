package com.ticket.ticket_booking_system.config;

import java.io.IOException;

import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final OrganizerRepository organizerRepository;
    private final OrganizerEmployeeRepository organizerEmployeeRepository;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            UserDetailsService userDetailsService,
            UserRepository userRepository,
            AdminRepository adminRepository,
            OrganizerRepository organizerRepository,
            OrganizerEmployeeRepository organizerEmployeeRepository) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.userRepository = userRepository;
        this.adminRepository = adminRepository;
        this.organizerRepository = organizerRepository;
        this.organizerEmployeeRepository = organizerEmployeeRepository;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String userEmail;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        userEmail = jwtService.extractUsername(jwt);

        if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            // Extract the role that was embedded at login time so we load from the correct
            // table. Without this, an admin/organizer who also has a customer account would
            // have their UserDetails loaded from the users table (ROLE_USER) on every
            // subsequent request, breaking their elevated-role access.
            String roleFromToken = null;
            try {
                roleFromToken = jwtService.extractRole(jwt);
            } catch (Exception e) {
                // ignore — fall through to the default multi-table lookup
            }

            UserDetails userDetails = loadUserDetailsByRole(userEmail, roleFromToken);

            if (jwtService.isTokenValid(jwt, userDetails)) {
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Load UserDetails from the correct table based on the role embedded in the JWT.
     * Each role is stored in exactly one dedicated table:
     *   ROLE_USER              → users
     *   ROLE_ADMIN / SUPER_ADMIN → admins
     *   ROLE_ORGANIZER         → organizers
     *   ROLE_ORGANIZER_EMPLOYEE → organizer_employees
     *
     * The same email address may legitimately appear in multiple tables (e.g. an
     * organizer who also has a customer account), so we must use the role claim to
     * select the right one rather than always checking tables in a fixed order.
     */
    private UserDetails loadUserDetailsByRole(String email, String role) {
        if (role != null) {
            switch (role) {
                case "ROLE_ADMIN":
                case "ROLE_SUPER_ADMIN":
                    return adminRepository.findByEmail(email)
                            .<UserDetails>map(a -> a)
                            .orElseGet(() -> userDetailsService.loadUserByUsername(email));

                case "ROLE_ORGANIZER":
                    return organizerRepository.findByEmail(email)
                            .<UserDetails>map(o -> o)
                            .orElseGet(() -> userDetailsService.loadUserByUsername(email));

                case "ROLE_ORGANIZER_EMPLOYEE":
                    return organizerEmployeeRepository.findByEmail(email)
                            .<UserDetails>map(e -> e)
                            .orElseGet(() -> userDetailsService.loadUserByUsername(email));

                case "ROLE_USER":
                    return userRepository.findByEmail(email)
                            .<UserDetails>map(u -> u)
                            .orElseGet(() -> userDetailsService.loadUserByUsername(email));

                default:
                    break;
            }
        }
        // Fallback: no role claim or unrecognised role — use the standard multi-table lookup
        return userDetailsService.loadUserByUsername(email);
    }
}