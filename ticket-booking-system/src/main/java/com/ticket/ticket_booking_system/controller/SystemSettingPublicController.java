package com.ticket.ticket_booking_system.controller;

import com.ticket.ticket_booking_system.dto.response.HandlingFeeResponse;
import com.ticket.ticket_booking_system.service.SystemSettingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/system-settings")
@RequiredArgsConstructor
@Slf4j
public class SystemSettingPublicController {

    private final SystemSettingService systemSettingService;

    @GetMapping("/handling-fee")
    public ResponseEntity<HandlingFeeResponse> getHandlingFee() {
        try {
            HandlingFeeResponse response = systemSettingService.getHandlingFeeSetting();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error retrieving handling fee setting: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
}
