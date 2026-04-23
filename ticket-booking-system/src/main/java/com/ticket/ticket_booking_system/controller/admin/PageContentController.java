package com.ticket.ticket_booking_system.controller.admin;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.request.PageContentUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.PageContentResponse;
import com.ticket.ticket_booking_system.service.PageContentService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/admin/pages")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
public class PageContentController {

    private final PageContentService pageContentService;

    @GetMapping("/{pageType}")
    public ResponseEntity<PageContentResponse> getPageContent(
            @PathVariable String pageType) {
        try {
            PageContentResponse response = pageContentService.getPageContent(pageType);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{pageType}")
    public ResponseEntity<PageContentResponse> updatePageContent(
            @PathVariable String pageType,
            @RequestBody PageContentUpdateRequest request,
            Authentication authentication) {
        try {
            String updatedBy = authentication != null ? authentication.getName() : "SYSTEM";
            PageContentResponse response = pageContentService.updatePageContent(pageType, request, updatedBy);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/id/{contentId}")
    @PreAuthorize("permitAll()")
    public ResponseEntity<PageContentResponse> getPageContentById(
            @PathVariable UUID contentId) {
        PageContentResponse response = pageContentService.getPageContentById(contentId);
        return ResponseEntity.ok(response);
    }
}
