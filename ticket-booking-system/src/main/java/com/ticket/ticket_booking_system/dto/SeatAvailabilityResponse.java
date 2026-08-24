package com.ticket.ticket_booking_system.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
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
    private Long heldSeats;
    private Long checkedInSeats;
    
    // Shared area data - ticket categories marked as shared areas
    private List<SharedAreaDTO> sharedAreas;
    
    // Constructor without sharedAreas for backward compatibility
    public SeatAvailabilityResponse(List<SeatDTO> seats, Long totalSeats, Long availableSeats, Long bookedSeats, Long heldSeats) {
        this.seats = seats;
        this.totalSeats = totalSeats;
        this.availableSeats = availableSeats;
        this.bookedSeats = bookedSeats;
        this.heldSeats = heldSeats;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SharedAreaDTO {
        private UUID categoryId;
        private String categoryName;
        private BigDecimal price;
        private BigDecimal earlyBirdPrice;
        private Integer capacity;
        private Integer sharedAreaNumber;
        private Integer availableTickets;
        private Integer bookedTickets;
        private Integer checkedInTickets;
        
        // Deal properties for checkout calculation
        private Boolean dealActive;
        private String dealType;
        private BigDecimal dealDiscountPercentage;
        private Integer dealBuyQuantity;
        private Integer dealFreeQuantity;
        private String dealLabel;
    }
}
