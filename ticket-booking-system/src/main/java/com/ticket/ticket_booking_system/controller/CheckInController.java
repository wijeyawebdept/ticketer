package com.ticket.ticket_booking_system.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.request.CheckInScanRequest;
import com.ticket.ticket_booking_system.dto.response.CheckInAttendeeDTO;
import com.ticket.ticket_booking_system.dto.response.CheckInResponse;
import com.ticket.ticket_booking_system.dto.response.CheckInStatsResponse;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.service.CheckInService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/checkin")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE') or hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ORGANIZER_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE')")
public class CheckInController {

    private final CheckInService checkInService;
    private final UserRepository userRepository;
    private final OrganizerRepository organizerRepository;
    private final OrganizerEmployeeRepository organizerEmployeeRepository;

    /**
     * Scan QR code or search code to check in tickets.
     */
    @PostMapping("/scan")
    public ResponseEntity<CheckInResponse> scanTicket(
            @Valid @RequestBody CheckInScanRequest request,
            Authentication authentication) {
        
        UUID staffId = extractStaffId(authentication);
        String staffName = extractStaffName(authentication);

        CheckInResponse response = checkInService.scanAndCheckIn(request, staffId, staffName);
        return ResponseEntity.ok(response);
    }

    /**
     * Manually toggle check-in status for an individual seat.
     */
    @PostMapping("/seat/{bookingSeatId}/toggle")
    public ResponseEntity<CheckInResponse> toggleSeat(
            @PathVariable UUID bookingSeatId,
            @RequestParam(defaultValue = "true") boolean checkIn,
            Authentication authentication) {
        
        UUID staffId = extractStaffId(authentication);
        String staffName = extractStaffName(authentication);

        CheckInResponse response = checkInService.toggleSeatCheckIn(bookingSeatId, checkIn, staffId, staffName);
        return ResponseEntity.ok(response);
    }

    /**
     * Get live check-in statistics for an event schedule.
     */
    @GetMapping("/schedule/{scheduleId}/stats")
    public ResponseEntity<CheckInStatsResponse> getScheduleStats(
            @PathVariable UUID scheduleId) {
        
        CheckInStatsResponse stats = checkInService.getScheduleCheckInStats(scheduleId);
        return ResponseEntity.ok(stats);
    }

    /**
     * Get attendee roster for an event schedule.
     */
    @GetMapping("/schedule/{scheduleId}/attendees")
    public ResponseEntity<List<CheckInAttendeeDTO>> getScheduleAttendees(
            @PathVariable UUID scheduleId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean checkedInOnly) {
        
        List<CheckInAttendeeDTO> attendees = checkInService.getScheduleAttendees(scheduleId, search, checkedInOnly);
        return ResponseEntity.ok(attendees);
    }

    // ── Helper methods to extract staff details ───────────────────────────────

    private UUID extractStaffId(Authentication authentication) {
        if (authentication == null) return null;
        if (authentication.getPrincipal() instanceof User) {
            return ((User) authentication.getPrincipal()).getUserId();
        }
        if (authentication.getPrincipal() instanceof Organizer) {
            return ((Organizer) authentication.getPrincipal()).getOrganizerId();
        }
        if (authentication.getPrincipal() instanceof OrganizerEmployee) {
            return ((OrganizerEmployee) authentication.getPrincipal()).getEmployeeId();
        }

        String email = authentication.getName();
        if (email != null) {
            User user = userRepository.findByEmail(email).orElse(null);
            if (user != null) return user.getUserId();
            Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
            if (organizer != null) return organizer.getOrganizerId();
            OrganizerEmployee employee = organizerEmployeeRepository.findByEmail(email).orElse(null);
            if (employee != null) return employee.getEmployeeId();
        }
        return null;
    }

    private String extractStaffName(Authentication authentication) {
        if (authentication == null) return "Staff";
        if (authentication.getPrincipal() instanceof User) {
            User u = (User) authentication.getPrincipal();
            return (u.getFirstName() + " " + u.getLastName()).trim();
        }
        if (authentication.getPrincipal() instanceof Organizer) {
            Organizer o = (Organizer) authentication.getPrincipal();
            return (o.getFirstName() + " " + o.getLastName()).trim();
        }
        if (authentication.getPrincipal() instanceof OrganizerEmployee) {
            OrganizerEmployee e = (OrganizerEmployee) authentication.getPrincipal();
            return (e.getFirstName() + " " + e.getLastName()).trim();
        }
        return authentication.getName() != null ? authentication.getName() : "Gate Staff";
    }
}
