package com.ticket.ticket_booking_system.mail;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ContactEmailRequest(
        @NotBlank String name,
        @Email @NotBlank String email,
        @NotBlank String message
) {}