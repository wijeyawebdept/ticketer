package com.ticket.ticket_booking_system.controller.admin;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.request.PromoCodeRequest;
import com.ticket.ticket_booking_system.dto.response.PromoCodeResponse;
import com.ticket.ticket_booking_system.service.PromoCodeService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/promocodes")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
@RequiredArgsConstructor
public class AdminPromoCodeController {

    private final PromoCodeService promoCodeService;

    @GetMapping
    public ResponseEntity<List<PromoCodeResponse>> getAllPromoCodes() {
        return ResponseEntity.ok(promoCodeService.getAllPromoCodes());
    }

    @PostMapping
    public ResponseEntity<PromoCodeResponse> createPromoCode(@Valid @RequestBody PromoCodeRequest request, Authentication auth) {
        String email = auth != null ? auth.getName() : "ADMIN";
        return ResponseEntity.ok(promoCodeService.createAdminPromoCode(request, email));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PromoCodeResponse> updatePromoCode(@PathVariable UUID id, @Valid @RequestBody PromoCodeRequest request, Authentication auth) {
        String email = auth != null ? auth.getName() : "ADMIN";
        return ResponseEntity.ok(promoCodeService.updateAdminPromoCode(id, request, email));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<PromoCodeResponse> togglePromoCodeStatus(@PathVariable UUID id, Authentication auth) {
        String email = auth != null ? auth.getName() : "ADMIN";
        return ResponseEntity.ok(promoCodeService.togglePromoCodeStatus(id, email));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePromoCode(@PathVariable UUID id, Authentication auth) {
        String email = auth != null ? auth.getName() : "ADMIN";
        promoCodeService.deleteAdminPromoCode(id, email);
        return ResponseEntity.noContent().build();
    }
}
