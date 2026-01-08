package com.ticketbooking.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeatAvailabilityResponse {
    private List<SeatDTO> seats;
    private Long totalSeats;
    private Long availableSeats;
    private Long bookedSeats;
    private Long temporaryHolds;
}
