package com.ticket.ticket_booking_system.repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.entity.User;

@Repository
public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {
    
    Optional<User> findByEmail(String email);

    Optional<User> findByGoogleId(String googleId);

    Optional<User> findByResetPasswordToken(String resetPasswordToken);
    
    boolean existsByEmail(String email);
    
    boolean existsByGoogleId(String googleId);
    
    Page<User> findByRole(User.Role role, Pageable pageable);
    
    // Update last login timestamp
    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.lastLoginAt = :timestamp WHERE u.id = :userId")
    int updateLastLoginAt(@Param("userId") UUID userId, @Param("timestamp") LocalDateTime timestamp);
    
    Page<User> findByFirstNameContainingOrLastNameContainingOrEmailContaining(
            String firstName, String lastName, String email, Pageable pageable);
    
    // Additional query methods for better performance
    @Query("SELECT u FROM User u WHERE u.active = 1 AND u.email = :email")
    Optional<User> findActiveUserByEmail(@Param("email") String email);
    
    @Query("SELECT COUNT(u) > 0 FROM User u WHERE u.email = :email AND u.active = 1")
    boolean existsActiveUserByEmail(@Param("email") String email);
    
    Page<User> findByActive(int active, Pageable pageable);
    
    // Legacy methods - deprecated, use findByActive instead
    default Page<User> findByActiveTrue(Pageable pageable) {
        return findByActive(1, pageable);
    }
    
    default Page<User> findByActiveFalse(Pageable pageable) {
        return findByActive(0, pageable);
    }
    
    // Find all users except soft-deleted ones
    @Query("SELECT u FROM User u WHERE u.active <> :excludeStatus")
    Page<User> findByActiveNot(@Param("excludeStatus") int excludeStatus, Pageable pageable);
}