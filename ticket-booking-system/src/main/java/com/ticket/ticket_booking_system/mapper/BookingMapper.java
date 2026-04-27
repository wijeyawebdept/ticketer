package com.ticket.ticket_booking_system.mapper;

import java.math.BigDecimal;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.ticket.ticket_booking_system.dto.response.BookingResponse;
import com.ticket.ticket_booking_system.entity.Booking;
import com.ticket.ticket_booking_system.entity.BookingSeat;
import com.ticket.ticket_booking_system.entity.EventSchedule;

@Component
public class BookingMapper {
    
    /**
     * Convert Booking entity to BookingResponse DTO
     */
    public BookingResponse toResponse(Booking booking) {
        if (booking == null) {
            return null;
        }
        
        BookingResponse.BookingResponseBuilder builder = BookingResponse.builder()
            .bookingId(booking.getBookingId())
            .bookingReference(booking.getBookingReference())
            .bookingTime(booking.getBookingTime())
            .totalAmount(booking.getTotalAmount())
            .status(booking.getStatus())
            .attended(booking.getAttended())
            .cancelledAt(booking.getCancelledAt())
            .cancellationReason(booking.getCancellationReason());
        
        // User information
        if (booking.getUser() != null) {
            builder.userId(booking.getUser().getId())
                   .userFirstName(booking.getUser().getFirstName())
                   .userLastName(booking.getUser().getLastName())
                   .userEmail(booking.getUser().getEmail());
        }
        
        // Event information
        if (booking.getEvent() != null) {
            builder.eventId(booking.getEvent().getEventId())
                   .eventName(booking.getEvent().getName())
                   .eventDescription(booking.getEvent().getDescription())
                   .eventImageUrl(booking.getEvent().getImageUrl());
            
            // Venue information
            if (booking.getEvent().getVenue() != null) {
                builder.venueId(booking.getEvent().getVenue().getVenueId())
                       .venueName(booking.getEvent().getVenue().getName())
                       .venueAddress(booking.getEvent().getVenue().getAddress());
            }
        }
        
        // Schedule information (if exists)
        EventSchedule schedule = booking.getEventSchedule();
        if (schedule != null) {
            BigDecimal finalPrice = booking.getEvent() != null ? 
                schedule.calculateFinalPrice(booking.getEvent().getBasePrice()) : 
                BigDecimal.ZERO;
            
            builder.scheduleId(schedule.getScheduleId())
                   .scheduleDate(schedule.getScheduleDate().toString())
                   .scheduleStartTime(schedule.getStartTime().toString())
                   .scheduleEndTime(schedule.getEndTime().toString())
                   .scheduleFinalPrice(finalPrice)
                   .scheduleStatus(schedule.getStatus().toString());
        }
        
        // Booking seats information
        if (booking.getBookingSeats() != null && !booking.getBookingSeats().isEmpty()) {
            builder.seats(booking.getBookingSeats().stream()
                .map(this::toSeatInfo)
                .collect(Collectors.toList()));
        }
        
        return builder.build();
    }
    
    /**
     * Convert BookingSeat to BookingSeatInfo DTO
     */
    private BookingResponse.BookingSeatInfo toSeatInfo(BookingSeat bookingSeat) {
        if (bookingSeat == null) {
            return null;
        }
        
        BookingResponse.BookingSeatInfo.BookingSeatInfoBuilder builder = BookingResponse.BookingSeatInfo.builder()
            .price(bookingSeat.getPriceAtBooking());
            
        if (Boolean.TRUE.equals(bookingSeat.getIsSharedAreaTicket())) {
            builder.seatNumber("Shared Area " + bookingSeat.getSharedAreaNumber())
                   .section("Shared Area");
        } else if (bookingSeat.getVenueSeatId() != null) {
            builder.seatNumber(bookingSeat.getVenueSeatId());
        } else {
            builder.seatNumber("Unknown Seat");
        }
        
        return builder.build();
    }
}
