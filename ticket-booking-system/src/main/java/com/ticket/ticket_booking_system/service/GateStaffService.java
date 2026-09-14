package com.ticket.ticket_booking_system.service;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.ticket.ticket_booking_system.dto.CreateGateStaffRequest;
import com.ticket.ticket_booking_system.dto.GateStaffDTO;
import com.ticket.ticket_booking_system.dto.UpdateGateStaffRequest;

public interface GateStaffService {

    List<GateStaffDTO> getAllGateStaff();

    Page<GateStaffDTO> getGateStaffPage(Pageable pageable, String search, Integer active);

    GateStaffDTO getGateStaffById(UUID id);

    GateStaffDTO createGateStaff(CreateGateStaffRequest request);

    GateStaffDTO updateGateStaff(UUID id, UpdateGateStaffRequest request);

    void toggleGateStaffStatus(UUID id, int active);

    void deleteGateStaff(UUID id);
}
