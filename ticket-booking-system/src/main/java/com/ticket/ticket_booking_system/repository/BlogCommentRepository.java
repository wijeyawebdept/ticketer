package com.ticket.ticket_booking_system.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.BlogComment;

@Repository
public interface BlogCommentRepository extends JpaRepository<BlogComment, UUID> {
    List<BlogComment> findByPost_PostIdOrderByCreatedAtAsc(UUID postId);
    long countByPost_PostId(UUID postId);
}
