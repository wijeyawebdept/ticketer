package com.ticket.ticket_booking_system.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.BlogPost;

@Repository
public interface BlogPostRepository extends JpaRepository<BlogPost, UUID> {

    Page<BlogPost> findByPublishedTrue(Pageable pageable);

    Page<BlogPost> findByPublishedTrueAndCategory(String category, Pageable pageable);

    @Query("SELECT DISTINCT b.category FROM BlogPost b WHERE b.published = true")
    List<String> findDistinctPublishedCategories();

    List<BlogPost> findByPublishedTrueAndDigestSentFalse();
}
