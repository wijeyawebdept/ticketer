package com.ticket.ticket_booking_system.service;

import java.math.BigDecimal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.ticket.ticket_booking_system.entity.Booking;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.fromEmail:noreply@dailymirror.lk}")
    private String fromEmail;

    @Value("${app.mail.fromName:Website}")
    private String fromName;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
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
            String subject = "Booking Confirmed - " + booking.getBookingReference();
            String htmlBody = "<html><body>"
                    + "<h2>Booking Confirmation</h2>"
                    + "<p>Dear " + booking.getUser().getEmail() + ",</p>"
                    + "<p>Your booking has been confirmed.</p>"
                    + "<p><strong>Booking Reference:</strong> " + booking.getBookingReference() + "</p>"
                    + "<p><strong>Total Amount:</strong> " + booking.getTotalAmount() + "</p>"
                    + "<p>Thank you for your purchase!</p>"
                    + "</body></html>";
            sendHtml(customerEmail, subject, htmlBody);
            log.info("Booking confirmation email sent to: {}", customerEmail);
        } catch (Exception e) {
            log.error("Failed to send booking confirmation email to {}: {}", customerEmail, e.getMessage());
        }
    }

    public void sendPaymentFailureEmail(String customerEmail, String eventName, BigDecimal amount, String errorMessage) {
        try {
            String subject = "Payment Failed - " + eventName;
            String htmlBody = "<html><body>"
                    + "<h2>Payment Failed</h2>"
                    + "<p>Dear Customer,</p>"
                    + "<p>Unfortunately, your payment for <strong>" + eventName + "</strong> could not be processed.</p>"
                    + "<p><strong>Amount:</strong> " + amount + "</p>"
                    + "<p><strong>Reason:</strong> " + (errorMessage != null ? errorMessage : "Unknown error") + "</p>"
                    + "<p>Please try again or contact support.</p>"
                    + "</body></html>";
            sendHtml(customerEmail, subject, htmlBody);
            log.info("Payment failure email sent to: {}", customerEmail);
        } catch (Exception e) {
            log.error("Failed to send payment failure email to {}: {}", customerEmail, e.getMessage());
        }
    }

    public void sendRefundConfirmationEmail(Booking booking, String customerEmail, BigDecimal refundAmount, String reason) {
        try {
            String subject = "Refund Processed - " + booking.getBookingReference();
            String htmlBody = "<html><body>"
                    + "<h2>Refund Confirmation</h2>"
                    + "<p>Dear " + booking.getUser().getEmail() + ",</p>"
                    + "<p>Your refund has been successfully processed.</p>"
                    + "<p><strong>Booking Reference:</strong> " + booking.getBookingReference() + "</p>"
                    + "<p><strong>Refund Amount:</strong> " + refundAmount + "</p>"
                    + "<p><strong>Reason:</strong> " + (reason != null ? reason : "N/A") + "</p>"
                    + "<p>The amount will be credited back to your original payment method within 5-7 business days.</p>"
                    + "</body></html>";
            sendHtml(customerEmail, subject, htmlBody);
            log.info("Refund confirmation email sent to: {}", customerEmail);
        } catch (Exception e) {
            log.error("Failed to send refund confirmation email to {}: {}", customerEmail, e.getMessage());
        }
    }
}