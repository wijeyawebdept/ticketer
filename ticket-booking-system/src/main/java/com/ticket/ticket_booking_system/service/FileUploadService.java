package com.ticket.ticket_booking_system.service;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.ticket.ticket_booking_system.exception.BadRequestException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileUploadService {
    
    private final Cloudinary cloudinary;
    
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList("jpg", "jpeg", "png", "gif", "webp");
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    
    // Simple record to hold the upload result
    public record CloudinaryUploadResult(String url, String publicId) {}
    
    public String uploadProfilePicture(MultipartFile file) throws IOException {
        CloudinaryUploadResult result = uploadImage(file);
        return result.url();
    }
    
    public void deleteProfilePicture(String profilePictureUrl) throws IOException {
        if (profilePictureUrl == null || profilePictureUrl.isBlank()) return;

        // If it's a Cloudinary URL, we can extract the public ID to delete it
        if (profilePictureUrl.contains("res.cloudinary.com")) {
            try {
                // Example URL: http://res.cloudinary.com/dstam7xm9/image/upload/v1234567/sample.jpg
                String[] parts = profilePictureUrl.split("/");
                String fileWithExtension = parts[parts.length - 1];
                String publicId = fileWithExtension.split("\\.")[0];
                deleteImage(publicId);
            } catch (Exception e) {
                log.error("Failed to delete Cloudinary profile picture: " + profilePictureUrl, e);
            }
        }
    }
    
    public CloudinaryUploadResult uploadImage(MultipartFile file) throws IOException {
        validateFile(file);
        
        // Upload to Cloudinary
        @SuppressWarnings("rawtypes")
        Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.emptyMap());
        
        String url = uploadResult.get("secure_url").toString();
        String publicId = uploadResult.get("public_id").toString();
        
        return new CloudinaryUploadResult(url, publicId);
    }
    
    public void deleteImage(String publicId) throws IOException {
        if (publicId == null || publicId.isBlank()) return;
        
        @SuppressWarnings("rawtypes")
        Map result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        log.info("Cloudinary delete result for {}: {}", publicId, result.get("result"));
    }
    
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Please select a file to upload");
        }
        
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BadRequestException("File size must be less than 5MB");
        }
        
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isEmpty()) {
            throw new BadRequestException("Invalid file name");
        }
        
        String fileExtension = getFileExtension(originalFilename).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(fileExtension)) {
            throw new BadRequestException("Only JPG, JPEG, PNG, WEBP, and GIF files are allowed");
        }
    }
    
    private String getFileExtension(String filename) {
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex == -1) {
            return "";
        }
        return filename.substring(lastDotIndex + 1);
    }
}