package com.ticket.ticket_booking_system.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.User;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    
    Optional<User> findByEmail(String email);
    
    boolean existsByEmail(String email);
    
    Page<User> findByRole(User.Role role, Pageable pageable);
    
    Page<User> findByFirstNameContainingOrLastNameContainingOrEmailContaining(
            String firstName, String lastName, String email, Pageable pageable);
    
    // Additional query methods for better performance
    @Query("SELECT u FROM User u WHERE u.active = true AND u.email = :email")
    Optional<User> findActiveUserByEmail(@Param("email") String email);
    
    @Query("SELECT COUNT(u) > 0 FROM User u WHERE u.email = :email AND u.active = true")
    boolean existsActiveUserByEmail(@Param("email") String email);
    
    Page<User> findByActiveTrue(Pageable pageable);
    
    Page<User> findByActiveFalse(Pageable pageable);
}