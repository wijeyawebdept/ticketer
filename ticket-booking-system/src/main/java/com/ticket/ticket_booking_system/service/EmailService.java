package com.ticket.ticket_booking_system.service;

import java.math.BigDecimal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import com.ticket.ticket_booking_system.entity.Booking;
import com.ticket.ticket_booking_system.entity.BookingSeat;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for sending email notifications
 * Email credentials should be configured in application.properties
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${app.email.from:noreply@ticketbooking.com}")
    private String fromEmail;

    @Value("${spring.mail.username:}")
    private String emailUsername;

    /**
     * Send booking confirmation email after successful payment
     *
     * @param booking The confirmed booking
     * @param customerEmail Customer's email address
     */
    @Async
    public void sendBookingConfirmationEmail(Booking booking, String customerEmail) {
        log.info("Sending booking confirmation email to: {}", customerEmail);

        if (!isEmailConfigured()) {
            log.warn("Email service not configured. Skipping booking confirmation email.");
            return;
        }

        try {
            // Prepare template variables
            Context context = new Context();
            context.setVariable("bookingReference", booking.getBookingReference());
            context.setVariable("eventName", booking.getEvent().getName());
            context.setVariable("eventDate", booking.getEventSchedule() != null ?
                    booking.getEventSchedule().getScheduleDate().toString() : "N/A");
            context.setVariable("eventTime", booking.getEventSchedule() != null ?
                    booking.getEventSchedule().getStartTime().toString() : "N/A");
            context.setVariable("venueName", booking.getEvent().getVenueName() != null ?
                    booking.getEvent().getVenueName() : "N/A");
            context.setVariable("totalAmount", booking.getTotalAmount());
            context.setVariable("currency", "LKR");
            context.setVariable("ticketCount", booking.getBookingSeats().size());

            // Prepare seat details
            StringBuilder seatDetails = new StringBuilder();
            for (BookingSeat bs : booking.getBookingSeats()) {
                if (bs.getIsSharedAreaTicket() != null && bs.getIsSharedAreaTicket()) {
                    seatDetails.append("Standing Area Ticket #").append(bs.getTicketCode()).append("\n");
                } else if (bs.getSeat() != null) {
                    seatDetails.append("Seat: ").append(bs.getSeat().getRowNumber())
                              .append(bs.getSeat().getSeatNumber())
                              .append(" - Ticket: ").append(bs.getTicketCode()).append("\n");
                } else if (bs.getVenueSeatId() != null) {
                    // VenueSeat booking (seat is null but venueSeatId is set)
                    seatDetails.append("Seat: ").append(bs.getVenueSeatId())
                              .append(" - Ticket: ").append(bs.getTicketCode()).append("\n");
                }
            }
            context.setVariable("seatDetails", seatDetails.toString());

            // Process template
            String htmlContent = templateEngine.process("emails/booking-confirmation", context);

            // Send email
            sendHtmlEmail(customerEmail, "Booking Confirmation - " + booking.getBookingReference(), htmlContent);

            log.info("Booking confirmation email sent successfully to: {}", customerEmail);

        } catch (Exception e) {
            log.error("Failed to send booking confirmation email to: {}", customerEmail, e);
        }
    }

    /**
     * Send refund confirmation email
     *
     * @param booking The refunded booking
     * @param customerEmail Customer's email address
     * @param refundAmount Refund amount
     * @param reason Refund reason
     */
    @Async
    public void sendRefundConfirmationEmail(Booking booking, String customerEmail,
                                            BigDecimal refundAmount, String reason) {
        log.info("Sending refund confirmation email to: {}", customerEmail);

        if (!isEmailConfigured()) {
            log.warn("Email service not configured. Skipping refund confirmation email.");
            return;
        }

        try {
            // Prepare template variables
            Context context = new Context();
            context.setVariable("bookingReference", booking.getBookingReference());
            context.setVariable("eventName", booking.getEvent().getName());
            context.setVariable("refundAmount", refundAmount);
            context.setVariable("currency", "LKR");
            context.setVariable("reason", reason);
            context.setVariable("originalAmount", booking.getTotalAmount());

            // Process template
            String htmlContent = templateEngine.process("emails/refund-confirmation", context);

            // Send email
            sendHtmlEmail(customerEmail, "Refund Processed - " + booking.getBookingReference(), htmlContent);

            log.info("Refund confirmation email sent successfully to: {}", customerEmail);

        } catch (Exception e) {
            log.error("Failed to send refund confirmation email to: {}", customerEmail, e);
        }
    }

    /**
     * Send payment failure notification email
     *
     * @param customerEmail Customer's email address
     * @param eventName Event name
     * @param amount Attempted payment amount
     * @param errorMessage Error message
     */
    @Async
    public void sendPaymentFailureEmail(String customerEmail, String eventName,
                                        BigDecimal amount, String errorMessage) {
        log.info("Sending payment failure email to: {}", customerEmail);

        if (!isEmailConfigured()) {
            log.warn("Email service not configured. Skipping payment failure email.");
            return;
        }

        try {
            // Prepare template variables
            Context context = new Context();
            context.setVariable("eventName", eventName);
            context.setVariable("amount", amount);
            context.setVariable("currency", "LKR");
            context.setVariable("errorMessage", errorMessage);

            // Process template
            String htmlContent = templateEngine.process("emails/payment-failure", context);

            // Send email
            sendHtmlEmail(customerEmail, "Payment Failed - " + eventName, htmlContent);

            log.info("Payment failure email sent successfully to: {}", customerEmail);

        } catch (Exception e) {
            log.error("Failed to send payment failure email to: {}", customerEmail, e);
        }
    }

    /**
     * Send HTML email
     *
     * @param to Recipient email
     * @param subject Email subject
     * @param htmlContent HTML content
     */
    private void sendHtmlEmail(String to, String subject, String htmlContent) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);

        mailSender.send(message);
    }

    /**
     * Check if email service is properly configured
     *
     * @return true if email credentials are configured
     */
    private boolean isEmailConfigured() {
        return emailUsername != null && !emailUsername.isEmpty() &&
               !emailUsername.equals("your-email@gmail.com");
    }
}
