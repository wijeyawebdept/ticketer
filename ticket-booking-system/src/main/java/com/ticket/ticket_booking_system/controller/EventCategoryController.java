package com.ticket.ticket_booking_system.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.ticket.ticket_booking_system.dto.request.BulkEventCategoryOperationRequest;
import com.ticket.ticket_booking_system.dto.request.EventCategoryRequest;
import com.ticket.ticket_booking_system.dto.response.EventCategoryResponse;
import com.ticket.ticket_booking_system.service.EventCategoryService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/event-categories")
@RequiredArgsConstructor
public class EventCategoryController {

    private final EventCategoryService categoryService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<EventCategoryResponse> createCategory(@RequestBody EventCategoryRequest request) {
        EventCategoryResponse response = categoryService.createCategory(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<EventCategoryResponse> updateCategory(
            @PathVariable UUID id,
            @RequestBody EventCategoryRequest request) {
        EventCategoryResponse response = categoryService.updateCategory(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE')")
    public ResponseEntity<EventCategoryResponse> getCategoryById(@PathVariable UUID id) {
        EventCategoryResponse response = categoryService.getCategoryById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<EventCategoryResponse>> getAllCategories() {
        List<EventCategoryResponse> categories = categoryService.getAllCategories();
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE')")
    public ResponseEntity<List<EventCategoryResponse>> getActiveCategories() {
        List<EventCategoryResponse> categories = categoryService.getActiveCategories();
        return ResponseEntity.ok(categories);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> deleteCategory(@PathVariable UUID id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/soft")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> softDeleteCategory(@PathVariable UUID id) {
        categoryService.softDeleteCategory(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> restoreCategory(@PathVariable UUID id) {
        categoryService.restoreCategory(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-operation")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> bulkOperation(@Valid @RequestBody BulkEventCategoryOperationRequest request) {
        Map<String, Object> result = categoryService.bulkOperation(request);
        return ResponseEntity.ok(result);
    }

    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<EventCategoryResponse> activateCategory(@PathVariable UUID id) {
        EventCategoryResponse response = categoryService.activateCategory(id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<EventCategoryResponse> deactivateCategory(@PathVariable UUID id) {
        EventCategoryResponse response = categoryService.deactivateCategory(id);
        return ResponseEntity.ok(response);
    }
}
