package com.ticket.ticket_booking_system.dto;

import java.util.List;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeatHoldRequest {
    private UUID eventScheduleId;
    private List<String> seatIds;
    private Long userId;
    private int holdDurationMinutes = 5; // Default 5 minutes
}
