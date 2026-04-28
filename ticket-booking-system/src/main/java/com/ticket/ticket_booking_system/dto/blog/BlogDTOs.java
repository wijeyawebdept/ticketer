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
        String content
    ) {}

    public record BlogImageResponse(
        String imageId,
        String imageBase64,
        String imageContentType,
        int displayOrder
    ) {}

    public record BlogCommentResponse(
        String commentId,
        String userId,
        String userName,
        String content,
        LocalDateTime createdAt
    ) {}

    public record BlogPostSummaryResponse(
        String postId,
        String title,
        String summary,
        boolean published,
        int likeCount,
        int commentCount,
        String coverImageBase64,
        String coverImageContentType,
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
