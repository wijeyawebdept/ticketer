package com.ticket.ticket_booking_system.controller.admin;

import com.ticket.ticket_booking_system.dto.request.HandlingFeeUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.HandlingFeeResponse;
import com.ticket.ticket_booking_system.service.SystemSettingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/system-settings")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
public class AdminSystemSettingController {

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

    @PutMapping("/handling-fee")
    public ResponseEntity<HandlingFeeResponse> updateHandlingFee(
            @Valid @RequestBody HandlingFeeUpdateRequest request,
            Authentication authentication) {
        try {
            String updatedBy = authentication != null ? authentication.getName() : "ADMIN";
            HandlingFeeResponse response = systemSettingService.updateHandlingFeeSetting(request, updatedBy);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error updating handling fee: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }
}
