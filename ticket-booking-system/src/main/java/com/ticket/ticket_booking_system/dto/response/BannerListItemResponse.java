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
public class BannerListItemResponse {
    private UUID bannerId;
    private String title;
    private String description;
    private String imageFileName;
    private String imageContentType;
    private Long imageSize;
    private Integer displayOrder;
    private BannerStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
