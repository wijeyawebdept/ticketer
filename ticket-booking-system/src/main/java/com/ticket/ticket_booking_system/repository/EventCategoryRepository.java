package com.ticket.ticket_booking_system.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.EventCategory;

@Repository
public interface EventCategoryRepository extends JpaRepository<EventCategory, UUID> {
    
    Optional<EventCategory> findByCategoryName(String categoryName);
    
    List<EventCategory> findByActiveOrderByCategoryNameAsc(int active);
    
    List<EventCategory> findByActiveInOrderByCategoryNameAsc(List<Integer> activeStatuses);
    
    boolean existsByCategoryName(String categoryName);
    
    boolean existsByCategoryNameAndIdNot(String categoryName, UUID id);
}
