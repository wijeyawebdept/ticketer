package com.ticket.ticket_booking_system.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.dto.request.PromoCodeRequest;
import com.ticket.ticket_booking_system.dto.request.ValidatePromoCodeRequest;
import com.ticket.ticket_booking_system.dto.response.PromoCodeResponse;
import com.ticket.ticket_booking_system.dto.response.ValidatePromoCodeResponse;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.PromoCode;
import com.ticket.ticket_booking_system.entity.PromoCode.PromoCodeScope;
import com.ticket.ticket_booking_system.entity.TicketCategory;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.PromoCodeRepository;
import com.ticket.ticket_booking_system.repository.TicketCategoryRepository;
import com.ticket.ticket_booking_system.service.PromoCodeService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class PromoCodeServiceImpl implements PromoCodeService {

    private final PromoCodeRepository promoCodeRepository;
    private final EventRepository eventRepository;
    private final TicketCategoryRepository ticketCategoryRepository;
    private final OrganizerRepository organizerRepository;

    @Override
    @Transactional(readOnly = true)
    public List<PromoCodeResponse> getAllPromoCodes() {
        return promoCodeRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PromoCodeResponse createAdminPromoCode(PromoCodeRequest request, String adminEmail) {
        String cleanCode = request.getCode().trim().toUpperCase();
        if (promoCodeRepository.existsByCodeIgnoreCase(cleanCode)) {
            throw new IllegalArgumentException("Promo code '" + cleanCode + "' already exists");
        }

        Event event = null;
        TicketCategory ticketCategory = null;

        if (request.getScope() == PromoCodeScope.EVENT || request.getScope() == PromoCodeScope.TICKET_CATEGORY) {
            if (request.getEventId() == null) {
                throw new IllegalArgumentException("Event ID is required for Event or Ticket Category scope");
            }
            event = eventRepository.findById(request.getEventId())
                    .orElseThrow(() -> new ResourceNotFoundException("Event", "id", request.getEventId().toString()));
        }

        if (request.getScope() == PromoCodeScope.TICKET_CATEGORY) {
            if (request.getTicketCategoryId() != null) {
                ticketCategory = ticketCategoryRepository.findById(request.getTicketCategoryId())
                        .orElse(null);
            }
        }

        PromoCode promoCode = PromoCode.builder()
                .code(cleanCode)
                .description(request.getDescription())
                .discountPercentage(request.getDiscountPercentage())
                .maxDiscountAmount(request.getMaxDiscountAmount())
                .scope(request.getScope())
                .event(event)
                .ticketCategory(ticketCategory)
                .ticketCategoryName(ticketCategory != null ? ticketCategory.getCategoryName() : request.getTicketCategoryName())
                .createdByRole("ADMIN")
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .usageLimit(request.getUsageLimit())
                .minOrderAmount(request.getMinOrderAmount())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .createdBy(adminEmail != null ? adminEmail : "ADMIN")
                .updatedBy(adminEmail != null ? adminEmail : "ADMIN")
                .build();

        return mapToResponse(promoCodeRepository.save(promoCode));
    }

    @Override
    @Transactional
    public PromoCodeResponse updateAdminPromoCode(UUID id, PromoCodeRequest request, String adminEmail) {
        PromoCode promoCode = promoCodeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PromoCode", "id", id.toString()));

        String cleanCode = request.getCode().trim().toUpperCase();
        if (!promoCode.getCode().equalsIgnoreCase(cleanCode) && promoCodeRepository.existsByCodeIgnoreCase(cleanCode)) {
            throw new IllegalArgumentException("Promo code '" + cleanCode + "' already exists");
        }

        Event event = null;
        TicketCategory ticketCategory = null;

        if (request.getScope() == PromoCodeScope.EVENT || request.getScope() == PromoCodeScope.TICKET_CATEGORY) {
            if (request.getEventId() == null) {
                throw new IllegalArgumentException("Event ID is required for Event or Ticket Category scope");
            }
            event = eventRepository.findById(request.getEventId())
                    .orElseThrow(() -> new ResourceNotFoundException("Event", "id", request.getEventId().toString()));
        }

        if (request.getScope() == PromoCodeScope.TICKET_CATEGORY) {
            if (request.getTicketCategoryId() != null) {
                ticketCategory = ticketCategoryRepository.findById(request.getTicketCategoryId())
                        .orElse(null);
            }
        }

        promoCode.setCode(cleanCode);
        promoCode.setDescription(request.getDescription());
        promoCode.setDiscountPercentage(request.getDiscountPercentage());
        promoCode.setMaxDiscountAmount(request.getMaxDiscountAmount());
        promoCode.setScope(request.getScope());
        promoCode.setEvent(event);
        promoCode.setTicketCategory(ticketCategory);
        promoCode.setTicketCategoryName(ticketCategory != null ? ticketCategory.getCategoryName() : request.getTicketCategoryName());
        promoCode.setStartDate(request.getStartDate());
        promoCode.setEndDate(request.getEndDate());
        promoCode.setUsageLimit(request.getUsageLimit());
        promoCode.setMinOrderAmount(request.getMinOrderAmount());
        if (request.getIsActive() != null) {
            promoCode.setIsActive(request.getIsActive());
        }
        promoCode.setUpdatedBy(adminEmail != null ? adminEmail : "ADMIN");

        return mapToResponse(promoCodeRepository.save(promoCode));
    }

    @Override
    @Transactional
    public void deleteAdminPromoCode(UUID id, String adminEmail) {
        PromoCode promoCode = promoCodeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PromoCode", "id", id.toString()));
        promoCodeRepository.delete(promoCode);
    }

    @Override
    @Transactional
    public PromoCodeResponse togglePromoCodeStatus(UUID id, String userEmail) {
        PromoCode promoCode = promoCodeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PromoCode", "id", id.toString()));
        promoCode.setIsActive(!Boolean.TRUE.equals(promoCode.getIsActive()));
        promoCode.setUpdatedBy(userEmail);
        return mapToResponse(promoCodeRepository.save(promoCode));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PromoCodeResponse> getOrganizerPromoCodes(UUID organizerId) {
        return promoCodeRepository.findByOrganizer_OrganizerIdOrderByCreatedAtDesc(organizerId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PromoCodeResponse createOrganizerPromoCode(PromoCodeRequest request, UUID organizerId, String organizerEmail) {
        String cleanCode = request.getCode().trim().toUpperCase();
        if (promoCodeRepository.existsByCodeIgnoreCase(cleanCode)) {
            throw new IllegalArgumentException("Promo code '" + cleanCode + "' already exists");
        }

        Organizer organizer = organizerRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("Organizer", "id", organizerId.toString()));

        if (request.getScope() == PromoCodeScope.ALL_EVENTS) {
            throw new IllegalArgumentException("Organizers cannot create global promo codes");
        }

        if (request.getEventId() == null) {
            throw new IllegalArgumentException("Event ID is required");
        }

        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", request.getEventId().toString()));

        // Ensure the event belongs to this organizer
        if (event.getOrganizer() == null || !event.getOrganizer().getOrganizerId().equals(organizerId)) {
            throw new IllegalArgumentException("You can only create promo codes for your own events");
        }

        TicketCategory ticketCategory = null;
        if (request.getScope() == PromoCodeScope.TICKET_CATEGORY && request.getTicketCategoryId() != null) {
            ticketCategory = ticketCategoryRepository.findById(request.getTicketCategoryId())
                    .orElse(null);
        }

        PromoCode promoCode = PromoCode.builder()
                .code(cleanCode)
                .description(request.getDescription())
                .discountPercentage(request.getDiscountPercentage())
                .maxDiscountAmount(request.getMaxDiscountAmount())
                .scope(request.getScope())
                .event(event)
                .ticketCategory(ticketCategory)
                .ticketCategoryName(ticketCategory != null ? ticketCategory.getCategoryName() : request.getTicketCategoryName())
                .organizer(organizer)
                .createdByRole("ORGANIZER")
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .usageLimit(request.getUsageLimit())
                .minOrderAmount(request.getMinOrderAmount())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .createdBy(organizerEmail != null ? organizerEmail : "ORGANIZER")
                .updatedBy(organizerEmail != null ? organizerEmail : "ORGANIZER")
                .build();

        return mapToResponse(promoCodeRepository.save(promoCode));
    }

    @Override
    @Transactional
    public PromoCodeResponse updateOrganizerPromoCode(UUID id, PromoCodeRequest request, UUID organizerId, String organizerEmail) {
        PromoCode promoCode = promoCodeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PromoCode", "id", id.toString()));

        if (promoCode.getOrganizer() == null || !promoCode.getOrganizer().getOrganizerId().equals(organizerId)) {
            throw new IllegalArgumentException("You do not have permission to update this promo code");
        }

        String cleanCode = request.getCode().trim().toUpperCase();
        if (!promoCode.getCode().equalsIgnoreCase(cleanCode) && promoCodeRepository.existsByCodeIgnoreCase(cleanCode)) {
            throw new IllegalArgumentException("Promo code '" + cleanCode + "' already exists");
        }

        if (request.getScope() == PromoCodeScope.ALL_EVENTS) {
            throw new IllegalArgumentException("Organizers cannot create global promo codes");
        }

        if (request.getEventId() == null) {
            throw new IllegalArgumentException("Event ID is required");
        }

        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", request.getEventId().toString()));

        if (event.getOrganizer() == null || !event.getOrganizer().getOrganizerId().equals(organizerId)) {
            throw new IllegalArgumentException("You can only create promo codes for your own events");
        }

        TicketCategory ticketCategory = null;
        if (request.getScope() == PromoCodeScope.TICKET_CATEGORY && request.getTicketCategoryId() != null) {
            ticketCategory = ticketCategoryRepository.findById(request.getTicketCategoryId())
                    .orElse(null);
        }

        promoCode.setCode(cleanCode);
        promoCode.setDescription(request.getDescription());
        promoCode.setDiscountPercentage(request.getDiscountPercentage());
        promoCode.setMaxDiscountAmount(request.getMaxDiscountAmount());
        promoCode.setScope(request.getScope());
        promoCode.setEvent(event);
        promoCode.setTicketCategory(ticketCategory);
        promoCode.setTicketCategoryName(ticketCategory != null ? ticketCategory.getCategoryName() : request.getTicketCategoryName());
        promoCode.setStartDate(request.getStartDate());
        promoCode.setEndDate(request.getEndDate());
        promoCode.setUsageLimit(request.getUsageLimit());
        promoCode.setMinOrderAmount(request.getMinOrderAmount());
        if (request.getIsActive() != null) {
            promoCode.setIsActive(request.getIsActive());
        }
        promoCode.setUpdatedBy(organizerEmail != null ? organizerEmail : "ORGANIZER");

        return mapToResponse(promoCodeRepository.save(promoCode));
    }

    @Override
    @Transactional
    public void deleteOrganizerPromoCode(UUID id, UUID organizerId, String organizerEmail) {
        PromoCode promoCode = promoCodeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PromoCode", "id", id.toString()));

        if (promoCode.getOrganizer() == null || !promoCode.getOrganizer().getOrganizerId().equals(organizerId)) {
            throw new IllegalArgumentException("You do not have permission to delete this promo code");
        }

        promoCodeRepository.delete(promoCode);
    }

    @Override
    @Transactional
    public PromoCodeResponse toggleOrganizerPromoCodeStatus(UUID id, UUID organizerId, String organizerEmail) {
        PromoCode promoCode = promoCodeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PromoCode", "id", id.toString()));

        if (promoCode.getOrganizer() == null || !promoCode.getOrganizer().getOrganizerId().equals(organizerId)) {
            throw new IllegalArgumentException("You do not have permission to modify this promo code");
        }

        promoCode.setIsActive(!Boolean.TRUE.equals(promoCode.getIsActive()));
        promoCode.setUpdatedBy(organizerEmail);
        return mapToResponse(promoCodeRepository.save(promoCode));
    }

    @Override
    @Transactional(readOnly = true)
    public ValidatePromoCodeResponse validateAndCalculateDiscount(ValidatePromoCodeRequest request) {
        if (request.getCode() == null || request.getCode().trim().isEmpty()) {
            return ValidatePromoCodeResponse.builder()
                    .valid(false)
                    .message("Promo code is required")
                    .build();
        }

        String cleanCode = request.getCode().trim().toUpperCase();
        PromoCode promoCode = promoCodeRepository.findByCodeIgnoreCase(cleanCode).orElse(null);

        if (promoCode == null) {
            return ValidatePromoCodeResponse.builder()
                    .valid(false)
                    .code(cleanCode)
                    .message("Invalid promo code")
                    .build();
        }

        if (!Boolean.TRUE.equals(promoCode.getIsActive())) {
            return ValidatePromoCodeResponse.builder()
                    .valid(false)
                    .code(cleanCode)
                    .message("This promo code is currently inactive")
                    .build();
        }

        LocalDateTime now = LocalDateTime.now();
        if (promoCode.getStartDate() != null && now.isBefore(promoCode.getStartDate())) {
            return ValidatePromoCodeResponse.builder()
                    .valid(false)
                    .code(cleanCode)
                    .message("This promo code is not valid yet (starts on " + promoCode.getStartDate().toLocalDate() + ")")
                    .build();
        }

        if (promoCode.getEndDate() != null && now.isAfter(promoCode.getEndDate())) {
            return ValidatePromoCodeResponse.builder()
                    .valid(false)
                    .code(cleanCode)
                    .message("This promo code has expired")
                    .build();
        }

        if (promoCode.getUsageLimit() != null && promoCode.getUsageCount() >= promoCode.getUsageLimit()) {
            return ValidatePromoCodeResponse.builder()
                    .valid(false)
                    .code(cleanCode)
                    .message("This promo code has reached its maximum usage limit")
                    .build();
        }

        BigDecimal calculatedSubTotal = BigDecimal.ZERO;
        if (request.getSeats() != null) {
            for (ValidatePromoCodeRequest.SelectedSeatItem s : request.getSeats()) {
                if (s.getPrice() != null) calculatedSubTotal = calculatedSubTotal.add(s.getPrice());
            }
        }
        if (request.getSharedAreas() != null) {
            for (ValidatePromoCodeRequest.SelectedSharedAreaItem a : request.getSharedAreas()) {
                if (a.getPricePerTicket() != null && a.getTicketCount() != null) {
                    calculatedSubTotal = calculatedSubTotal.add(a.getPricePerTicket().multiply(BigDecimal.valueOf(a.getTicketCount())));
                }
            }
        }

        BigDecimal subTotal = (request.getSubTotal() != null && request.getSubTotal().compareTo(BigDecimal.ZERO) > 0)
                ? request.getSubTotal()
                : calculatedSubTotal;

        if (promoCode.getMinOrderAmount() != null && subTotal.compareTo(promoCode.getMinOrderAmount()) < 0) {
            return ValidatePromoCodeResponse.builder()
                    .valid(false)
                    .code(cleanCode)
                    .message("Minimum order amount of LKR " + promoCode.getMinOrderAmount() + " is required to use this promo code")
                    .build();
        }

        // Scope validation
        if (promoCode.getScope() == PromoCodeScope.EVENT || promoCode.getScope() == PromoCodeScope.TICKET_CATEGORY) {
            if (promoCode.getEvent() != null && !promoCode.getEvent().getEventId().equals(request.getEventId())) {
                return ValidatePromoCodeResponse.builder()
                        .valid(false)
                        .code(cleanCode)
                        .message("This promo code is only valid for event: " + promoCode.getEvent().getName())
                        .build();
            }
        }

        BigDecimal eligibleAmount = BigDecimal.ZERO;
        String appliedTargetDescription;

        if (promoCode.getScope() == PromoCodeScope.TICKET_CATEGORY) {
            UUID targetCatId = promoCode.getTicketCategory() != null ? promoCode.getTicketCategory().getId() : null;
            String targetCatName = promoCode.getTicketCategoryName() != null ? promoCode.getTicketCategoryName().toLowerCase().trim() : null;

            // Sum eligible seated tickets
            if (request.getSeats() != null) {
                for (ValidatePromoCodeRequest.SelectedSeatItem seat : request.getSeats()) {
                    boolean matches = false;
                    if (targetCatId != null && targetCatId.equals(seat.getCategoryId())) {
                        matches = true;
                    } else if (targetCatName != null) {
                        String sCat = seat.getCategoryName() != null ? seat.getCategoryName().toLowerCase().trim() : "";
                        String sVenueCat = seat.getVenueSeatCategoryName() != null ? seat.getVenueSeatCategoryName().toLowerCase().trim() : "";
                        if (sCat.contains(targetCatName) || sVenueCat.contains(targetCatName) || targetCatName.contains(sCat)) {
                            matches = true;
                        }
                    }
                    BigDecimal seatPrice = (seat.getPrice() != null && seat.getPrice().compareTo(BigDecimal.ZERO) > 0)
                            ? seat.getPrice()
                            : (request.getSeats().size() > 0 && subTotal.compareTo(BigDecimal.ZERO) > 0
                                ? subTotal.divide(BigDecimal.valueOf(request.getSeats().size()), 2, RoundingMode.HALF_UP)
                                : BigDecimal.ZERO);
                    if (matches) {
                        eligibleAmount = eligibleAmount.add(seatPrice);
                    }
                }
            }

            // Sum eligible shared area tickets
            if (request.getSharedAreas() != null) {
                for (ValidatePromoCodeRequest.SelectedSharedAreaItem area : request.getSharedAreas()) {
                    boolean matches = false;
                    if (targetCatId != null && targetCatId.equals(area.getCategoryId())) {
                        matches = true;
                    } else if (targetCatName != null) {
                        String aCat = area.getCategoryName() != null ? area.getCategoryName().toLowerCase().trim() : "";
                        if (aCat.contains(targetCatName) || targetCatName.contains(aCat)) {
                            matches = true;
                        }
                    }
                    BigDecimal areaTotal = (area.getPricePerTicket() != null && area.getTicketCount() != null && area.getPricePerTicket().compareTo(BigDecimal.ZERO) > 0)
                            ? area.getPricePerTicket().multiply(BigDecimal.valueOf(area.getTicketCount()))
                            : subTotal;
                    if (matches) {
                        eligibleAmount = eligibleAmount.add(areaTotal);
                    }
                }
            }

            if (eligibleAmount.compareTo(BigDecimal.ZERO) <= 0) {
                String targetDisplay = promoCode.getTicketCategoryName() != null ? promoCode.getTicketCategoryName() : "selected category";
                return ValidatePromoCodeResponse.builder()
                        .valid(false)
                        .code(cleanCode)
                        .message("This promo code only applies to '" + targetDisplay + "' tickets, which are not in your selection.")
                        .build();
            }

            appliedTargetDescription = promoCode.getTicketCategoryName() != null ? promoCode.getTicketCategoryName() : "Selected Category";
        } else {
            // EVENT or ALL_EVENTS applies to entire subtotal
            eligibleAmount = subTotal;
            appliedTargetDescription = promoCode.getScope() == PromoCodeScope.ALL_EVENTS ? "All Events" : (promoCode.getEvent() != null ? promoCode.getEvent().getName() : "Event Tickets");
        }

        // Calculate discount percentage
        BigDecimal percentageFactor = promoCode.getDiscountPercentage().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        BigDecimal calculatedDiscount = eligibleAmount.multiply(percentageFactor).setScale(2, RoundingMode.HALF_UP);

        // Apply max discount amount cap if specified
        if (promoCode.getMaxDiscountAmount() != null && calculatedDiscount.compareTo(promoCode.getMaxDiscountAmount()) > 0) {
            calculatedDiscount = promoCode.getMaxDiscountAmount();
        }

        // Ensure discount cannot exceed subtotal
        if (calculatedDiscount.compareTo(subTotal) > 0) {
            calculatedDiscount = subTotal;
        }

        BigDecimal finalAmount = subTotal.subtract(calculatedDiscount).setScale(2, RoundingMode.HALF_UP);

        return ValidatePromoCodeResponse.builder()
                .valid(true)
                .code(promoCode.getCode())
                .description(promoCode.getDescription())
                .discountPercentage(promoCode.getDiscountPercentage())
                .discountAmount(calculatedDiscount)
                .finalAmount(finalAmount)
                .scope(promoCode.getScope().name())
                .appliedTarget(appliedTargetDescription)
                .message("Promo code applied successfully! " + promoCode.getDiscountPercentage().stripTrailingZeros().toPlainString() + "% discount applied on " + appliedTargetDescription)
                .build();
    }

    @Override
    @Transactional
    public void incrementUsage(String code) {
        if (code == null || code.trim().isEmpty()) return;
        promoCodeRepository.findByCodeIgnoreCase(code.trim().toUpperCase())
                .ifPresent(promo -> {
                    promo.setUsageCount(promo.getUsageCount() + 1);
                    promoCodeRepository.save(promo);
                    log.info("Incremented usage for promo code {}. New count: {}", promo.getCode(), promo.getUsageCount());
                });
    }

    private PromoCodeResponse mapToResponse(PromoCode p) {
        return PromoCodeResponse.builder()
                .id(p.getId())
                .code(p.getCode())
                .description(p.getDescription())
                .discountPercentage(p.getDiscountPercentage())
                .maxDiscountAmount(p.getMaxDiscountAmount())
                .scope(p.getScope())
                .eventId(p.getEvent() != null ? p.getEvent().getEventId() : null)
                .eventName(p.getEvent() != null ? p.getEvent().getName() : null)
                .ticketCategoryId(p.getTicketCategory() != null ? p.getTicketCategory().getId() : null)
                .ticketCategoryName(p.getTicketCategoryName())
                .organizerId(p.getOrganizer() != null ? p.getOrganizer().getOrganizerId() : null)
                .organizerName(p.getOrganizer() != null ? p.getOrganizer().getOrganizationName() : null)
                .createdByRole(p.getCreatedByRole())
                .startDate(p.getStartDate())
                .endDate(p.getEndDate())
                .usageLimit(p.getUsageLimit())
                .usageCount(p.getUsageCount())
                .minOrderAmount(p.getMinOrderAmount())
                .isActive(p.getIsActive())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .createdBy(p.getCreatedBy())
                .updatedBy(p.getUpdatedBy())
                .build();
    }
}
