package com.ticket.ticket_booking_system.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.response.TicketCategoryDealResponse;
import com.ticket.ticket_booking_system.service.TicketDealService;

/**
 * Public Deals Controller – no authentication required.
 * Returns events that have active deals for the public Deals page.
 */
@RestController
@RequestMapping("/api/public/deals")
public class PublicDealsController {

    private final TicketDealService dealService;

    public PublicDealsController(TicketDealService dealService) {
        this.dealService = dealService;
    }

    /** GET /api/public/deals — all active deals (public, no auth) */
    @GetMapping
    public ResponseEntity<List<TicketCategoryDealResponse>> getAllPublicDeals() {
        return ResponseEntity.ok(dealService.getAllActiveDeals());
    }

    /** GET /api/public/deals/event/{eventId} — deals for a specific event */
    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<TicketCategoryDealResponse>> getDealsForEvent(@PathVariable UUID eventId) {
        return ResponseEntity.ok(dealService.getActiveDealsForEvent(eventId));
    }

    /** GET /api/public/deals/categories/{eventId} — all categories with deal info for an event */
    @GetMapping("/categories/{eventId}")
    public ResponseEntity<List<TicketCategoryDealResponse>> getAllCategoriesForEvent(@PathVariable UUID eventId) {
        return ResponseEntity.ok(dealService.getAllCategoriesForEvent(eventId));
    }
}
