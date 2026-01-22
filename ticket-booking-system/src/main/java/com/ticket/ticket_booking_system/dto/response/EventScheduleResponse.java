package com.ticket.ticket_booking_system.dto.response;

import com.ticket.ticket_booking_system.entity.EventSchedule.ScheduleStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventScheduleResponse {

    private UUID scheduleId;
    private UUID eventId;
    private String eventName;
    private UUID venueId;
    private String venueName;
    private LocalDate scheduleDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer capacity;
    private Integer availableSeats;
    private Integer bookedSeats; // calculated: capacity - availableSeats
    private BigDecimal priceAdjustment;
    private BigDecimal finalPrice; // base price + adjustment
    private ScheduleStatus status;
    private String notes;
    private Boolean isBookable;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Helper method to calculate booked seats
    public Integer getBookedSeats() {
        return capacity != null && availableSeats != null 
            ? capacity - availableSeats 
            : 0;
    }

    // Helper method to calculate occupancy percentage
    public Double getOccupancyPercentage() {
        if (capacity == null || capacity == 0) return 0.0;
        return ((double) getBookedSeats() / capacity) * 100;
    }
}
