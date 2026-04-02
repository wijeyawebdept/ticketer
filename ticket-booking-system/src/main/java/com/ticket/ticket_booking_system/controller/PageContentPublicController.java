package com.ticket.ticket_booking_system.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.response.PageContentResponse;
import com.ticket.ticket_booking_system.service.PageContentService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/pages")
@RequiredArgsConstructor
@Slf4j
public class PageContentPublicController {

    private final PageContentService pageContentService;

    @GetMapping("/{pageType}")
    public ResponseEntity<PageContentResponse> getPageContent(
            @PathVariable String pageType) {
        try {
            PageContentResponse response = pageContentService.getPageContent(pageType);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            // Return 404 if page content not initialized yet
            return ResponseEntity.notFound().build();
        }
    }
}
