package com.ticket.ticket_booking_system.controller.admin;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.ticket.ticket_booking_system.dto.request.GalleryCreateRequest;
import com.ticket.ticket_booking_system.dto.response.GalleryResponse;
import com.ticket.ticket_booking_system.service.GalleryService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/admin/gallery")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
public class GalleryAdminController {

    private final GalleryService galleryService;

    @PostMapping
    public ResponseEntity<GalleryResponse> createGalleryImage(
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "displayOrder", required = false) Integer displayOrder,
            @RequestPart("imageFile") MultipartFile imageFile) {
        log.info("Creating new gallery image: {}", title);
        GalleryCreateRequest request = GalleryCreateRequest.builder()
                .title(title)
                .description(description)
                .category(category)
                .displayOrder(displayOrder)
                .build();
        GalleryResponse response = galleryService.createGalleryImage(request, imageFile);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{galleryId}")
    public ResponseEntity<GalleryResponse> updateGalleryImage(
            @PathVariable UUID galleryId,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "displayOrder", required = false) Integer displayOrder,
            @RequestPart(value = "imageFile", required = false) MultipartFile imageFile) {
        log.info("Updating gallery image: {}", galleryId);
        GalleryCreateRequest request = GalleryCreateRequest.builder()
                .title(title)
                .description(description)
                .category(category)
                .displayOrder(displayOrder)
                .build();
        GalleryResponse response = galleryService.updateGalleryImage(galleryId, request, imageFile);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/all")
    public ResponseEntity<Page<GalleryResponse>> getAllGalleryImages(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        log.info("Fetching all gallery images - page: {}, size: {}", page, size);
        Pageable pageable = PageRequest.of(page, size);
        Page<GalleryResponse> images = galleryService.getAllGalleryImages(pageable);
        return ResponseEntity.ok(images);
    }

    @GetMapping("/{galleryId}")
    public ResponseEntity<GalleryResponse> getGalleryImageById(@PathVariable UUID galleryId) {
        log.info("Fetching gallery image: {}", galleryId);
        GalleryResponse image = galleryService.getGalleryImageById(galleryId);
        return ResponseEntity.ok(image);
    }

    @DeleteMapping("/{galleryId}")
    public ResponseEntity<Void> deleteGalleryImage(@PathVariable UUID galleryId) {
        log.info("Deleting gallery image: {}", galleryId);
        galleryService.deleteGalleryImage(galleryId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{galleryId}/toggle-status")
    public ResponseEntity<GalleryResponse> toggleActiveStatus(@PathVariable UUID galleryId) {
        log.info("Toggling active status for gallery image: {}", galleryId);
        GalleryResponse response = galleryService.toggleActiveStatus(galleryId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reorder")
    public ResponseEntity<Void> reorderGalleryImages(@RequestBody List<UUID> galleryIds) {
        log.info("Reordering gallery images");
        galleryService.reorderGalleryImages(galleryIds);
        return ResponseEntity.ok().build();
    }
}
