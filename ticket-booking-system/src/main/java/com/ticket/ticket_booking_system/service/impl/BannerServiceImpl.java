package com.ticket.ticket_booking_system.service.impl;

import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.ticket.ticket_booking_system.dto.request.BannerCreateRequest;
import com.ticket.ticket_booking_system.dto.response.BannerResponse;
import com.ticket.ticket_booking_system.entity.Banner;
import com.ticket.ticket_booking_system.entity.Banner.BannerStatus;
import com.ticket.ticket_booking_system.repository.BannerRepository;
import com.ticket.ticket_booking_system.service.BannerService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class BannerServiceImpl implements BannerService {

    private final BannerRepository bannerRepository;
    private static final long MAX_FILE_SIZE = 5_242_880; // 5MB

    @Override
    public BannerResponse createBanner(BannerCreateRequest request, MultipartFile imageFile) {
        try {
            if (request == null) {
                throw new RuntimeException("Banner request is required");
            }
            
            validateImageFile(imageFile);

            byte[] imageData = imageFile.getBytes();
            
            Integer displayOrder = request.getDisplayOrder() != null ? request.getDisplayOrder() : 0;

            Banner banner = Banner.builder()
                    .title(request.getTitle())
                    .description(request.getDescription())
                    .imageData(imageData)
                    .imageFileName(imageFile.getOriginalFilename())
                    .imageContentType(imageFile.getContentType())
                    .imageSize(imageFile.getSize())
                    .displayOrder(displayOrder)
                    .status(BannerStatus.ACTIVE)
                    .build();

            banner = bannerRepository.save(banner);
            log.info("Banner created: {}", banner.getBannerId());

            return convertToResponse(banner);
        } catch (Exception e) {
            log.error("Error creating banner", e);
            throw new RuntimeException("Failed to create banner: " + e.getMessage());
        }
    }

    @Override
    public BannerResponse updateBanner(UUID bannerId, BannerCreateRequest request, MultipartFile imageFile) {
        try {
            Banner banner = bannerRepository.findById(bannerId)
                    .orElseThrow(() -> new RuntimeException("Banner not found"));

            if (request.getTitle() != null) {
                banner.setTitle(request.getTitle());
            }
            if (request.getDescription() != null) {
                banner.setDescription(request.getDescription());
            }
            if (request.getDisplayOrder() != null) {
                banner.setDisplayOrder(request.getDisplayOrder());
            }

            if (imageFile != null && !imageFile.isEmpty()) {
                validateImageFile(imageFile);
                banner.setImageData(imageFile.getBytes());
                banner.setImageFileName(imageFile.getOriginalFilename());
                banner.setImageContentType(imageFile.getContentType());
                banner.setImageSize(imageFile.getSize());
            }

            banner = bannerRepository.save(banner);
            log.info("Banner updated: {}", bannerId);

            return convertToResponse(banner);
        } catch (Exception e) {
            log.error("Error updating banner", e);
            throw new RuntimeException("Failed to update banner: " + e.getMessage());
        }
    }

    @Override
    public List<BannerResponse> getAllActiveBanners() {
        // Use optimized query that excludes large imageData LOB to prevent OOM/response size issues
        return bannerRepository.findAllActiveBannersForPublic()
                .stream()
                .map(item -> BannerResponse.builder()
                        .bannerId(item.getBannerId())
                        .title(item.getTitle())
                        .description(item.getDescription())
                        .imageBase64(null) // Don't include full image data for list endpoints
                        .imageFileName(item.getImageFileName())
                        .imageContentType(item.getImageContentType())
                        .imageSize(item.getImageSize())
                        .displayOrder(item.getDisplayOrder())
                        .status(item.getStatus())
                        .createdAt(item.getCreatedAt())
                        .updatedAt(item.getUpdatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public Page<BannerResponse> getAllBanners(Pageable pageable) {
        // Use optimized query that excludes large imageData LOB to prevent OOM/response size issues
        return bannerRepository.findAllBannersForList(pageable)
                .map(item -> BannerResponse.builder()
                        .bannerId(item.getBannerId())
                        .title(item.getTitle())
                        .description(item.getDescription())
                        .imageBase64(null) // Don't include full image data for list endpoints
                        .imageFileName(item.getImageFileName())
                        .imageContentType(item.getImageContentType())
                        .imageSize(item.getImageSize())
                        .displayOrder(item.getDisplayOrder())
                        .status(item.getStatus())
                        .createdAt(item.getCreatedAt())
                        .updatedAt(item.getUpdatedAt())
                        .build());
    }

    @Override
    public Page<BannerResponse> getBannersByStatus(BannerStatus status, Pageable pageable) {
        // Use optimized query that excludes large imageData LOB to prevent OOM/response size issues
        return bannerRepository.findByStatusForList(status, pageable)
                .map(item -> BannerResponse.builder()
                        .bannerId(item.getBannerId())
                        .title(item.getTitle())
                        .description(item.getDescription())
                        .imageBase64(null) // Don't include full image data for list endpoints
                        .imageFileName(item.getImageFileName())
                        .imageContentType(item.getImageContentType())
                        .imageSize(item.getImageSize())
                        .displayOrder(item.getDisplayOrder())
                        .status(item.getStatus())
                        .createdAt(item.getCreatedAt())
                        .updatedAt(item.getUpdatedAt())
                        .build());
    }

    @Override
    public BannerResponse getBannerById(UUID bannerId) {
        Banner banner = bannerRepository.findById(bannerId)
                .orElseThrow(() -> new RuntimeException("Banner not found with id: " + bannerId));
        return convertToResponse(banner);
    }

    @Override
    public void deleteBanner(UUID bannerId) {
        if (!bannerRepository.existsById(bannerId)) {
            throw new RuntimeException("Banner not found");
        }
        bannerRepository.deleteById(bannerId);
        log.info("Banner deleted: {}", bannerId);
    }

    @Override
    public BannerResponse updateBannerStatus(UUID bannerId, BannerStatus status) {
        Banner banner = bannerRepository.findById(bannerId)
                .orElseThrow(() -> new RuntimeException("Banner not found"));

        banner.setStatus(status);
        banner = bannerRepository.save(banner);
        log.info("Banner status updated: {}, status: {}", bannerId, status);

        return convertToResponse(banner);
    }

    @Override
    public void reorderBanners(List<UUID> bannerIds) {
        for (int i = 0; i < bannerIds.size(); i++) {
            Banner banner = bannerRepository.findById(bannerIds.get(i))
                    .orElseThrow(() -> new RuntimeException("Banner not found"));
            banner.setDisplayOrder(i);
            bannerRepository.save(banner);
        }
        log.info("Banners reordered");
    }

    private BannerResponse convertToResponse(Banner banner) {
        String imageBase64 = banner.getImageData() != null 
            ? "data:" + banner.getImageContentType() + ";base64," + Base64.getEncoder().encodeToString(banner.getImageData())
            : null;

        return BannerResponse.builder()
                .bannerId(banner.getBannerId())
                .title(banner.getTitle())
                .description(banner.getDescription())
                .imageBase64(imageBase64)
                .imageFileName(banner.getImageFileName())
                .imageContentType(banner.getImageContentType())
                .imageSize(banner.getImageSize())
                .displayOrder(banner.getDisplayOrder())
                .status(banner.getStatus())
                .createdAt(banner.getCreatedAt())
                .updatedAt(banner.getUpdatedAt())
                .build();
    }

    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Image file is required");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException("Image file size exceeds 5MB limit");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new RuntimeException("File must be a valid image");
        }
    }
}
