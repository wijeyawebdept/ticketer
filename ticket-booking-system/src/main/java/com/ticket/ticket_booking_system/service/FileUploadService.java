package com.ticket.ticket_booking_system.service;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

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
    private static final Set<String> JPEG_ALIASES = Set.of("jpg", "jpeg");
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    /** Smallest number of leading bytes we need to inspect to identify any of the allowed formats (WEBP's marker starts at offset 8). */
    private static final int MAGIC_BYTE_HEADER_LENGTH = 12;

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

        // Never derive the storage name from the client-supplied filename — generate a random,
        // server-controlled public_id so a crafted filename can't influence the storage path.
        String randomPublicId = UUID.randomUUID().toString();

        // Upload to Cloudinary
        @SuppressWarnings("rawtypes")
        Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap("public_id", randomPublicId));

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
    
    private void validateFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Please select a file to upload");
        }

        // Defense in depth: Spring's own multipart limits (spring.servlet.multipart.max-file-size /
        // max-request-size) already reject oversized uploads before this code runs; this is a
        // second, explicit check in case those properties are ever changed independently of MAX_FILE_SIZE.
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BadRequestException("File size must be less than 5MB");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isEmpty()) {
            throw new BadRequestException("Invalid file name");
        }

        // The extension is purely a fast, attacker-controlled hint at this point — it is
        // cross-checked against the file's actual magic bytes below before being trusted.
        String fileExtension = getFileExtension(originalFilename).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(fileExtension)) {
            throw new BadRequestException("Only JPG, JPEG, PNG, WEBP, and GIF files are allowed");
        }

        // Client-supplied Content-Type header is equally untrustworthy (trivially spoofable), so
        // the only signal we actually trust is the file's own magic bytes.
        String detectedType = detectImageType(readHeaderBytes(file));
        if (detectedType == null) {
            throw new BadRequestException("File content does not match a supported image format (JPG, PNG, GIF, WEBP)");
        }
        if (!extensionMatchesDetectedType(fileExtension, detectedType)) {
            throw new BadRequestException("File content does not match its file extension");
        }
    }

    private byte[] readHeaderBytes(MultipartFile file) throws IOException {
        byte[] header = new byte[MAGIC_BYTE_HEADER_LENGTH];
        int totalRead = 0;
        try (java.io.InputStream in = file.getInputStream()) {
            int read;
            while (totalRead < header.length && (read = in.read(header, totalRead, header.length - totalRead)) != -1) {
                totalRead += read;
            }
        }
        return totalRead == header.length ? header : Arrays.copyOf(header, totalRead);
    }

    /**
     * Identifies the actual image format from its magic bytes, ignoring whatever extension or
     * Content-Type the client claimed. Returns null if the bytes don't match any supported format.
     */
    private String detectImageType(byte[] header) {
        if (header.length >= 3
                && (header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF) {
            return "jpg"; // JPEG/JFIF/EXIF: FF D8 FF
        }
        if (header.length >= 8
                && (header[0] & 0xFF) == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47
                && header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A) {
            return "png"; // PNG: 89 50 4E 47 0D 0A 1A 0A
        }
        if (header.length >= 6
                && header[0] == 'G' && header[1] == 'I' && header[2] == 'F' && header[3] == '8'
                && (header[4] == '7' || header[4] == '9') && header[5] == 'a') {
            return "gif"; // GIF87a / GIF89a
        }
        if (header.length >= 12
                && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P') {
            return "webp"; // RIFF....WEBP
        }
        return null;
    }

    private boolean extensionMatchesDetectedType(String extension, String detectedType) {
        if (JPEG_ALIASES.contains(extension) && JPEG_ALIASES.contains(detectedType)) {
            return true;
        }
        return extension.equals(detectedType);
    }

    private String getFileExtension(String filename) {
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex == -1) {
            return "";
        }
        return filename.substring(lastDotIndex + 1);
    }
}