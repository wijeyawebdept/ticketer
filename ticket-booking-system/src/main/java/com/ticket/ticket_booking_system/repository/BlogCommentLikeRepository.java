package com.ticket.ticket_booking_system.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.BlogCommentLike;

@Repository
public interface BlogCommentLikeRepository extends JpaRepository<BlogCommentLike, UUID> {
    Optional<BlogCommentLike> findByComment_CommentIdAndUserId(UUID commentId, UUID userId);
    void deleteByComment_CommentIdAndUserId(UUID commentId, UUID userId);
    boolean existsByComment_CommentIdAndUserId(UUID commentId, UUID userId);
}
