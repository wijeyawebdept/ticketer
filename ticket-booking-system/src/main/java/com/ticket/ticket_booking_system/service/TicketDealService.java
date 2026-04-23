package com.ticket.ticket_booking_system.service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.dto.request.TicketDealRequest;
import com.ticket.ticket_booking_system.dto.response.TicketCategoryDealResponse;
import com.ticket.ticket_booking_system.entity.TicketCategory;
import com.ticket.ticket_booking_system.repository.TicketCategoryRepository;

@Service
@Transactional
public class TicketDealService {

    private final TicketCategoryRepository ticketCategoryRepository;

    public TicketDealService(TicketCategoryRepository ticketCategoryRepository) {
        this.ticketCategoryRepository = ticketCategoryRepository;
    }

    /** Apply or update a deal on a ticket category */
    public TicketCategoryDealResponse applyDeal(TicketDealRequest request) {
        TicketCategory tc = ticketCategoryRepository.findById(request.getCategoryId())
            .orElseThrow(() -> new RuntimeException("Ticket category not found: " + request.getCategoryId()));

        tc.setDealActive(request.isDealActive());

        if (request.isDealActive()) {
            String type = request.getDealType() != null ? request.getDealType() : "PERCENTAGE_DISCOUNT";
            tc.setDealType(type);
            tc.setDealLabel(request.getDealLabel());

            if ("BUY_X_GET_Y_FREE".equals(type)) {
                if (request.getDealBuyQuantity() == null || request.getDealFreeQuantity() == null
                        || request.getDealBuyQuantity() <= 0 || request.getDealFreeQuantity() <= 0) {
                    throw new IllegalArgumentException("buyQuantity and freeQuantity must be positive for BUY_X_GET_Y_FREE deals");
                }
                tc.setDealBuyQuantity(request.getDealBuyQuantity());
                tc.setDealFreeQuantity(request.getDealFreeQuantity());
                // clear percentage fields
                tc.setDealDiscountPercentage(null);
            } else {
                // PERCENTAGE_DISCOUNT
                if (request.getDealDiscountPercentage() == null) {
                    throw new IllegalArgumentException("dealDiscountPercentage is required for PERCENTAGE_DISCOUNT deals");
                }
                tc.setDealDiscountPercentage(request.getDealDiscountPercentage());
                // clear buy/get fields
                tc.setDealBuyQuantity(null);
                tc.setDealFreeQuantity(null);
            }
        } else {
            // Deactivating — keep the deal data intact so it remains visible in the management table
            // Also backfill dealType for legacy rows that were created before the column existed
            if (tc.getDealType() == null) {
                if (tc.getDealBuyQuantity() != null) {
                    tc.setDealType("BUY_X_GET_Y_FREE");
                } else {
                    tc.setDealType("PERCENTAGE_DISCOUNT");
                }
            }
            tc.setDealActive(false);
        }

        TicketCategory saved = ticketCategoryRepository.save(tc);
        return TicketCategoryDealResponse.fromEntity(saved);
    }

    /** Remove deal from a ticket category (permanently clears all deal data) */
    public TicketCategoryDealResponse removeDeal(UUID categoryId) {
        TicketCategory tc = ticketCategoryRepository.findById(categoryId)
            .orElseThrow(() -> new RuntimeException("Ticket category not found: " + categoryId));

        tc.setDealActive(false);
        tc.setDealType(null);
        tc.setDealDiscountPercentage(null);
        tc.setDealBuyQuantity(null);
        tc.setDealFreeQuantity(null);
        tc.setDealLabel(null);

        TicketCategory saved = ticketCategoryRepository.save(tc);
        return TicketCategoryDealResponse.fromEntity(saved);
    }

    /** All deals (active + inactive) — for management tables (admin) */
    @Transactional(readOnly = true)
    public List<TicketCategoryDealResponse> getAllDeals() {
        return ticketCategoryRepository.findAllDeals()
            .stream()
            .map(TicketCategoryDealResponse::fromEntity)
            .collect(Collectors.toList());
    }

    /** All deals (active + inactive) for a specific organizer */
    @Transactional(readOnly = true)
    public List<TicketCategoryDealResponse> getDealsForOrganizer(UUID organizerId) {
        return ticketCategoryRepository.findAllDealsForOrganizer(organizerId)
            .stream()
            .map(TicketCategoryDealResponse::fromEntity)
            .collect(Collectors.toList());
    }

    /** All active deals (admin) */
    @Transactional(readOnly = true)
    public List<TicketCategoryDealResponse> getAllActiveDeals() {
        return ticketCategoryRepository.findAllWithActiveDeals()
            .stream()
            .map(TicketCategoryDealResponse::fromEntity)
            .collect(Collectors.toList());
    }

    /** Active deals for a specific organizer */
    @Transactional(readOnly = true)
    public List<TicketCategoryDealResponse> getActiveDealsByOrganizer(UUID organizerId) {
        return ticketCategoryRepository.findActiveDealsForOrganizer(organizerId)
            .stream()
            .map(TicketCategoryDealResponse::fromEntity)
            .collect(Collectors.toList());
    }

    /** Active deals for a specific event */
    @Transactional(readOnly = true)
    public List<TicketCategoryDealResponse> getActiveDealsForEvent(UUID eventId) {
        return ticketCategoryRepository.findActiveDealsForEvent(eventId)
            .stream()
            .map(TicketCategoryDealResponse::fromEntity)
            .collect(Collectors.toList());
    }

    /** All ticket categories for an event (with deal info) */
    @Transactional(readOnly = true)
    public List<TicketCategoryDealResponse> getAllCategoriesForEvent(UUID eventId) {
        return ticketCategoryRepository.findByEventId(eventId)
            .stream()
            .map(TicketCategoryDealResponse::fromEntity)
            .collect(Collectors.toList());
    }

    /** Whether any ticket category for this event has an active deal */
    @Transactional(readOnly = true)
    public boolean eventHasDeal(UUID eventId) {
        return ticketCategoryRepository.existsActiveDealForEvent(eventId);
    }
}
