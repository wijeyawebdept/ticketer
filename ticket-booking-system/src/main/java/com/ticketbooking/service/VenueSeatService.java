package com.ticketbooking.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticketbooking.dto.SeatAvailabilityResponse;
import com.ticketbooking.dto.SeatDTO;
import com.ticketbooking.entity.SeatBooking;
import com.ticketbooking.entity.SeatBooking.SeatStatus;
import com.ticketbooking.entity.VenueSeat;
import com.ticketbooking.repository.SeatBookingRepository;
import com.ticketbooking.repository.VenueSeatRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VenueSeatService {

    private final VenueSeatRepository venueSeatRepository;
    private final SeatBookingRepository seatBookingRepository;

    /**
     * Get all venue seats with their hard-coded layout
     */
    public List<VenueSeat> getAllSeats() {
        return venueSeatRepository.findAllOrderedByLayout();
    }

    /**
     * Get seat availability for a specific event schedule
     */
    @Transactional(readOnly = true)
    public SeatAvailabilityResponse getSeatAvailability(Long eventScheduleId) {
        // Get all venue seats (hard-coded layout)
        List<VenueSeat> allSeats = venueSeatRepository.findAllOrderedByLayout();
        
        // Get bookings for this event
        List<SeatBooking> bookings = seatBookingRepository.findByEventScheduleId(eventScheduleId);
        
        // Create a map of seat bookings
        Map<String, SeatBooking> bookingMap = bookings.stream()
            .collect(Collectors.toMap(sb -> sb.getSeat().getSeatId(), sb -> sb));
        
        // Build response
        List<SeatDTO> seatDTOs = new ArrayList<>();
        long available = 0, booked = 0, holds = 0;
        
        for (VenueSeat seat : allSeats) {
            SeatBooking booking = bookingMap.get(seat.getSeatId());
            SeatStatus status = booking != null ? booking.getStatus() : SeatStatus.AVAILABLE;
            
            BigDecimal price = booking != null && booking.getPriceOverride() != null 
                ? booking.getPriceOverride() 
                : seat.getCategory().getBasePrice();
            
            SeatDTO dto = new SeatDTO(
                seat.getSeatId(),
                seat.getSection(),
                seat.getRowLabel(),
                seat.getSeatNumber(),
                seat.getCategory().getCategoryName(),
                seat.getCategory().getColorCode(),
                seat.getXPosition(),
                seat.getYPosition(),
                seat.getIsAisleSeat(),
                seat.getIsAccessible(),
                status.name(),
                price
            );
            
            seatDTOs.add(dto);
            
            // Count statuses
            if (status == SeatStatus.AVAILABLE) available++;
            else if (status == SeatStatus.BOOKED) booked++;
            else if (status == SeatStatus.TEMPORARY_HOLD) holds++;
        }
        
        return new SeatAvailabilityResponse(
            seatDTOs,
            (long) allSeats.size(),
            available,
            booked,
            holds
        );
    }

    /**
     * Hold seats temporarily (5-minute timer)
     */
    @Transactional
    public boolean holdSeats(Long eventScheduleId, List<String> seatIds, Long userId) {
        LocalDateTime holdExpiry = LocalDateTime.now().plusMinutes(5);
        
        for (String seatId : seatIds) {
            VenueSeat seat = venueSeatRepository.findById(seatId)
                .orElseThrow(() -> new RuntimeException("Seat not found: " + seatId));
            
            // Check if seat is already booked or held
            var existingBooking = seatBookingRepository
                .findBySeat_SeatIdAndEventScheduleId(seatId, eventScheduleId);
            
            if (existingBooking.isPresent()) {
                SeatBooking booking = existingBooking.get();
                if (booking.getStatus() != SeatStatus.AVAILABLE) {
                    return false; // Seat not available
                }
                
                // Update existing record
                booking.setStatus(SeatStatus.TEMPORARY_HOLD);
                booking.setHoldExpiresAt(holdExpiry);
                booking.setBookedByUserId(userId);
                seatBookingRepository.save(booking);
            } else {
                // Create new booking record
                SeatBooking newBooking = new SeatBooking();
                newBooking.setSeat(seat);
                newBooking.setEventScheduleId(eventScheduleId);
                newBooking.setStatus(SeatStatus.TEMPORARY_HOLD);
                newBooking.setHoldExpiresAt(holdExpiry);
                newBooking.setBookedByUserId(userId);
                seatBookingRepository.save(newBooking);
            }
        }
        
        return true;
    }

    /**
     * Confirm seat booking (convert from hold to booked)
     */
    @Transactional
    public boolean confirmBooking(Long eventScheduleId, List<String> seatIds, Long userId, Long bookingRefId) {
        for (String seatId : seatIds) {
            var bookingOpt = seatBookingRepository
                .findBySeat_SeatIdAndEventScheduleId(seatId, eventScheduleId);
            
            if (bookingOpt.isEmpty() || bookingOpt.get().getStatus() != SeatStatus.TEMPORARY_HOLD) {
                return false;
            }
            
            SeatBooking booking = bookingOpt.get();
            booking.setStatus(SeatStatus.BOOKED);
            booking.setBookedAt(LocalDateTime.now());
            booking.setHoldExpiresAt(null);
            booking.setBookingRefId(bookingRefId);
            seatBookingRepository.save(booking);
        }
        
        return true;
    }

    /**
     * Release seat holds (manual or automatic)
     */
    @Transactional
    public void releaseHolds(Long eventScheduleId, List<String> seatIds) {
        for (String seatId : seatIds) {
            var bookingOpt = seatBookingRepository
                .findBySeat_SeatIdAndEventScheduleId(seatId, eventScheduleId);
            
            bookingOpt.ifPresent(booking -> {
                if (booking.getStatus() == SeatStatus.TEMPORARY_HOLD) {
                    booking.setStatus(SeatStatus.AVAILABLE);
                    booking.setHoldExpiresAt(null);
                    booking.setBookedByUserId(null);
                    seatBookingRepository.save(booking);
                }
            });
        }
    }

    /**
     * Scheduled task to release expired holds (runs every minute)
     */
    @Scheduled(fixedRate = 60000) // Every 60 seconds
    @Transactional
    public void releaseExpiredHolds() {
        int released = seatBookingRepository.releaseExpiredHolds(LocalDateTime.now());
        if (released > 0) {
            System.out.println("Released " + released + " expired seat holds");
        }
    }

    /**
     * Initialize seat bookings for a new event schedule
     */
    @Transactional
    public void initializeEventSeats(Long eventScheduleId) {
        List<VenueSeat> allSeats = venueSeatRepository.findAll();
        
        for (VenueSeat seat : allSeats) {
            // Only create if not exists
            boolean exists = seatBookingRepository
                .existsBySeat_SeatIdAndEventScheduleIdAndStatus(
                    seat.getSeatId(), eventScheduleId, SeatStatus.AVAILABLE
                );
            
            if (!exists) {
                SeatBooking booking = new SeatBooking();
                booking.setSeat(seat);
                booking.setEventScheduleId(eventScheduleId);
                booking.setStatus(SeatStatus.AVAILABLE);
                seatBookingRepository.save(booking);
            }
        }
    }

    /**
     * Initialize event seats with custom pricing per category
     * This allows different prices for different events
     */
    @Transactional
    public void initializeEventSeatsWithPricing(Long eventScheduleId, Map<String, BigDecimal> categoryPrices) {
        List<VenueSeat> allSeats = venueSeatRepository.findAll();
        
        for (VenueSeat seat : allSeats) {
            boolean exists = seatBookingRepository
                .existsBySeat_SeatIdAndEventScheduleIdAndStatus(
                    seat.getSeatId(), eventScheduleId, SeatStatus.AVAILABLE
                );
            
            if (!exists) {
                SeatBooking booking = new SeatBooking();
                booking.setSeat(seat);
                booking.setEventScheduleId(eventScheduleId);
                booking.setStatus(SeatStatus.AVAILABLE);
                
                // Set custom price if provided for this category
                String categoryName = seat.getCategory().getCategoryName();
                if (categoryPrices.containsKey(categoryName)) {
                    booking.setPriceOverride(categoryPrices.get(categoryName));
                }
                
                seatBookingRepository.save(booking);
            }
        }
    }

    /**
     * Update pricing for an existing event
     */
    @Transactional
    public void updateEventPricing(Long eventScheduleId, String categoryName, BigDecimal newPrice) {
        List<SeatBooking> bookings = seatBookingRepository.findByEventScheduleId(eventScheduleId);
        
        for (SeatBooking booking : bookings) {
            if (booking.getSeat().getCategory().getCategoryName().equals(categoryName)) {
                booking.setPriceOverride(newPrice);
                seatBookingRepository.save(booking);
            }
        }
    }
}
