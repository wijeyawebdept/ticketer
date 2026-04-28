package com.ticket.ticket_booking_system.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.BlogLike;

@Repository
public interface BlogLikeRepository extends JpaRepository<BlogLike, UUID> {
    Optional<BlogLike> findByPost_PostIdAndUserId(UUID postId, UUID userId);
    boolean existsByPost_PostIdAndUserId(UUID postId, UUID userId);
    long countByPost_PostId(UUID postId);
}
