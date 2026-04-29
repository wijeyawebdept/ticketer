package com.ticket.ticket_booking_system.service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Async;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.ticket.ticket_booking_system.entity.Booking;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.entity.TicketCategory;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${app.mail.fromEmail:noreply@ticketer.lk}")
    private String fromEmail;

    @Value("${app.mail.fromName:Ticketer.lk}")
    private String fromName;

    @Value("${app.mail.toEmail:ishanf@wijeya.lk}")
    private String contactRecipient;

    @Value("${app.frontend.base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    @Value("${app.backend.base-url:http://localhost:8081}")
    private String backendBaseUrl;

    public EmailService(JavaMailSender mailSender, TemplateEngine templateEngine) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
    }

    public void sendHtml(String toEmail, String subject, String htmlBody) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper =
                new MimeMessageHelper(message, MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED, "UTF-8");

        try {
            helper.setFrom(fromEmail, fromName);
        } catch (java.io.UnsupportedEncodingException e) {
            throw new MessagingException("Invalid From name encoding", e);
        }

        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(htmlBody, true);

        mailSender.send(message);
    }

    public void sendBookingConfirmationEmail(Booking booking, String customerEmail) {
        try {
            // Build seat details string
            String seatDetails = booking.getBookingSeats().stream()
                    .sorted((a, b) -> {
                        // Sort shared-area tickets last, regular seats first
                        if (Boolean.TRUE.equals(a.getIsSharedAreaTicket()) && !Boolean.TRUE.equals(b.getIsSharedAreaTicket())) return 1;
                        if (!Boolean.TRUE.equals(a.getIsSharedAreaTicket()) && Boolean.TRUE.equals(b.getIsSharedAreaTicket())) return -1;
                        return 0;
                    })
                    .map(bs -> {
                        if (Boolean.TRUE.equals(bs.getIsSharedAreaTicket())) {
                            return "Shared Area #" + bs.getSharedAreaNumber()
                                    + " - Ticket: " + bs.getTicketCode();
                        }
                        String seatLabel = bs.getVenueSeatId() != null ? bs.getVenueSeatId() : "Seat";
                        return seatLabel + " - Ticket: " + bs.getTicketCode();
                    })
                    .collect(Collectors.joining("\n"));

            // Resolve event date & time from schedule, fall back gracefully
            String eventDate = "N/A";
            String eventTime = "N/A";
            if (booking.getEventSchedule() != null) {
                if (booking.getEventSchedule().getScheduleDate() != null) {
                    eventDate = booking.getEventSchedule().getScheduleDate()
                            .format(DateTimeFormatter.ofPattern("dd MMMM yyyy"));
                }
                if (booking.getEventSchedule().getStartTime() != null) {
                    eventTime = booking.getEventSchedule().getStartTime()
                            .format(DateTimeFormatter.ofPattern("hh:mm a"));
                }
            }

            // Resolve venue name
            String venueName = "N/A";
            if (booking.getEvent() != null) {
                venueName = booking.getEvent().getVenueName() != null
                        ? booking.getEvent().getVenueName()
                        : (booking.getEvent().getVenue() != null ? booking.getEvent().getVenue().getName() : "N/A");
            }

            // Build Thymeleaf context
            Context ctx = new Context();
            ctx.setVariable("bookingReference", booking.getBookingReference());
            ctx.setVariable("eventName", booking.getEvent() != null ? booking.getEvent().getName() : "N/A");
            ctx.setVariable("eventDate", eventDate);
            ctx.setVariable("eventTime", eventTime);
            ctx.setVariable("venueName", venueName);
            ctx.setVariable("ticketCount", booking.getBookingSeats().size());
            ctx.setVariable("seatDetails", seatDetails);
            ctx.setVariable("currency", "LKR");
            ctx.setVariable("totalAmount", booking.getTotalAmount());
            // Payment receipt fields — null here so the receipt section is hidden
            ctx.setVariable("transactionId", null);
            ctx.setVariable("paymentMethod", null);
            ctx.setVariable("paymentDate", null);
            ctx.setVariable("qrCodeBase64", null);

            String htmlBody = templateEngine.process("emails/booking-confirmation", ctx);
            String subject = "Booking Confirmed - " + booking.getBookingReference();

            sendHtml(customerEmail, subject, htmlBody);
            log.info("Booking confirmation email sent to: {}", customerEmail);
        } catch (Exception e) {
            log.error("Failed to send booking confirmation email to {}: {}", customerEmail, e.getMessage());
        }
    }

    /**
     * Send booking confirmation email WITH payment receipt details.
     * Called immediately after a successful payment gateway response.
     */
    public void sendBookingConfirmationEmail(Booking booking, String customerEmail,
            String transactionId, String paymentMethod) {
        try {
            String seatDetails = booking.getBookingSeats().stream()
                    .sorted((a, b) -> {
                        if (Boolean.TRUE.equals(a.getIsSharedAreaTicket()) && !Boolean.TRUE.equals(b.getIsSharedAreaTicket())) return 1;
                        if (!Boolean.TRUE.equals(a.getIsSharedAreaTicket()) && Boolean.TRUE.equals(b.getIsSharedAreaTicket())) return -1;
                        return 0;
                    })
                    .map(bs -> {
                        if (Boolean.TRUE.equals(bs.getIsSharedAreaTicket())) {
                            return "Shared Area #" + bs.getSharedAreaNumber()
                                    + " - Ticket: " + bs.getTicketCode();
                        }
                        String seatLabel = bs.getVenueSeatId() != null ? bs.getVenueSeatId() : "Seat";
                        return seatLabel + " - Ticket: " + bs.getTicketCode();
                    })
                    .collect(Collectors.joining("\n"));

            String eventDate = "N/A";
            String eventTime = "N/A";
            if (booking.getEventSchedule() != null) {
                if (booking.getEventSchedule().getScheduleDate() != null) {
                    eventDate = booking.getEventSchedule().getScheduleDate()
                            .format(DateTimeFormatter.ofPattern("dd MMMM yyyy"));
                }
                if (booking.getEventSchedule().getStartTime() != null) {
                    eventTime = booking.getEventSchedule().getStartTime()
                            .format(DateTimeFormatter.ofPattern("hh:mm a"));
                }
            }

            String venueName = "N/A";
            if (booking.getEvent() != null) {
                venueName = booking.getEvent().getVenueName() != null
                        ? booking.getEvent().getVenueName()
                        : (booking.getEvent().getVenue() != null ? booking.getEvent().getVenue().getName() : "N/A");
            }

            String paymentDate = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMMM yyyy, hh:mm a"));

            // Build QR code content
            String eventNameForQr  = booking.getEvent() != null ? booking.getEvent().getName() : "N/A";
            String qrContent = "TICKETER\n"
                    + "REF: " + booking.getBookingReference() + "\n"
                    + "EVENT: " + eventNameForQr + "\n"
                    + "DATE: " + ("N/A".equals(eventDate) ? "N/A" : eventDate) + "\n"
                    + "TIME: " + ("N/A".equals(eventTime) ? "N/A" : eventTime) + "\n"
                    + "VENUE: " + venueName + "\n"
                    + "TICKETS: " + booking.getBookingSeats().size() + "\n"
                    + "AMOUNT: LKR " + booking.getTotalAmount() + "\n"
                    + "TXN: " + transactionId + "\n"
                    + "PAID: " + paymentDate;
            String qrCodeBase64 = generateQrCodeBase64(qrContent);

            Context ctx = new Context();
            ctx.setVariable("bookingReference", booking.getBookingReference());
            ctx.setVariable("eventName", booking.getEvent() != null ? booking.getEvent().getName() : "N/A");
            ctx.setVariable("eventDate", eventDate);
            ctx.setVariable("eventTime", eventTime);
            ctx.setVariable("venueName", venueName);
            ctx.setVariable("ticketCount", booking.getBookingSeats().size());
            ctx.setVariable("seatDetails", seatDetails);
            ctx.setVariable("currency", "LKR");
            ctx.setVariable("totalAmount", booking.getTotalAmount());
            ctx.setVariable("transactionId", transactionId);
            ctx.setVariable("paymentMethod", paymentMethod);
            ctx.setVariable("paymentDate", paymentDate);
            ctx.setVariable("qrCodeBase64", qrCodeBase64);

            String htmlBody = templateEngine.process("emails/booking-confirmation", ctx);
            String subject = "Payment Confirmed - " + booking.getBookingReference();

            sendHtml(customerEmail, subject, htmlBody);
            log.info("Payment confirmation + booking email sent to: {}", customerEmail);
        } catch (Exception e) {
            log.error("Failed to send payment confirmation email to {}: {}", customerEmail, e.getMessage());
        }
    }

    // ── QR Code helper ────────────────────────────────────────────────────────

    private String generateQrCodeBase64(String content) {
        try {
            BitMatrix matrix = new MultiFormatWriter().encode(content, BarcodeFormat.QR_CODE, 280, 280);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            return Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (Exception e) {
            log.warn("QR code generation failed: {}", e.getMessage());
            return null;
        }
    }

    public void sendPasswordResetEmail(String customerEmail, String firstName, String resetLink) {
        try {
            Context ctx = new Context();
            ctx.setVariable("firstName", firstName);
            ctx.setVariable("resetLink", resetLink);
            ctx.setVariable("expiryHours", 24);

            String htmlBody = templateEngine.process("emails/forgot-password", ctx);
            String subject = "Reset Your Ticketer Password";

            sendHtml(customerEmail, subject, htmlBody);
            log.info("Password reset email sent to: {}", customerEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset email to {}: {}", customerEmail, e.getMessage());
        }
    }

    public void sendPaymentFailureEmail(String customerEmail, String eventName, BigDecimal amount, String errorMessage) {
        try {
            Context ctx = new Context();
            ctx.setVariable("eventName", eventName);
            ctx.setVariable("currency", "LKR");
            ctx.setVariable("amount", amount);
            ctx.setVariable("errorMessage", errorMessage != null ? errorMessage : "Unknown error. Please try again.");

            String htmlBody = templateEngine.process("emails/payment-failure", ctx);
            String subject = "Payment Failed - " + eventName;

            sendHtml(customerEmail, subject, htmlBody);
            log.info("Payment failure email sent to: {}", customerEmail);
        } catch (Exception e) {
            log.error("Failed to send payment failure email to {}: {}", customerEmail, e.getMessage());
        }
    }

    public void sendRefundConfirmationEmail(Booking booking, String customerEmail, BigDecimal refundAmount, String reason) {
        try {
            String eventName = booking.getEvent() != null ? booking.getEvent().getName() : "N/A";

            Context ctx = new Context();
            ctx.setVariable("bookingReference", booking.getBookingReference());
            ctx.setVariable("eventName", eventName);
            ctx.setVariable("currency", "LKR");
            ctx.setVariable("refundAmount", refundAmount);
            ctx.setVariable("originalAmount", booking.getTotalAmount());
            ctx.setVariable("reason", reason != null ? reason : "N/A");

            String htmlBody = templateEngine.process("emails/refund-confirmation", ctx);
            String subject = "Refund Processed - " + booking.getBookingReference();

            sendHtml(customerEmail, subject, htmlBody);
            log.info("Refund confirmation email sent to: {}", customerEmail);
        } catch (Exception e) {
            log.error("Failed to send refund confirmation email to {}: {}", customerEmail, e.getMessage());
        }
    }

    // ── Step 4: Welcome email ──────────────────────────────────────────────────

    public void sendWelcomeEmail(String customerEmail, String firstName) {
        try {
            Context ctx = new Context();
            ctx.setVariable("firstName", firstName);
            ctx.setVariable("browseUrl", frontendBaseUrl + "/events");

            String htmlBody = templateEngine.process("emails/welcome", ctx);
            String subject = "Welcome to Ticketer!";

            sendHtml(customerEmail, subject, htmlBody);
            log.info("Welcome email sent to: {}", customerEmail);
        } catch (Exception e) {
            log.error("Failed to send welcome email to {}: {}", customerEmail, e.getMessage());
        }
    }

    // ── Step 5: Booking cancellation email ────────────────────────────────────

    public void sendBookingCancellationEmail(Booking booking, String customerEmail) {
        try {
            String firstName = (booking.getUser() != null) ? booking.getUser().getFirstName() : "Customer";
            String eventName = (booking.getEvent() != null) ? booking.getEvent().getName() : "N/A";

            Context ctx = new Context();
            ctx.setVariable("firstName", firstName);
            ctx.setVariable("bookingReference", booking.getBookingReference());
            ctx.setVariable("eventName", eventName);
            ctx.setVariable("cancellationReason", booking.getCancellationReason());

            String htmlBody = templateEngine.process("emails/booking-cancellation", ctx);
            String subject = "Your Booking Has Been Cancelled - " + booking.getBookingReference();

            sendHtml(customerEmail, subject, htmlBody);
            log.info("Booking cancellation email sent to: {}", customerEmail);
        } catch (Exception e) {
            log.error("Failed to send booking cancellation email to {}: {}", customerEmail, e.getMessage());
        }
    }
    // ── Email verification code ───────────────────────────────────────────────

    public void sendEmailVerificationCode(String customerEmail, String firstName, String code) {
        try {
            Context ctx = new Context();
            ctx.setVariable("firstName", firstName);
            ctx.setVariable("code", code);

            String htmlBody = templateEngine.process("emails/email-verification", ctx);
            String subject = "Your Ticketer Verification Code: " + code;

            sendHtml(customerEmail, subject, htmlBody);
            log.info("Email verification code sent to: {}", customerEmail);
        } catch (Exception e) {
            log.error("Failed to send email verification code to {}: {}", customerEmail, e.getMessage());
        }
    }
    // ── Login notification email ─────────────────────────────────────────────

    public void sendLoginNotificationEmail(String customerEmail, String firstName) {
        try {
            String loginTime = LocalDateTime.now()
                    .format(DateTimeFormatter.ofPattern("dd MMMM yyyy, hh:mm a"));

            Context ctx = new Context();
            ctx.setVariable("firstName", firstName);
            ctx.setVariable("email", customerEmail);
            ctx.setVariable("loginTime", loginTime);
            ctx.setVariable("changePasswordUrl", frontendBaseUrl + "/change-password");

            String htmlBody = templateEngine.process("emails/login-notification", ctx);
            String subject = "New Login to Your Ticketer Account";

            sendHtml(customerEmail, subject, htmlBody);
            log.info("Login notification email sent to: {}", customerEmail);
        } catch (Exception e) {
            log.error("Failed to send login notification email to {}: {}", customerEmail, e.getMessage());
        }
    }

    // ── Step 6: Contact form email (migrated from MailService) ────────────────

    public void sendContactEmail(String senderName, String senderEmail, String message) {
        try {
            String subject = "New contact message from " + senderName;
            String htmlBody = "<h3>New message</h3>"
                    + "<p><b>Name:</b> " + escapeHtml(senderName) + "</p>"
                    + "<p><b>Email:</b> " + escapeHtml(senderEmail) + "</p>"
                    + "<p><b>Message:</b><br/>" + escapeHtml(message).replace("\n", "<br/>") + "</p>";

            sendHtml(contactRecipient, subject, htmlBody);
            log.info("Contact email forwarded from: {}", senderEmail);
        } catch (Exception e) {
            log.error("Failed to forward contact email from {}: {}", senderEmail, e.getMessage());
        }
    }

    // ── Event assignment email (organizer/admin assigns employee to event) ──────

    public void sendEventAssignmentEmail(OrganizerEmployee employee, Event event,
                                         Organizer assignedBy,
                                         String roleDescription, String notes) {
        try {
            Context ctx = new Context();
            ctx.setVariable("employeeFirstName", employee.getFirstName());
            ctx.setVariable("employeeEmail",     employee.getEmail());
            ctx.setVariable("eventName",         event.getName());
            ctx.setVariable("assignedByName",    assignedBy.getFirstName() + " " + assignedBy.getLastName());
            ctx.setVariable("roleDescription",   roleDescription);
            ctx.setVariable("notes",             notes);
            ctx.setVariable("loginUrl",          frontendBaseUrl + "/login");

            String html    = templateEngine.process("emails/event-assignment", ctx);
            String subject = "Event Assignment: " + event.getName();
            sendHtml(employee.getEmail(), subject, html);
            log.info("Event assignment email sent to: {}", employee.getEmail());
        } catch (Exception e) {
            log.error("Failed to send event assignment email to {}: {}", employee.getEmail(), e.getMessage());
        }
    }

    // ── Organizer event assignment email (admin assigns an event to an organizer) ──

    public void sendOrganizerEventAssignmentEmail(Organizer organizer, Event event) {
        try {
            Context ctx = new Context();
            ctx.setVariable("organizerFirstName", organizer.getFirstName());
            ctx.setVariable("organizerEmail",     organizer.getEmail());
            ctx.setVariable("eventName",          event.getName());
            ctx.setVariable("eventId",            event.getEventId());
            ctx.setVariable("loginUrl",           frontendBaseUrl + "/organizer/login");

            String html    = templateEngine.process("emails/organizer-event-assignment", ctx);
            String subject = "New Event Assigned to You: " + event.getName();
            sendHtml(organizer.getEmail(), subject, html);
            log.info("Organizer event assignment email sent to: {}", organizer.getEmail());
        } catch (Exception e) {
            log.error("Failed to send organizer event assignment email to {}: {}", organizer.getEmail(), e.getMessage());
        }
    }

    @Async
    public void sendDealNotificationEmail(String customerEmail, String firstName, String eventName, TicketCategory tc) {
        try {
            Context ctx = new Context();
            ctx.setVariable("firstName", firstName);
            ctx.setVariable("eventName", eventName);
            ctx.setVariable("categoryName", tc.getCategoryName());
            ctx.setVariable("dealLabel", tc.getDealLabel());
            
            String dealDetails;
            if ("BUY_X_GET_Y_FREE".equals(tc.getDealType())) {
                dealDetails = "Buy " + tc.getDealBuyQuantity() + " Get " + tc.getDealFreeQuantity() + " FREE!";
            } else {
                dealDetails = tc.getDealDiscountPercentage() + "% DISCOUNT!";
            }
            ctx.setVariable("dealDetails", dealDetails);
            ctx.setVariable("price", tc.getPrice());
            ctx.setVariable("browseUrl", frontendBaseUrl + "/events/" + tc.getEvent().getEventId());

            String htmlBody = templateEngine.process("emails/deal-notification", ctx);
            String subject = "Exclusive Deal: " + tc.getDealLabel() + " for " + eventName;

            sendHtml(customerEmail, subject, htmlBody);
            log.info("Deal notification email sent to: {}", customerEmail);
        } catch (Exception e) {
            log.error("Failed to send deal notification email to {}: {}", customerEmail, e.getMessage());
        }
    }

    @Async
    public void sendNewEventsSummaryEmail(String customerEmail, String firstName, java.util.List<Event> newEvents) {
        try {
            Context ctx = new Context();
            ctx.setVariable("firstName", firstName);
            ctx.setVariable("events", newEvents);
            ctx.setVariable("browseUrl", frontendBaseUrl + "/events");
            ctx.setVariable("backendBaseUrl", backendBaseUrl);

            String htmlBody = templateEngine.process("emails/new-events-summary", ctx);
            String subject = "New Events on Ticketer - Don't Miss Out!";

            sendHtml(customerEmail, subject, htmlBody);
            log.info("New events summary email sent to: {}", customerEmail);
        } catch (Exception e) {
            log.error("Failed to send new events summary email to {}: {}", customerEmail, e.getMessage());
        }
    }

    private static String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#x27;");
    }
}