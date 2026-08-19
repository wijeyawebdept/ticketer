package com.ticket.ticket_booking_system.controller.organizer;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.request.PromoCodeRequest;
import com.ticket.ticket_booking_system.dto.response.PromoCodeResponse;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.service.PromoCodeService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/organizer/promocodes")
@PreAuthorize("hasAnyRole('ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN') or hasAnyAuthority('ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ORGANIZER_EMPLOYEE', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
@RequiredArgsConstructor
public class OrganizerPromoCodeController {

    private final PromoCodeService promoCodeService;
    private final OrganizerRepository organizerRepository;
    private final OrganizerEmployeeRepository employeeRepository;

    @GetMapping
    public ResponseEntity<List<PromoCodeResponse>> getMyPromoCodes(Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(promoCodeService.getOrganizerPromoCodes(organizerId));
    }

    @PostMapping
    public ResponseEntity<PromoCodeResponse> createPromoCode(@Valid @RequestBody PromoCodeRequest request, Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        String email = authentication != null ? authentication.getName() : "ORGANIZER";
        return ResponseEntity.ok(promoCodeService.createOrganizerPromoCode(request, organizerId, email));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PromoCodeResponse> updatePromoCode(@PathVariable UUID id, @Valid @RequestBody PromoCodeRequest request, Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        String email = authentication != null ? authentication.getName() : "ORGANIZER";
        return ResponseEntity.ok(promoCodeService.updateOrganizerPromoCode(id, request, organizerId, email));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<PromoCodeResponse> togglePromoCodeStatus(@PathVariable UUID id, Authentication authentication) {
        String email = authentication != null ? authentication.getName() : "ORGANIZER";
        return ResponseEntity.ok(promoCodeService.togglePromoCodeStatus(id, email));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePromoCode(@PathVariable UUID id, Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        String email = authentication != null ? authentication.getName() : "ORGANIZER";
        promoCodeService.deleteOrganizerPromoCode(id, organizerId, email);
        return ResponseEntity.noContent().build();
    }

    private UUID getOrganizerIdFromAuth(Authentication authentication) {
        if (authentication == null) return null;
        if (authentication.getPrincipal() instanceof Organizer) {
            return ((Organizer) authentication.getPrincipal()).getOrganizerId();
        }
        if (authentication.getPrincipal() instanceof OrganizerEmployee) {
            OrganizerEmployee emp = (OrganizerEmployee) authentication.getPrincipal();
            return emp.getOrganizer() != null ? emp.getOrganizer().getOrganizerId() : null;
        }
        String email = authentication.getName();
        Optional<Organizer> orgOpt = organizerRepository.findByEmail(email);
        if (orgOpt.isPresent()) {
            return orgOpt.get().getOrganizerId();
        }
        Optional<OrganizerEmployee> empOpt = employeeRepository.findByEmail(email);
        if (empOpt.isPresent() && empOpt.get().getOrganizer() != null) {
            return empOpt.get().getOrganizer().getOrganizerId();
        }
        return null;
    }
}
