package com.ticket.ticket_booking_system.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.request.ValidatePromoCodeRequest;
import com.ticket.ticket_booking_system.dto.response.ValidatePromoCodeResponse;
import com.ticket.ticket_booking_system.service.PromoCodeService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/public/promocodes")
@RequiredArgsConstructor
public class PublicPromoCodeController {

    private final PromoCodeService promoCodeService;

    @PostMapping("/validate")
    public ResponseEntity<ValidatePromoCodeResponse> validatePromoCode(@Valid @RequestBody ValidatePromoCodeRequest request) {
        return ResponseEntity.ok(promoCodeService.validateAndCalculateDiscount(request));
    }
}
