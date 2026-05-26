package com.ticket.ticket_booking_system.service.impl;

import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.ticket.ticket_booking_system.dto.request.GalleryCreateRequest;
import com.ticket.ticket_booking_system.dto.response.GalleryResponse;
import com.ticket.ticket_booking_system.entity.GalleryImage;
import com.ticket.ticket_booking_system.repository.GalleryImageRepository;
import com.ticket.ticket_booking_system.service.GalleryService;
import com.ticket.ticket_booking_system.service.AdminAuditService;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
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
public class GalleryServiceImpl implements GalleryService {

    private final GalleryImageRepository galleryImageRepository;
    private final AdminAuditService auditService;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final OrganizerRepository organizerRepository;
    private static final long MAX_FILE_SIZE = 5_242_880; // 5MB

    @Override
    public GalleryResponse createGalleryImage(GalleryCreateRequest request, MultipartFile imageFile) {
        try {
            if (request == null) {
                throw new RuntimeException("Gallery request is required");
            }
            
            validateImageFile(imageFile);

            byte[] imageData = imageFile.getBytes();
            Integer displayOrder = request.getDisplayOrder() != null ? request.getDisplayOrder() : 0;
            String category = request.getCategory() != null ? request.getCategory().trim() : "Uncategorized";

            GalleryImage galleryImage = GalleryImage.builder()
                    .title(request.getTitle())
                    .description(request.getDescription())
                    .category(category)
                    .imageData(imageData)
                    .imageFileName(imageFile.getOriginalFilename())
                    .imageContentType(imageFile.getContentType())
                    .imageSize(imageFile.getSize())
                    .displayOrder(displayOrder)
                    .active(true)
                    .build();

            galleryImage = galleryImageRepository.save(galleryImage);
            log.info("Gallery image created: {}", galleryImage.getGalleryId());
            auditService.logAction(getCurrentUserId(), "CREATE_GALLERY_IMAGE", "GALLERY", galleryImage.getGalleryId(), "Created gallery image: " + galleryImage.getTitle());

            return convertToResponse(galleryImage);
        } catch (Exception e) {
            log.error("Error creating gallery image", e);
            throw new RuntimeException("Failed to create gallery image: " + e.getMessage());
        }
    }

    @Override
    public GalleryResponse updateGalleryImage(UUID galleryId, GalleryCreateRequest request, MultipartFile imageFile) {
        try {
            GalleryImage galleryImage = galleryImageRepository.findById(galleryId)
                    .orElseThrow(() -> new RuntimeException("Gallery image not found"));

            if (request.getTitle() != null) {
                galleryImage.setTitle(request.getTitle());
            }
            if (request.getDescription() != null) {
                galleryImage.setDescription(request.getDescription());
            }
            if (request.getCategory() != null) {
                galleryImage.setCategory(request.getCategory().trim());
            }
            if (request.getDisplayOrder() != null) {
                galleryImage.setDisplayOrder(request.getDisplayOrder());
            }

            if (imageFile != null && !imageFile.isEmpty()) {
                validateImageFile(imageFile);
                galleryImage.setImageData(imageFile.getBytes());
                galleryImage.setImageFileName(imageFile.getOriginalFilename());
                galleryImage.setImageContentType(imageFile.getContentType());
                galleryImage.setImageSize(imageFile.getSize());
            }

            galleryImage = galleryImageRepository.save(galleryImage);
            log.info("Gallery image updated: {}", galleryId);
            auditService.logAction(getCurrentUserId(), "UPDATE_GALLERY_IMAGE", "GALLERY", galleryImage.getGalleryId(), "Updated gallery image: " + galleryImage.getTitle());

            return convertToResponse(galleryImage);
        } catch (Exception e) {
            log.error("Error updating gallery image", e);
            throw new RuntimeException("Failed to update gallery image: " + e.getMessage());
        }
    }

    @Override
    public List<GalleryResponse> getAllActiveGalleryImages() {
        return galleryImageRepository.findAllActiveGalleryImages()
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public Page<GalleryResponse> getAllGalleryImages(Pageable pageable) {
        return galleryImageRepository.findAllGalleryImagesForList(pageable)
                .map(item -> GalleryResponse.builder()
                        .galleryId(item.getGalleryId())
                        .title(item.getTitle())
                        .description(item.getDescription())
                        .category(item.getCategory())
                        .imageBase64(null) // Omit base64 data for admin list view to save memory
                        .imageFileName(item.getImageFileName())
                        .imageContentType(item.getImageContentType())
                        .imageSize(item.getImageSize())
                        .displayOrder(item.getDisplayOrder())
                        .active(item.isActive())
                        .createdAt(item.getCreatedAt())
                        .updatedAt(item.getUpdatedAt())
                        .build());
    }

    @Override
    public GalleryResponse getGalleryImageById(UUID galleryId) {
        GalleryImage galleryImage = galleryImageRepository.findById(galleryId)
                .orElseThrow(() -> new RuntimeException("Gallery image not found"));
        return convertToResponse(galleryImage);
    }

    @Override
    public void deleteGalleryImage(UUID galleryId) {
        GalleryImage galleryImage = galleryImageRepository.findById(galleryId)
                .orElseThrow(() -> new RuntimeException("Gallery image not found"));
        galleryImageRepository.delete(galleryImage);
        log.info("Gallery image deleted: {}", galleryId);
        auditService.logAction(getCurrentUserId(), "DELETE_GALLERY_IMAGE", "GALLERY", galleryId, "Deleted gallery image: " + galleryImage.getTitle());
    }

    @Override
    public GalleryResponse toggleActiveStatus(UUID galleryId) {
        GalleryImage galleryImage = galleryImageRepository.findById(galleryId)
                .orElseThrow(() -> new RuntimeException("Gallery image not found"));

        galleryImage.setActive(!galleryImage.isActive());
        galleryImage = galleryImageRepository.save(galleryImage);
        log.info("Gallery image status toggled: {}, active: {}", galleryId, galleryImage.isActive());
        auditService.logAction(getCurrentUserId(), "TOGGLE_GALLERY_IMAGE_STATUS", "GALLERY", galleryImage.getGalleryId(), "Toggled active status to " + galleryImage.isActive() + " for gallery image: " + galleryImage.getTitle());

        return convertToResponse(galleryImage);
    }

    @Override
    public void reorderGalleryImages(List<UUID> galleryIds) {
        for (int i = 0; i < galleryIds.size(); i++) {
            GalleryImage galleryImage = galleryImageRepository.findById(galleryIds.get(i))
                    .orElseThrow(() -> new RuntimeException("Gallery image not found"));
            galleryImage.setDisplayOrder(i);
            galleryImageRepository.save(galleryImage);
        }
        log.info("Gallery images reordered");
        auditService.logAction(getCurrentUserId(), "REORDER_GALLERY_IMAGES", "GALLERY", null, "Reordered gallery images: " + galleryIds);
    }

    private GalleryResponse convertToResponse(GalleryImage galleryImage) {
        String imageBase64 = galleryImage.getImageData() != null 
            ? "data:" + galleryImage.getImageContentType() + ";base64," + Base64.getEncoder().encodeToString(galleryImage.getImageData())
            : null;

        return GalleryResponse.builder()
                .galleryId(galleryImage.getGalleryId())
                .title(galleryImage.getTitle())
                .description(galleryImage.getDescription())
                .category(galleryImage.getCategory())
                .imageBase64(imageBase64)
                .imageFileName(galleryImage.getImageFileName())
                .imageContentType(galleryImage.getImageContentType())
                .imageSize(galleryImage.getImageSize())
                .displayOrder(galleryImage.getDisplayOrder())
                .active(galleryImage.isActive())
                .createdAt(galleryImage.getCreatedAt())
                .updatedAt(galleryImage.getUpdatedAt())
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
