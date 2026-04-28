package com.ticket.ticket_booking_system.service;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import com.ticket.ticket_booking_system.dto.blog.BlogDTOs.BlogCommentRequest;
import com.ticket.ticket_booking_system.dto.blog.BlogDTOs.BlogCommentResponse;
import com.ticket.ticket_booking_system.dto.blog.BlogDTOs.BlogPostCreateRequest;
import com.ticket.ticket_booking_system.dto.blog.BlogDTOs.BlogPostDetailResponse;
import com.ticket.ticket_booking_system.dto.blog.BlogDTOs.BlogPostSummaryResponse;

public interface BlogService {

    // Admin operations
    BlogPostDetailResponse createPost(BlogPostCreateRequest request, List<MultipartFile> images);
    BlogPostDetailResponse updatePost(UUID postId, BlogPostCreateRequest request, List<MultipartFile> newImages);
    BlogPostDetailResponse togglePublish(UUID postId);
    void deletePost(UUID postId);
    void deleteComment(UUID commentId);
    void deleteImage(UUID imageId);

    // Admin list
    Page<BlogPostSummaryResponse> getAllPostsForAdmin(Pageable pageable);

    // Public operations
    Page<BlogPostSummaryResponse> getPublishedPosts(Pageable pageable);
    BlogPostDetailResponse getPostDetail(UUID postId, UUID currentUserId);
    BlogCommentResponse addComment(UUID postId, UUID userId, String userName, BlogCommentRequest request);
    boolean toggleLike(UUID postId, UUID userId);

    // Email digest
    void sendBlogDigestEmail(String subject, String customMessage);
}
