package com.ticket.ticket_booking_system.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.GalleryImage;

@Repository
public interface GalleryImageRepository extends JpaRepository<GalleryImage, UUID> {

    @Query("SELECT g FROM GalleryImage g WHERE g.active = true ORDER BY g.displayOrder ASC")
    List<GalleryImage> findAllActiveGalleryImages();

    @Query("SELECT g FROM GalleryImage g ORDER BY g.displayOrder ASC")
    Page<GalleryImage> findAllGalleryImagesForList(Pageable pageable);
}
