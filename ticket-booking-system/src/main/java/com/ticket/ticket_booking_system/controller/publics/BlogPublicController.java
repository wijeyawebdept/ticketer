package com.ticket.ticket_booking_system.controller.publics;

import java.util.List;
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

    @GetMapping("/posts")
    public ResponseEntity<Page<BlogPostSummaryResponse>> getPosts(
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "9") int size) {
        return ResponseEntity.ok(blogService.getPublishedPosts(category,
                PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }

    @GetMapping("/posts/{postId}")
    public ResponseEntity<BlogPostDetailResponse> getPost(@PathVariable UUID postId) {
        UUID userId = resolveCurrentUserId();
        return ResponseEntity.ok(blogService.getPostDetail(postId, userId));
    }

    @GetMapping("/categories")
    public ResponseEntity<List<String>> getCategories() {
        return ResponseEntity.ok(blogService.getPublishedCategories());
    }

    @PostMapping("/posts/{postId}/like")
    public ResponseEntity<Boolean> toggleLike(@PathVariable UUID postId) {
        UUID userId = requireAuth();
        boolean liked = blogService.toggleLike(postId, userId);
        return ResponseEntity.ok(liked);
    }

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<BlogCommentResponse> addComment(
            @PathVariable UUID postId,
            @RequestBody BlogCommentRequest request) {
        UUID userId = requireAuth();
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        String name = (user.getFirstName() != null ? user.getFirstName() : "") +
                      (user.getLastName() != null ? " " + user.getLastName() : "");
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
            return userRepo.findByEmail(email).map(User::getId).orElse(null);
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
