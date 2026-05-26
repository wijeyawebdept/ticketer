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
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Organizer;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@Service
@Transactional
public class TicketDealService {

    private final TicketCategoryRepository ticketCategoryRepository;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final OrganizerRepository organizerRepository;
    private final EmailService emailService;
    private final AdminAuditService auditService;

    public TicketDealService(TicketCategoryRepository ticketCategoryRepository, 
                           UserRepository userRepository,
                           AdminRepository adminRepository,
                           OrganizerRepository organizerRepository,
                           EmailService emailService,
                           AdminAuditService auditService) {
        this.ticketCategoryRepository = ticketCategoryRepository;
        this.userRepository = userRepository;
        this.adminRepository = adminRepository;
        this.organizerRepository = organizerRepository;
        this.emailService = emailService;
        this.auditService = auditService;
    }

    /** Apply or update a deal on a ticket category */
    public TicketCategoryDealResponse applyDeal(TicketDealRequest request) {
        TicketCategory tc = ticketCategoryRepository.findById(request.getCategoryId())
            .orElseThrow(() -> new RuntimeException("Ticket category not found: " + request.getCategoryId()));

        boolean wasActive = tc.getDealActive() != null && tc.getDealActive();
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

        // Send email notifications to all active customers when a new deal is activated
        if (saved.getDealActive() && !wasActive) {
            notifyCustomersAboutDeal(saved);
        }

        auditService.logAction(getCurrentUserId(), "APPLY_TICKET_DEAL", "DEAL", saved.getCategoryId(), "Applied deal " + saved.getDealLabel() + " (type: " + saved.getDealType() + ") to category: " + saved.getCategoryName());

        return TicketCategoryDealResponse.fromEntity(saved);
    }

    private void notifyCustomersAboutDeal(TicketCategory tc) {
        String eventName = tc.getEvent() != null ? tc.getEvent().getName() : "Upcoming Event";
        List<User> customers = userRepository.findByRoleAndActive(User.Role.USER, 1);
        
        for (User customer : customers) {
            emailService.sendDealNotificationEmail(
                customer.getEmail(),
                customer.getFirstName(),
                eventName,
                tc
            );
        }
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
        auditService.logAction(getCurrentUserId(), "REMOVE_TICKET_DEAL", "DEAL", saved.getCategoryId(), "Removed deal from category: " + saved.getCategoryName());
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

    private UUID getCurrentUserId() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()) {
                String email = authentication.getName();
                
                User user = userRepository.findByEmail(email).orElse(null);
                if (user != null) return user.getUserId();
                
                Admin admin = adminRepository.findByEmail(email).orElse(null);
                if (admin != null) return admin.getAdminId();
                
                Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
                if (organizer != null) return organizer.getOrganizerId();
            }
        } catch (Exception e) {
            // Ignore
        }
        return null;
    }
}
