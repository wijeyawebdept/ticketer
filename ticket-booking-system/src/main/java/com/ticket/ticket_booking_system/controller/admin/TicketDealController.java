package com.ticket.ticket_booking_system.controller.admin;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.request.TicketDealRequest;
import com.ticket.ticket_booking_system.dto.response.TicketCategoryDealResponse;
import com.ticket.ticket_booking_system.service.TicketDealService;

/**
 * Admin Deals Controller – manages ticket category deals across all events.
 */
@RestController
@RequestMapping("/api/admin/deals")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
public class TicketDealController {

    private final TicketDealService dealService;

    public TicketDealController(TicketDealService dealService) {
        this.dealService = dealService;
    }

    /** GET /api/admin/deals — all deals (active + inactive) across all events */
    @GetMapping
    public ResponseEntity<List<TicketCategoryDealResponse>> getAllDeals() {
        return ResponseEntity.ok(dealService.getAllDeals());
    }

    /** GET /api/admin/deals/event/{eventId} — all ticket categories for an event (with deal info) */
    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<TicketCategoryDealResponse>> getCategoriesForEvent(@PathVariable UUID eventId) {
        return ResponseEntity.ok(dealService.getAllCategoriesForEvent(eventId));
    }

    /** POST /api/admin/deals/apply — apply or update a deal on a ticket category */
    @PostMapping("/apply")
    public ResponseEntity<TicketCategoryDealResponse> applyDeal(@RequestBody TicketDealRequest request) {
        return ResponseEntity.ok(dealService.applyDeal(request));
    }

    /** DELETE /api/admin/deals/{categoryId} — remove a deal from a ticket category */
    @DeleteMapping("/{categoryId}")
    public ResponseEntity<TicketCategoryDealResponse> removeDeal(@PathVariable UUID categoryId) {
        return ResponseEntity.ok(dealService.removeDeal(categoryId));
    }
}
