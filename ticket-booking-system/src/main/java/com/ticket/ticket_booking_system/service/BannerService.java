package com.ticket.ticket_booking_system.service;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import com.ticket.ticket_booking_system.dto.request.BannerCreateRequest;
import com.ticket.ticket_booking_system.dto.response.BannerResponse;
import com.ticket.ticket_booking_system.entity.Banner.BannerStatus;

public interface BannerService {

    /**
     * Create a new banner with image upload
     */
    BannerResponse createBanner(BannerCreateRequest request, MultipartFile imageFile);

    /**
     * Update an existing banner (including image if provided)
     */
    BannerResponse updateBanner(UUID bannerId, BannerCreateRequest request, MultipartFile imageFile);

    /**
     * Get all active banners
     */
    List<BannerResponse> getAllActiveBanners();

    /**
     * Get all banners paginated
     */
    Page<BannerResponse> getAllBanners(Pageable pageable);

    /**
     * Get banners by status
     */
    Page<BannerResponse> getBannersByStatus(BannerStatus status, Pageable pageable);

    /**
     * Get a specific banner by ID
     */
    BannerResponse getBannerById(UUID bannerId);

    /**
     * Delete a banner
     */
    void deleteBanner(UUID bannerId);

    /**
     * Update banner status
     */
    BannerResponse updateBannerStatus(UUID bannerId, BannerStatus status);

    /**
     * Reorder banners
     */
    void reorderBanners(List<UUID> bannerIds);
}
