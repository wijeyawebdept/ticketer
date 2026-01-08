package com.ticket.ticket_booking_system.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.entity.VenueSeat;
import com.ticket.ticket_booking_system.repository.VenueSeatRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VenueSeatService {

    private final VenueSeatRepository venueSeatRepository;

    /**
     * Get all venue seats with their hard-coded layout
     */
    @Transactional(readOnly = true)
    public List<VenueSeat> getAllSeats() {
        return venueSeatRepository.findAllOrderedByLayout();
    }

    /**
     * Get seats by section
     */
    @Transactional(readOnly = true)
    public List<VenueSeat> getSeatsBySection(String section) {
        return venueSeatRepository.findBySectionOrdered(section);
    }
}
