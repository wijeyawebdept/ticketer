package com.ticket.ticket_booking_system.mail;

import jakarta.mail.MessagingException;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class MailController {

    private final MailService mailService;

    @Value("${app.mail.fromEmail:noreply@dailymirror.lk}")
    private String fromEmail;

    @Value("${app.mail.fromName:Website}")
    private String fromName;

    @Value("${app.mail.toEmail:ishanf@wijeya.lk}")
    private String toEmail;

    public MailController(MailService mailService) {
        this.mailService = mailService;
    }

    @PostMapping("/contact")
    public ResponseEntity<Void> sendContact(@Valid @RequestBody ContactEmailRequest req) throws MessagingException {
        String subject = "New contact message from " + req.name();

        String html = """
                <h3>New message</h3>
                <p><b>Name:</b> %s</p>
                <p><b>Email:</b> %s</p>
                <p><b>Message:</b><br/>%s</p>
                """.formatted(escape(req.name()), escape(req.email()), escape(req.message()).replace("\n", "<br/>"));

        mailService.sendHtml(fromEmail, fromName, toEmail, subject, html);
        return ResponseEntity.ok().build();
    }

    private static String escape(String s) {
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#x27;");
    }
}