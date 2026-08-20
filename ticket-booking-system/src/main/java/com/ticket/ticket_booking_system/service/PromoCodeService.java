package com.ticket.ticket_booking_system.service;

import java.util.List;
import java.util.UUID;

import com.ticket.ticket_booking_system.dto.request.PromoCodeRequest;
import com.ticket.ticket_booking_system.dto.request.ValidatePromoCodeRequest;
import com.ticket.ticket_booking_system.dto.response.PromoCodeResponse;
import com.ticket.ticket_booking_system.dto.response.ValidatePromoCodeResponse;

public interface PromoCodeService {

    // Admin methods
    List<PromoCodeResponse> getAllPromoCodes();

    PromoCodeResponse createAdminPromoCode(PromoCodeRequest request, String adminEmail);

    PromoCodeResponse updateAdminPromoCode(UUID id, PromoCodeRequest request, String adminEmail);

    void deleteAdminPromoCode(UUID id, String adminEmail);

    PromoCodeResponse togglePromoCodeStatus(UUID id, String userEmail);

    // Organizer methods
    List<PromoCodeResponse> getOrganizerPromoCodes(UUID organizerId);

    PromoCodeResponse createOrganizerPromoCode(PromoCodeRequest request, UUID organizerId, String organizerEmail);

    PromoCodeResponse updateOrganizerPromoCode(UUID id, PromoCodeRequest request, UUID organizerId, String organizerEmail);

    void deleteOrganizerPromoCode(UUID id, UUID organizerId, String organizerEmail);

    PromoCodeResponse toggleOrganizerPromoCodeStatus(UUID id, UUID organizerId, String organizerEmail);

    // Public / Validation methods
    ValidatePromoCodeResponse validateAndCalculateDiscount(ValidatePromoCodeRequest request);

    void incrementUsage(String code);
}
