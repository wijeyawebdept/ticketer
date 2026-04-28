package com.ticket.ticket_booking_system.controller.admin;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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

import com.ticket.ticket_booking_system.dto.blog.BlogDTOs.BlogDigestRequest;
import com.ticket.ticket_booking_system.dto.blog.BlogDTOs.BlogPostCreateRequest;
import com.ticket.ticket_booking_system.dto.blog.BlogDTOs.BlogPostDetailResponse;
import com.ticket.ticket_booking_system.dto.blog.BlogDTOs.BlogPostSummaryResponse;
import com.ticket.ticket_booking_system.service.BlogService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/blog")
@PreAuthorize("hasAnyAuthority('ADMIN','SUPER_ADMIN','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
@RequiredArgsConstructor
public class BlogAdminController {

    private final BlogService blogService;

    @GetMapping("/all")
    public ResponseEntity<Page<BlogPostSummaryResponse>> getAllPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(blogService.getAllPostsForAdmin(
                PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }

    @GetMapping("/{postId}")
    public ResponseEntity<BlogPostDetailResponse> getPost(@PathVariable UUID postId) {
        return ResponseEntity.ok(blogService.getPostDetail(postId, null));
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<BlogPostDetailResponse> createPost(
            @RequestPart("title") String title,
            @RequestPart(value = "summary", required = false) String summary,
            @RequestPart(value = "content", required = false) String content,
            @RequestPart(value = "images", required = false) List<MultipartFile> images) {

        BlogPostCreateRequest req = new BlogPostCreateRequest(title, summary, content);
        return ResponseEntity.ok(blogService.createPost(req, images));
    }

    @PutMapping(value = "/{postId}", consumes = "multipart/form-data")
    public ResponseEntity<BlogPostDetailResponse> updatePost(
            @PathVariable UUID postId,
            @RequestPart("title") String title,
            @RequestPart(value = "summary", required = false) String summary,
            @RequestPart(value = "content", required = false) String content,
            @RequestPart(value = "images", required = false) List<MultipartFile> images) {

        BlogPostCreateRequest req = new BlogPostCreateRequest(title, summary, content);
        return ResponseEntity.ok(blogService.updatePost(postId, req, images));
    }

    @PutMapping("/{postId}/publish")
    public ResponseEntity<BlogPostDetailResponse> togglePublish(@PathVariable UUID postId) {
        return ResponseEntity.ok(blogService.togglePublish(postId));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> deletePost(@PathVariable UUID postId) {
        blogService.deletePost(postId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable UUID commentId) {
        blogService.deleteComment(commentId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/images/{imageId}")
    public ResponseEntity<Void> deleteImage(@PathVariable UUID imageId) {
        blogService.deleteImage(imageId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/digest/send")
    public ResponseEntity<String> sendDigest(@RequestBody(required = false) BlogDigestRequest req) {
        String subject = req != null ? req.subject() : null;
        String message = req != null ? req.customMessage() : null;
        blogService.sendBlogDigestEmail(subject, message);
        return ResponseEntity.ok("Blog digest sent successfully.");
    }
}
