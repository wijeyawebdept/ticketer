package com.ticket.ticket_booking_system.controller.publics;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.response.GalleryResponse;
import com.ticket.ticket_booking_system.service.GalleryService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/public/gallery")
@RequiredArgsConstructor
@Slf4j
public class GalleryPublicController {

    private final GalleryService galleryService;

    @GetMapping("/active")
    public ResponseEntity<List<GalleryResponse>> getAllActiveGalleryImages() {
        log.info("Fetching all active gallery images for public view");
        List<GalleryResponse> images = galleryService.getAllActiveGalleryImages();
        return ResponseEntity.ok(images);
    }
}
