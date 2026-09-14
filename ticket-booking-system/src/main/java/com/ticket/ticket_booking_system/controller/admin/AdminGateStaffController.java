package com.ticket.ticket_booking_system.controller.admin;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.CreateGateStaffRequest;
import com.ticket.ticket_booking_system.dto.GateStaffDTO;
import com.ticket.ticket_booking_system.dto.UpdateGateStaffRequest;
import com.ticket.ticket_booking_system.service.GateStaffService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/gate-staff")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ORGANIZER_EMPLOYEE')")
public class AdminGateStaffController {

    private final GateStaffService gateStaffService;

    @GetMapping("/all")
    public ResponseEntity<List<GateStaffDTO>> getAllGateStaff() {
        List<GateStaffDTO> list = gateStaffService.getAllGateStaff();
        return ResponseEntity.ok(list);
    }

    @GetMapping
    public ResponseEntity<Page<GateStaffDTO>> getGateStaffPage(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer active,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        Page<GateStaffDTO> page = gateStaffService.getGateStaffPage(pageable, search, active);
        return ResponseEntity.ok(page);
    }

    @GetMapping("/{id}")
    public ResponseEntity<GateStaffDTO> getGateStaffById(@PathVariable UUID id) {
        GateStaffDTO dto = gateStaffService.getGateStaffById(id);
        return ResponseEntity.ok(dto);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<GateStaffDTO> createGateStaff(@Valid @RequestBody CreateGateStaffRequest request) {
        GateStaffDTO created = gateStaffService.createGateStaff(request);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<GateStaffDTO> updateGateStaff(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateGateStaffRequest request) {
        GateStaffDTO updated = gateStaffService.updateGateStaff(id, request);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> toggleStatus(
            @PathVariable UUID id,
            @RequestParam int active) {
        gateStaffService.toggleGateStaffStatus(id, active);
        return ResponseEntity.ok(Map.of("success", true, "active", active));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteGateStaff(@PathVariable UUID id) {
        gateStaffService.deleteGateStaff(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Gate staff deleted successfully"));
    }
}
