package com.ticket.ticket_booking_system.repository;

import com.ticket.ticket_booking_system.entity.PrivacyPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PrivacyPolicyRepository extends JpaRepository<PrivacyPolicy, UUID> {
}
