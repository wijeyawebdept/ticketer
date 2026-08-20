package com.ticket.ticket_booking_system.controller.organizer;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.request.TicketDealRequest;
import com.ticket.ticket_booking_system.dto.response.TicketCategoryDealResponse;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.TicketCategoryRepository;
import com.ticket.ticket_booking_system.service.TicketDealService;

/**
 * Organizer Deals Controller – scoped to the authenticated organizer's events.
 */
@RestController
@RequestMapping("/api/organizer/deals")
@PreAuthorize("hasAnyRole('ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN') or hasAnyAuthority('ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ORGANIZER_EMPLOYEE', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
public class OrganizerTicketDealController {

    private final TicketDealService dealService;
    private final OrganizerRepository organizerRepository;
    private final OrganizerEmployeeRepository employeeRepository;
    private final EventRepository eventRepository;
    private final TicketCategoryRepository ticketCategoryRepository;

    public OrganizerTicketDealController(TicketDealService dealService,
                                          OrganizerRepository organizerRepository,
                                          OrganizerEmployeeRepository employeeRepository,
                                          EventRepository eventRepository,
                                          TicketCategoryRepository ticketCategoryRepository) {
        this.dealService = dealService;
        this.organizerRepository = organizerRepository;
        this.employeeRepository = employeeRepository;
        this.eventRepository = eventRepository;
        this.ticketCategoryRepository = ticketCategoryRepository;
    }

    /** GET /api/organizer/deals — all deals (active + inactive) for this organizer's events */
    @GetMapping
    public ResponseEntity<?> getMyDeals(Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(dealService.getDealsForOrganizer(organizerId));
    }

    /** GET /api/organizer/deals/event/{eventId} — ticket categories for a specific event */
    @GetMapping("/event/{eventId}")
    public ResponseEntity<?> getCategoriesForEvent(@PathVariable UUID eventId, Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId != null && !isAdminAuth(authentication) && !verifyEventOwnership(eventId, organizerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have permission to view deals for this event");
        }
        return ResponseEntity.ok(dealService.getAllCategoriesForEvent(eventId));
    }

    /** POST /api/organizer/deals/apply — apply or update a deal */
    @PostMapping("/apply")
    public ResponseEntity<?> applyDeal(@RequestBody TicketDealRequest request, Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        // Verify the category's event belongs to the caller organizer
        if (!isAdminAuth(authentication)) {
            boolean owns = ticketCategoryRepository.findById(request.getCategoryId())
                    .map(tc -> tc.getEvent() != null
                            && tc.getEvent().getOrganizer() != null
                            && tc.getEvent().getOrganizer().getOrganizerId().equals(organizerId))
                    .orElse(false);
            if (!owns) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You do not have permission to apply a deal to this ticket category");
            }
        }

        return ResponseEntity.ok(dealService.applyDeal(request));
    }

    /** DELETE /api/organizer/deals/{categoryId} — remove a deal */
    @DeleteMapping("/{categoryId}")
    public ResponseEntity<?> removeDeal(@PathVariable UUID categoryId, Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        // Verify the category's event belongs to the caller organizer
        if (!isAdminAuth(authentication)) {
            boolean owns = ticketCategoryRepository.findById(categoryId)
                    .map(tc -> tc.getEvent() != null
                            && tc.getEvent().getOrganizer() != null
                            && tc.getEvent().getOrganizer().getOrganizerId().equals(organizerId))
                    .orElse(false);
            if (!owns) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You do not have permission to remove a deal from this ticket category");
            }
        }

        return ResponseEntity.ok(dealService.removeDeal(categoryId));
    }

    // ─────────────────── helpers ───────────────────

    private UUID getOrganizerIdFromAuth(Authentication authentication) {
        if (authentication == null) return null;
        if (authentication.getPrincipal() instanceof Organizer) {
            return ((Organizer) authentication.getPrincipal()).getOrganizerId();
        }
        if (authentication.getPrincipal() instanceof OrganizerEmployee) {
            OrganizerEmployee emp = (OrganizerEmployee) authentication.getPrincipal();
            return emp.getOrganizer() != null ? emp.getOrganizer().getOrganizerId() : null;
        }
        String email = authentication.getName();
        if (email != null && !email.isEmpty()) {
            UUID id = organizerRepository.findByEmail(email).map(org -> org.getOrganizerId()).orElse(null);
            if (id != null) return id;
            return employeeRepository.findByEmail(email)
                .map(e -> e.getOrganizer() != null ? e.getOrganizer().getOrganizerId() : null)
                .orElse(null);
        }
        return null;
    }

    private boolean isAdminAuth(Authentication authentication) {
        if (authentication == null) return false;
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")
                        || a.getAuthority().equals("ROLE_SUPER_ADMIN")
                        || a.getAuthority().equals("ADMIN")
                        || a.getAuthority().equals("SUPER_ADMIN"));
    }

    private boolean verifyEventOwnership(UUID eventId, UUID organizerId) {
        return eventRepository.findById(eventId)
                .map(event -> event.getOrganizer() != null &&
                              event.getOrganizer().getOrganizerId().equals(organizerId))
                .orElse(false);
    }
}
