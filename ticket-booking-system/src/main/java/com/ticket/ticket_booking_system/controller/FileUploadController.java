package com.ticket.ticket_booking_system.controller;

import java.io.IOException;
import java.util.Map;
import java.util.HashMap;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.access.prepost.PreAuthorize;

import com.ticket.ticket_booking_system.service.FileUploadService;
import com.ticket.ticket_booking_system.service.FileUploadService.CloudinaryUploadResult;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
@Slf4j
public class FileUploadController {

    private final FileUploadService fileUploadService;

    @PostMapping("/image")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> uploadImage(@RequestPart("file") MultipartFile file) {
        String safeFilenameForLogging = file.getOriginalFilename() != null
                ? file.getOriginalFilename().replaceAll("[\\r\\n]", "_")
                : "unknown";
        log.info("Received request to upload image: {}", safeFilenameForLogging);
        try {
            CloudinaryUploadResult result = fileUploadService.uploadImage(file);
            Map<String, String> response = new HashMap<>();
            response.put("url", result.url());
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            log.error("Failed to upload image", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
