package com.ticket.ticket_booking_system.service.impl;

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
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.service.AdminAuditService;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.service.FileUploadService;
import com.ticket.ticket_booking_system.service.FileUploadService.CloudinaryUploadResult;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Organizer;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class BannerServiceImpl implements BannerService {

    private final BannerRepository bannerRepository;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final OrganizerRepository organizerRepository;
    private final FileUploadService fileUploadService;
    private final AdminAuditService auditService;
    private static final long MAX_FILE_SIZE = 5_242_880; // 5MB

    @Override
    public BannerResponse createBanner(BannerCreateRequest request, MultipartFile imageFile) {
        try {
            if (request == null) {
                throw new RuntimeException("Banner request is required");
            }
            
            validateImageFile(imageFile);

            CloudinaryUploadResult uploadResult = fileUploadService.uploadImage(imageFile);
            
            Integer displayOrder = request.getDisplayOrder() != null ? request.getDisplayOrder() : 0;

            Banner banner = Banner.builder()
                    .title(request.getTitle())
                    .description(request.getDescription())
                    .imageUrl(uploadResult.url())
                    .publicId(uploadResult.publicId())
                    .displayOrder(displayOrder)
                    .status(BannerStatus.ACTIVE)
                    .build();

            banner = bannerRepository.save(banner);
            log.info("Banner created: {}", banner.getBannerId());
            auditService.logAction(getCurrentUserId(), "CREATE_BANNER", "BANNER", banner.getBannerId(), "Created banner: " + banner.getTitle());

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
                if (banner.getPublicId() != null) {
                    fileUploadService.deleteImage(banner.getPublicId());
                }
                CloudinaryUploadResult uploadResult = fileUploadService.uploadImage(imageFile);
                banner.setImageUrl(uploadResult.url());
                banner.setPublicId(uploadResult.publicId());
            }

            banner = bannerRepository.save(banner);
            log.info("Banner updated: {}", bannerId);
            auditService.logAction(getCurrentUserId(), "UPDATE_BANNER", "BANNER", banner.getBannerId(), "Updated banner: " + banner.getTitle());

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
                        .imageUrl(item.getImageUrl())
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
                        .imageUrl(item.getImageUrl())
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
                        .imageUrl(item.getImageUrl())
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
        Banner banner = bannerRepository.findById(bannerId)
                .orElseThrow(() -> new RuntimeException("Banner not found"));
        if (banner.getPublicId() != null) {
            try {
                fileUploadService.deleteImage(banner.getPublicId());
            } catch (Exception e) {
                log.error("Failed to delete banner image from Cloudinary", e);
            }
        }
        bannerRepository.delete(banner);
        log.info("Banner deleted: {}", bannerId);
        auditService.logAction(getCurrentUserId(), "DELETE_BANNER", "BANNER", bannerId, "Deleted banner: " + banner.getTitle());
    }

    @Override
    public BannerResponse updateBannerStatus(UUID bannerId, BannerStatus status) {
        Banner banner = bannerRepository.findById(bannerId)
                .orElseThrow(() -> new RuntimeException("Banner not found"));

        banner.setStatus(status);
        banner = bannerRepository.save(banner);
        log.info("Banner status updated: {}, status: {}", bannerId, status);
        auditService.logAction(getCurrentUserId(), "TOGGLE_BANNER_STATUS", "BANNER", banner.getBannerId(), "Toggled banner status to " + status + " for banner: " + banner.getTitle());

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
        auditService.logAction(getCurrentUserId(), "REORDER_BANNERS", "BANNER", null, "Reordered banners: " + bannerIds);
    }

    private BannerResponse convertToResponse(Banner banner) {
        return BannerResponse.builder()
                .bannerId(banner.getBannerId())
                .title(banner.getTitle())
                .description(banner.getDescription())
                .imageUrl(banner.getImageUrl())
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

    private UUID getCurrentUserId() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()) {
                String email = authentication.getName();
                
                User user = userRepository.findByEmail(email).orElse(null);
                if (user != null) return user.getUserId();
                
                Admin admin = adminRepository.findByEmail(email).orElse(null);
                if (admin != null) return admin.getAdminId();
                
                Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
                if (organizer != null) return organizer.getOrganizerId();
            }
        } catch (Exception e) {
            // Ignore
        }
        return null;
    }
}
