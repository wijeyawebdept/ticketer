package com.ticket.ticket_booking_system.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.PageContent;
import com.ticket.ticket_booking_system.entity.PageContent.PageType;

@Repository
public interface PageContentRepository extends JpaRepository<PageContent, UUID> {
    Optional<PageContent> findByPageType(PageType pageType);
}
