package com.ticket.ticket_booking_system.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.response.EventCategoryResponse;
import com.ticket.ticket_booking_system.service.EventCategoryService;

import lombok.RequiredArgsConstructor;

/**
 * Public event category controller for customer-facing pages
 * No authentication required - returns only ACTIVE event categories
 */
@RestController
@RequestMapping("/api/public/event-categories")
@RequiredArgsConstructor
public class PublicEventCategoryController {

    private final EventCategoryService categoryService;

    /**
     * Get all active event categories (publicly accessible)
     * Returns only categories with active status = 1
     */
    @GetMapping("/active")
    public ResponseEntity<List<EventCategoryResponse>> getActiveCategories() {
        List<EventCategoryResponse> categories = categoryService.getActiveCategories();
        return ResponseEntity.ok(categories);
    }

    /**
     * Get a specific event category by ID (publicly accessible)
     * Returns the category if it exists and is active
     */
    @GetMapping("/{id}")
    public ResponseEntity<EventCategoryResponse> getCategoryById(@PathVariable UUID id) {
        EventCategoryResponse response = categoryService.getCategoryById(id);
        return ResponseEntity.ok(response);
    }
}
