package com.ticket.ticket_booking_system.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.BlogPostImage;

@Repository
public interface BlogPostImageRepository extends JpaRepository<BlogPostImage, UUID> {
    List<BlogPostImage> findByPost_PostIdOrderByDisplayOrderAsc(UUID postId);
}
