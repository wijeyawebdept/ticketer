package com.ticket.ticket_booking_system.repository;

import com.ticket.ticket_booking_system.entity.FAQ;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface FAQRepository extends JpaRepository<FAQ, UUID> {
}
