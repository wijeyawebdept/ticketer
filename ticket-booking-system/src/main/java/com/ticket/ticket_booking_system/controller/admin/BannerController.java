package com.ticket.ticket_booking_system.controller.admin;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.ticket.ticket_booking_system.dto.request.BannerCreateRequest;
import com.ticket.ticket_booking_system.dto.response.BannerResponse;
import com.ticket.ticket_booking_system.entity.Banner.BannerStatus;
import com.ticket.ticket_booking_system.service.BannerService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/admin/banners")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
public class BannerController {

    private final BannerService bannerService;

    @PostMapping
    public ResponseEntity<BannerResponse> createBanner(
            @RequestParam("title") String title,
            @RequestParam("description") String description,
            @RequestParam("displayOrder") Integer displayOrder,
            @RequestPart("imageFile") MultipartFile imageFile) {
        log.info("Creating new banner: {}", title);
        BannerCreateRequest request = BannerCreateRequest.builder()
                .title(title)
                .description(description)
                .displayOrder(displayOrder)
                .build();
        BannerResponse response = bannerService.createBanner(request, imageFile);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{bannerId}")
    public ResponseEntity<BannerResponse> updateBanner(
            @PathVariable UUID bannerId,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "displayOrder", required = false) Integer displayOrder,
            @RequestPart(value = "imageFile", required = false) MultipartFile imageFile) {
        log.info("Updating banner: {}", bannerId);
        BannerCreateRequest request = BannerCreateRequest.builder()
                .title(title)
                .description(description)
                .displayOrder(displayOrder)
                .build();
        BannerResponse response = bannerService.updateBanner(bannerId, request, imageFile);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("permitAll()")
    public ResponseEntity<List<BannerResponse>> getAllActiveBanners() {
        log.info("Fetching all active banners");
        List<BannerResponse> banners = bannerService.getAllActiveBanners();
        return ResponseEntity.ok(banners);
    }

    @GetMapping("/all")
    public ResponseEntity<Page<BannerResponse>> getAllBanners(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        log.info("Fetching all banners - page: {}, size: {}", page, size);
        Pageable pageable = PageRequest.of(page, size);
        Page<BannerResponse> banners = bannerService.getAllBanners(pageable);
        return ResponseEntity.ok(banners);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<Page<BannerResponse>> getBannersByStatus(
            @PathVariable BannerStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        log.info("Fetching banners by status: {}", status);
        Pageable pageable = PageRequest.of(page, size);
        Page<BannerResponse> banners = bannerService.getBannersByStatus(status, pageable);
        return ResponseEntity.ok(banners);
    }

    @GetMapping("/{bannerId}")
    @PreAuthorize("permitAll()")
    public ResponseEntity<BannerResponse> getBannerById(@PathVariable UUID bannerId) {
        log.info("Fetching banner: {}", bannerId);
        BannerResponse banner = bannerService.getBannerById(bannerId);
        return ResponseEntity.ok(banner);
    }

    @DeleteMapping("/{bannerId}")
    public ResponseEntity<Void> deleteBanner(@PathVariable UUID bannerId) {
        log.info("Deleting banner: {}", bannerId);
        bannerService.deleteBanner(bannerId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{bannerId}/status/{status}")
    public ResponseEntity<BannerResponse> updateBannerStatus(
            @PathVariable UUID bannerId,
            @PathVariable BannerStatus status) {
        log.info("Updating banner status: {}, status: {}", bannerId, status);
        BannerResponse response = bannerService.updateBannerStatus(bannerId, status);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reorder")
    public ResponseEntity<Void> reorderBanners(@RequestBody List<UUID> bannerIds) {
        log.info("Reordering banners");
        bannerService.reorderBanners(bannerIds);
        return ResponseEntity.ok().build();
    }
}
