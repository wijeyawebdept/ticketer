package com.ticket.ticket_booking_system.service;

import java.util.Collection;
import java.util.Collections;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.repository.EventEmployeeAssignmentRepository;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SecurityEventScopeService {

    private final OrganizerRepository organizerRepository;
    private final OrganizerEmployeeRepository organizerEmployeeRepository;
    private final EventRepository eventRepository;
    private final EventEmployeeAssignmentRepository eventEmployeeAssignmentRepository;

    /**
     * Resolves the associated event IDs for the authenticated user.
     * 
     * - Admin / Super Admin: returns null (indicating unrestricted access to all events).
     * - Organizer: returns all event IDs owned by this organizer.
     * - Organizer Employee: returns event IDs assigned to this employee; if no explicit
     *   event assignments are configured, falls back to all events belonging to their organizer.
     * - Others / Unauthenticated: returns an empty set.
     */
    public Set<UUID> getAssociatedEventIds(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null) {
            return Collections.emptySet();
        }

        boolean isAdmin = authentication.getAuthorities().stream().anyMatch(a -> {
            String auth = a.getAuthority();
            return auth.equals("ROLE_ADMIN") || auth.equals("ROLE_SUPER_ADMIN")
                    || auth.equals("ADMIN") || auth.equals("SUPER_ADMIN");
        });

        if (isAdmin) {
            return null; // Null means unrestricted access to all events
        }

        boolean isEmployee = authentication.getAuthorities().stream().anyMatch(a -> {
            String auth = a.getAuthority();
            return auth.contains("ORGANIZER_EMPLOYEE");
        });

        if (isEmployee) {
            OrganizerEmployee employee = null;
            if (authentication.getPrincipal() instanceof OrganizerEmployee emp) {
                employee = emp;
            }
            if (employee == null && authentication.getName() != null) {
                employee = organizerEmployeeRepository.findByEmail(authentication.getName()).orElse(null);
            }

            if (employee == null) {
                log.warn("Could not resolve employee for authentication: {}", authentication.getName());
                return Collections.emptySet();
            }

            UUID employeeId = employee.getEmployeeId();
            Set<UUID> employeeEventIds = new java.util.HashSet<>();

            // Just like the organizer, his employees see their owned events:
            UUID organizerId = null;
            try {
                if (employee.getOrganizer() != null) {
                    organizerId = employee.getOrganizer().getOrganizerId();
                }
            } catch (Exception ignored) {
            }
            if (organizerId == null) {
                organizerId = organizerEmployeeRepository.findById(employeeId)
                        .map(e -> e.getOrganizer() != null ? e.getOrganizer().getOrganizerId() : null)
                        .orElse(null);
            }

            if (organizerId != null) {
                List<Event> orgEvents = eventRepository.findByOrganizer_OrganizerId(organizerId);
                if (orgEvents != null) {
                    for (Event ev : orgEvents) {
                        if (ev != null && ev.getEventId() != null) {
                            employeeEventIds.add(ev.getEventId());
                        }
                    }
                }
            }

            // Also include any explicit event assignments for this employee
            try {
                var assignments = eventEmployeeAssignmentRepository.findActiveByEmployeeId(employeeId);
                if (assignments != null) {
                    for (var a : assignments) {
                        if (a.getEvent() != null && a.getEvent().getEventId() != null) {
                            employeeEventIds.add(a.getEvent().getEventId());
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Error fetching event employee assignments for {}: {}", employeeId, e.getMessage());
            }

            log.info("Resolved {} associated event(s) for organizer employee {} (organizer: {})",
                    employeeEventIds.size(), employeeId, organizerId);
            return employeeEventIds;
        }

        boolean isOrganizer = authentication.getAuthorities().stream().anyMatch(a -> {
            String auth = a.getAuthority();
            return auth.contains("ORGANIZER");
        });

        if (isOrganizer) {
            UUID organizerId = null;
            if (authentication.getPrincipal() instanceof Organizer org) {
                organizerId = org.getOrganizerId();
            } else if (authentication.getName() != null) {
                organizerId = organizerRepository.findByEmail(authentication.getName())
                        .map(Organizer::getOrganizerId)
                        .orElse(null);
            }

            if (organizerId == null) {
                log.warn("Could not resolve organizer ID for authentication: {}", authentication.getName());
                return Collections.emptySet();
            }

            Set<UUID> organizerEventIds = eventRepository.findByOrganizer_OrganizerId(organizerId)
                    .stream()
                    .map(Event::getEventId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

            log.debug("Resolved {} associated event(s) for organizer {}", organizerEventIds.size(), organizerId);
            return organizerEventIds;
        }

        return Collections.emptySet();
    }
}
