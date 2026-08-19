package com.ticket.ticket_booking_system.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.PromoCode;

@Repository
public interface PromoCodeRepository extends JpaRepository<PromoCode, UUID> {

    Optional<PromoCode> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    List<PromoCode> findByOrganizer_OrganizerIdOrderByCreatedAtDesc(UUID organizerId);

    List<PromoCode> findAllByOrderByCreatedAtDesc();

    @Query("SELECT p FROM PromoCode p WHERE p.event.eventId = :eventId AND p.isActive = true")
    List<PromoCode> findActivePromoCodesForEvent(UUID eventId);

    @Query("SELECT p FROM PromoCode p WHERE p.scope = 'ALL_EVENTS' AND p.isActive = true")
    List<PromoCode> findActiveGlobalPromoCodes();
}
