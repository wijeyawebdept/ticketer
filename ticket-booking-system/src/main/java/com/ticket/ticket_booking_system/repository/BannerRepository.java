package com.ticket.ticket_booking_system.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.dto.response.BannerListItemResponse;
import com.ticket.ticket_booking_system.entity.Banner;
import com.ticket.ticket_booking_system.entity.Banner.BannerStatus;

@Repository
public interface BannerRepository extends JpaRepository<Banner, UUID> {

    @Query("SELECT b FROM Banner b WHERE b.status = :status ORDER BY b.displayOrder ASC")
    List<Banner> findByStatusOrderByDisplayOrder(BannerStatus status);

    @Query("SELECT b FROM Banner b WHERE b.status = :status ORDER BY b.displayOrder ASC")
    Page<Banner> findByStatus(BannerStatus status, Pageable pageable);

    @Query("SELECT b FROM Banner b ORDER BY b.displayOrder ASC")
    List<Banner> findAllOrderByDisplayOrder();

    @Query("SELECT b FROM Banner b ORDER BY b.displayOrder ASC")
    Page<Banner> findAllOrderByDisplayOrder(Pageable pageable);

    // Optimized query for list endpoints - excludes large LOB data
    @Query("SELECT NEW com.ticket.ticket_booking_system.dto.response.BannerListItemResponse(" +
            "b.bannerId, b.title, b.description, b.imageUrl, " +
            "b.displayOrder, b.status, " +
            "b.createdAt, b.updatedAt) " +
            "FROM Banner b ORDER BY b.displayOrder ASC")
    Page<BannerListItemResponse> findAllBannersForList(Pageable pageable);

    // Optimized query for status filtering - excludes large LOB data
    @Query("SELECT NEW com.ticket.ticket_booking_system.dto.response.BannerListItemResponse(" +
            "b.bannerId, b.title, b.description, b.imageUrl, " +
            "b.displayOrder, b.status, " +
            "b.createdAt, b.updatedAt) " +
            "FROM Banner b WHERE b.status = :status ORDER BY b.displayOrder ASC")
    Page<BannerListItemResponse> findByStatusForList(@Param("status") BannerStatus status, Pageable pageable);

    // Optimized query for public endpoint - returns active banners without large LOB data
    @Query("SELECT NEW com.ticket.ticket_booking_system.dto.response.BannerListItemResponse(" +
            "b.bannerId, b.title, b.description, b.imageUrl, " +
            "b.displayOrder, b.status, " +
            "b.createdAt, b.updatedAt) " +
            "FROM Banner b WHERE b.status = 'ACTIVE' ORDER BY b.displayOrder ASC")
    List<BannerListItemResponse> findAllActiveBannersForPublic();

    boolean existsByDisplayOrder(Integer displayOrder);
}
