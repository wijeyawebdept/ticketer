package com.ticket.ticket_booking_system.service;

import com.ticket.ticket_booking_system.dto.request.HandlingFeeUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.HandlingFeeResponse;
import java.math.BigDecimal;

public interface SystemSettingService {
    HandlingFeeResponse getHandlingFeeSetting();
    BigDecimal getActiveHandlingFee();
    HandlingFeeResponse updateHandlingFeeSetting(HandlingFeeUpdateRequest request, String updatedBy);
}
