package com.ticket.ticket_booking_system.service.impl;

import com.ticket.ticket_booking_system.dto.request.HandlingFeeUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.HandlingFeeResponse;
import com.ticket.ticket_booking_system.entity.SystemSetting;
import com.ticket.ticket_booking_system.repository.SystemSettingRepository;
import com.ticket.ticket_booking_system.service.SystemSettingService;
import com.ticket.ticket_booking_system.service.AdminAuditService;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.entity.Admin;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemSettingServiceImpl implements SystemSettingService {

    private static final String HANDLING_FEE_KEY = "HANDLING_FEE";
    private static final BigDecimal DEFAULT_HANDLING_FEE = new BigDecimal("100.00");

    private final SystemSettingRepository systemSettingRepository;
    private final AdminAuditService auditService;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;

    @Override
    public HandlingFeeResponse getHandlingFeeSetting() {
        SystemSetting setting = systemSettingRepository.findBySettingKey(HANDLING_FEE_KEY)
                .orElseGet(this::createDefaultHandlingFeeSetting);

        BigDecimal fee;
        try {
            fee = new BigDecimal(setting.getSettingValue());
        } catch (Exception e) {
            fee = DEFAULT_HANDLING_FEE;
        }

        return HandlingFeeResponse.builder()
                .handlingFee(fee)
                .isEnabled(setting.getIsEnabled() != null ? setting.getIsEnabled() : true)
                .description(setting.getDescription())
                .updatedAt(setting.getUpdatedAt())
                .updatedBy(setting.getUpdatedBy())
                .build();
    }

    @Override
    public BigDecimal getActiveHandlingFee() {
        SystemSetting setting = systemSettingRepository.findBySettingKey(HANDLING_FEE_KEY)
                .orElseGet(this::createDefaultHandlingFeeSetting);

        if (Boolean.FALSE.equals(setting.getIsEnabled())) {
            return BigDecimal.ZERO;
        }

        try {
            return new BigDecimal(setting.getSettingValue());
        } catch (Exception e) {
            return DEFAULT_HANDLING_FEE;
        }
    }

    @Override
    public HandlingFeeResponse updateHandlingFeeSetting(HandlingFeeUpdateRequest request, String updatedBy) {
        SystemSetting setting = systemSettingRepository.findBySettingKey(HANDLING_FEE_KEY)
                .orElseGet(() -> SystemSetting.builder()
                        .settingKey(HANDLING_FEE_KEY)
                        .createdAt(LocalDateTime.now())
                        .build());

        setting.setSettingValue(request.getHandlingFee().setScale(2, java.math.RoundingMode.HALF_UP).toPlainString());
        setting.setIsEnabled(request.getIsEnabled() != null ? request.getIsEnabled() : true);
        if (request.getDescription() != null) {
            setting.setDescription(request.getDescription());
        }
        setting.setUpdatedBy(updatedBy);
        setting.setUpdatedAt(LocalDateTime.now());

        setting = systemSettingRepository.save(setting);
        log.info("Handling fee updated to {} (enabled: {}) by {}", setting.getSettingValue(), setting.getIsEnabled(), updatedBy);

        UUID currentUserId = getCurrentUserId();
        if (currentUserId != null) {
            auditService.logAction(currentUserId, "UPDATE_SYSTEM_SETTINGS", "SYSTEM_SETTING", setting.getId(), 
                    "Updated handling fee to " + setting.getSettingValue() + " (enabled: " + setting.getIsEnabled() + ")");
        }

        return HandlingFeeResponse.builder()
                .handlingFee(new BigDecimal(setting.getSettingValue()))
                .isEnabled(setting.getIsEnabled())
                .description(setting.getDescription())
                .updatedAt(setting.getUpdatedAt())
                .updatedBy(setting.getUpdatedBy())
                .build();
    }

    private SystemSetting createDefaultHandlingFeeSetting() {
        SystemSetting defaultSetting = SystemSetting.builder()
                .settingKey(HANDLING_FEE_KEY)
                .settingValue(DEFAULT_HANDLING_FEE.toPlainString())
                .description("Standard online booking handling & service fee")
                .isEnabled(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .updatedBy("SYSTEM")
                .build();
        return systemSettingRepository.save(defaultSetting);
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
            }
        } catch (Exception e) {
            // Ignore
        }
        return null;
    }
}
