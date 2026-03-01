package com.ticket.ticket_booking_system.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ContactEmailRequest(
        @NotBlank String name,
        @Email @NotBlank String email,
        @NotBlank String message
) {}
