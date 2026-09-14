package com.ticket.ticket_booking_system.service;

import java.util.List;
import java.util.UUID;

import com.ticket.ticket_booking_system.dto.AssignGateStaffRequest;
import com.ticket.ticket_booking_system.dto.GateStaffAssignmentDTO;
import com.ticket.ticket_booking_system.dto.UpdateGateStaffAssignmentRequest;
import com.ticket.ticket_booking_system.dto.response.EventResponse;

public interface GateStaffAssignmentService {

    List<GateStaffAssignmentDTO> getAllActiveAssignments();

    List<GateStaffAssignmentDTO> getAssignmentsByEvent(UUID eventId);

    List<GateStaffAssignmentDTO> getAssignmentsBySchedule(UUID scheduleId);

    List<GateStaffAssignmentDTO> getAssignmentsByStaff(UUID staffUserId);

    List<GateStaffAssignmentDTO> assignGateStaff(AssignGateStaffRequest request, UUID assignedByUserId);

    GateStaffAssignmentDTO updateAssignment(UUID assignmentId, UpdateGateStaffAssignmentRequest request);

    void removeAssignment(UUID assignmentId);

    boolean isStaffAssigned(UUID staffUserId, UUID eventId, UUID scheduleId);

    List<EventResponse> getAssignedEventsForStaff(UUID staffUserId);
}
