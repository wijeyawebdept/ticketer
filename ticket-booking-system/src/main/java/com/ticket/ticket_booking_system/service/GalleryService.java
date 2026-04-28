package com.ticket.ticket_booking_system.service;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import com.ticket.ticket_booking_system.dto.request.GalleryCreateRequest;
import com.ticket.ticket_booking_system.dto.response.GalleryResponse;

public interface GalleryService {
    GalleryResponse createGalleryImage(GalleryCreateRequest request, MultipartFile imageFile);
    GalleryResponse updateGalleryImage(UUID galleryId, GalleryCreateRequest request, MultipartFile imageFile);
    List<GalleryResponse> getAllActiveGalleryImages();
    Page<GalleryResponse> getAllGalleryImages(Pageable pageable);
    GalleryResponse getGalleryImageById(UUID galleryId);
    void deleteGalleryImage(UUID galleryId);
    GalleryResponse toggleActiveStatus(UUID galleryId);
    void reorderGalleryImages(List<UUID> galleryIds);
}
