package com.ticket.ticket_booking_system.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

import com.ticket.ticket_booking_system.entity.Banner.BannerStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BannerResponse {
    private UUID bannerId;
    private String title;
    private String description;
    private String imageUrl;
    private Integer displayOrder;
    private BannerStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
