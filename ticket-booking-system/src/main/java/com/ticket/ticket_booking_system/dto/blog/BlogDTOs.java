package com.ticket.ticket_booking_system.dto.blog;

import java.time.LocalDateTime;
import java.util.List;

public class BlogDTOs {

    public record BlogPostCreateRequest(
        String title,
        String summary,
        String content
    ) {}

    public record BlogCommentRequest(
        String content,
        String parentCommentId
    ) {}

    public record BlogImageResponse(
        String imageId,
        String imageUrl,
        int displayOrder
    ) {}

    public record BlogCommentResponse(
        String commentId,
        String userId,
        String userName,
        boolean isAdmin,
        String content,
        int likeCount,
        boolean likedByCurrentUser,
        List<BlogCommentResponse> replies,
        LocalDateTime createdAt
    ) {}

    public record BlogPostSummaryResponse(
        String postId,
        String title,
        String summary,
        boolean published,
        int likeCount,
        int commentCount,
        String coverImageUrl,
        String authorId,
        String authorName,
        String authorAvatar,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {}

    public record BlogPostDetailResponse(
        String postId,
        String title,
        String summary,
        String content,
        boolean published,
        int likeCount,
        int commentCount,
        boolean likedByCurrentUser,
        String authorId,
        String authorName,
        String authorAvatar,
        List<BlogImageResponse> images,
        List<BlogCommentResponse> comments,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {}

    public record BlogDigestRequest(
        String subject,
        String customMessage
    ) {}
}
