package com.ticket.ticket_booking_system.mail;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.ticket.ticket_booking_system.service.EmailService;

@RestController
@RequestMapping("/api")
public class MailController {

    private final EmailService emailService;

    public MailController(EmailService emailService) {
        this.emailService = emailService;
    }

    @PostMapping("/contact")
    public ResponseEntity<Void> sendContact(@Valid @RequestBody ContactEmailRequest req) {
        emailService.sendContactEmail(req.name(), req.email(), req.message());
        return ResponseEntity.ok().build();
    }
}