package com.ticket.ticket_booking_system.controller.publics;


import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.blog.BlogDTOs.BlogCommentRequest;
import com.ticket.ticket_booking_system.dto.blog.BlogDTOs.BlogCommentResponse;
import com.ticket.ticket_booking_system.dto.blog.BlogDTOs.BlogPostDetailResponse;
import com.ticket.ticket_booking_system.dto.blog.BlogDTOs.BlogPostSummaryResponse;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.service.BlogService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/public/blog")
@RequiredArgsConstructor
public class BlogPublicController {

    private final BlogService blogService;
    private final UserRepository userRepo;
    private final com.ticket.ticket_booking_system.repository.AdminRepository adminRepo;

    @GetMapping("/posts")
    public ResponseEntity<Page<BlogPostSummaryResponse>> getPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "9") int size) {
        return ResponseEntity.ok(blogService.getPublishedPosts(
                PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }

    @GetMapping("/posts/{postId}")
    public ResponseEntity<BlogPostDetailResponse> getPost(@PathVariable UUID postId) {
        UUID userId = resolveCurrentUserId();
        return ResponseEntity.ok(blogService.getPostDetail(postId, userId));
    }


    @PostMapping("/posts/{postId}/like")
    public ResponseEntity<Boolean> toggleLike(@PathVariable UUID postId) {
        UUID userId = requireAuth();
        boolean liked = blogService.toggleLike(postId, userId);
        return ResponseEntity.ok(liked);
    }

    @PostMapping("/comments/{commentId}/like")
    public ResponseEntity<Boolean> toggleCommentLike(@PathVariable UUID commentId) {
        UUID userId = requireAuth();
        boolean liked = blogService.toggleCommentLike(commentId, userId);
        return ResponseEntity.ok(liked);
    }

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<BlogCommentResponse> addComment(
            @PathVariable UUID postId,
            @RequestBody BlogCommentRequest request) {
        UUID userId = requireAuth();
        String name = "";
        java.util.Optional<User> userOpt = userRepo.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            name = (user.getFirstName() != null ? user.getFirstName() : "") +
                   (user.getLastName() != null ? " " + user.getLastName() : "");
        } else {
            java.util.Optional<com.ticket.ticket_booking_system.entity.Admin> adminOpt = adminRepo.findById(userId);
            if (adminOpt.isPresent()) {
                com.ticket.ticket_booking_system.entity.Admin admin = adminOpt.get();
                name = (admin.getFirstName() != null ? admin.getFirstName() : "") +
                       (admin.getLastName() != null ? " " + admin.getLastName() : "");
            } else {
                throw new RuntimeException("User not found");
            }
        }
        return ResponseEntity.ok(blogService.addComment(postId, userId, name.trim(), request));
    }

    // ---- Helpers ----

    private UUID resolveCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
                return null;
            }
            String email = auth.getName();
            
            java.util.Optional<User> u = userRepo.findByEmail(email);
            if (u.isPresent()) return u.get().getUserId();
            
            java.util.Optional<com.ticket.ticket_booking_system.entity.Admin> a = adminRepo.findByEmail(email);
            if (a.isPresent()) return a.get().getAdminId();
            
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    private UUID requireAuth() {
        UUID id = resolveCurrentUserId();
        if (id == null) throw new RuntimeException("Authentication required");
        return id;
    }
}
