package com.ticket.ticket_booking_system.service.impl;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.dto.request.BulkEventCategoryOperationRequest;
import com.ticket.ticket_booking_system.dto.request.EventCategoryRequest;
import com.ticket.ticket_booking_system.dto.response.EventCategoryResponse;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.EventCategory;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.EventCategoryRepository;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.RecycleBinRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.service.EventCategoryService;
import com.ticket.ticket_booking_system.service.RecycleBinService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EventCategoryServiceImpl implements EventCategoryService {

    private final EventCategoryRepository categoryRepository;
    private final RecycleBinService recycleBinService;
    private final RecycleBinRepository recycleBinRepository;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final OrganizerRepository organizerRepository;
    private final OrganizerEmployeeRepository organizerEmployeeRepository;

    @Override
    @Transactional
    public EventCategoryResponse createCategory(EventCategoryRequest request) {
        // Check if category name already exists
        if (categoryRepository.existsByCategoryName(request.getCategoryName())) {
            throw new IllegalArgumentException("Category with name '" + request.getCategoryName() + "' already exists");
        }

        EventCategory category = EventCategory.builder()
                .categoryName(request.getCategoryName())
                .description(request.getDescription())
                .createdAt(LocalDateTime.now())
                .build();

        EventCategory savedCategory = categoryRepository.save(category);
        return mapToResponse(savedCategory);
    }

    @Override
    @Transactional
    public EventCategoryResponse updateCategory(UUID id, EventCategoryRequest request) {
        EventCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event category not found with id: " + id));

        // Check if new category name conflicts with existing (excluding current)
        if (!category.getCategoryName().equals(request.getCategoryName()) &&
            categoryRepository.existsByCategoryNameAndIdNot(request.getCategoryName(), id)) {
            throw new IllegalArgumentException("Category with name '" + request.getCategoryName() + "' already exists");
        }

        category.setCategoryName(request.getCategoryName());
        category.setDescription(request.getDescription());
        category.setUpdatedAt(LocalDateTime.now());

        EventCategory updatedCategory = categoryRepository.save(category);
        return mapToResponse(updatedCategory);
    }

    @Override
    public EventCategoryResponse getCategoryById(UUID id) {
        EventCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event category not found with id: " + id));
        return mapToResponse(category);
    }

    @Override
    public List<EventCategoryResponse> getAllCategories() {
        // Get all categories except soft-deleted ones
        return categoryRepository.findByActiveInOrderByCategoryNameAsc(List.of(0, 1))
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<EventCategoryResponse> getActiveCategories() {
        return categoryRepository.findByActiveOrderByCategoryNameAsc(1)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteCategory(UUID id) {
        EventCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event category not found with id: " + id));
        categoryRepository.delete(category);
    }

    @Override
    @Transactional
    public void softDeleteCategory(UUID id) {
        EventCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event category not found with id: " + id));
        
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String authenticatedEmail = authentication.getName();
        User deletedBy = getAuthenticatedUser(authenticatedEmail);
        
        // Move to recycle bin
        recycleBinService.moveToRecycleBin(
            "EVENT_CATEGORY",
            category.getId(),
            category.getCategoryName(),
            category,
            deletedBy,
            "Event category soft deleted by " + deletedBy.getEmail()
        );
        
        // Mark as deleted
        category.setActive(-1);
        category.setUpdatedAt(LocalDateTime.now());
        categoryRepository.save(category);
    }

    @Override
    @Transactional
    public void restoreCategory(UUID id) {
        EventCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event category not found with id: " + id));
        
        // Reactivate the category
        category.setActive(1);
        category.setUpdatedAt(LocalDateTime.now());
        categoryRepository.save(category);
        
        // Remove from recycle bin if exists
        recycleBinRepository.findByEntityTypeAndEntityId("EVENT_CATEGORY", id)
                .ifPresent(recycleBinRepository::delete);
    }

    @Override
    @Transactional
    public Map<String, Object> bulkOperation(BulkEventCategoryOperationRequest request) {
        List<UUID> successfulIds = new ArrayList<>();
        List<Map<String, String>> errors = new ArrayList<>();
        
        for (UUID categoryId : request.getCategoryIds()) {
            try {
                EventCategory category = categoryRepository.findById(categoryId)
                        .orElseThrow(() -> new ResourceNotFoundException("Event category not found with id: " + categoryId));
                
                switch (request.getOperation()) {
                    case ACTIVATE:
                        category.setActive(1);
                        category.setUpdatedAt(LocalDateTime.now());
                        categoryRepository.save(category);
                        successfulIds.add(categoryId);
                        break;
                    case DEACTIVATE:
                        category.setActive(0);
                        category.setUpdatedAt(LocalDateTime.now());
                        categoryRepository.save(category);
                        successfulIds.add(categoryId);
                        break;
                    case DELETE:
                        category.setActive(-1);
                        category.setUpdatedAt(LocalDateTime.now());
                        categoryRepository.save(category);
                        successfulIds.add(categoryId);
                        break;
                    case RESTORE:
                        category.setActive(1);
                        category.setUpdatedAt(LocalDateTime.now());
                        categoryRepository.save(category);
                        successfulIds.add(categoryId);
                        break;
                    default:
                        throw new IllegalArgumentException("Unknown operation type: " + request.getOperation());
                }
            } catch (Exception e) {
                Map<String, String> error = new HashMap<>();
                error.put("categoryId", categoryId.toString());
                error.put("error", e.getMessage());
                errors.add(error);
            }
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("successful", successfulIds.size());
        result.put("failed", errors.size());
        result.put("successfulIds", successfulIds);
        result.put("errors", errors);
        result.put("message", String.format("Bulk operation completed: %d successful, %d failed", 
                successfulIds.size(), errors.size()));
        
        return result;
    }

    @Override
    public EventCategoryResponse activateCategory(UUID id) {
        EventCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event category not found with id: " + id));
        category.setActive(1);
        category.setUpdatedAt(LocalDateTime.now());
        EventCategory savedCategory = categoryRepository.save(category);
        return mapToResponse(savedCategory);
    }

    @Override
    public EventCategoryResponse deactivateCategory(UUID id) {
        EventCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event category not found with id: " + id));
        category.setActive(0);
        category.setUpdatedAt(LocalDateTime.now());
        EventCategory savedCategory = categoryRepository.save(category);
        return mapToResponse(savedCategory);
    }

    private User getAuthenticatedUser(String authenticatedEmail) {
        // Try to find authenticated user in users table
        User user = userRepository.findByEmail(authenticatedEmail).orElse(null);
        if (user != null) {
            return user;
        }
        
        // Check if it's an admin
        Admin admin = adminRepository.findByEmail(authenticatedEmail).orElse(null);
        if (admin != null) {
            User tempUser = new User();
            tempUser.setId(admin.getAdminId());
            tempUser.setEmail(admin.getEmail());
            tempUser.setFirstName(admin.getFirstName());
            tempUser.setLastName(admin.getLastName());
            return tempUser;
        }
        
        // Check if it's an organizer
        Organizer organizer = organizerRepository.findByEmail(authenticatedEmail).orElse(null);
        if (organizer != null) {
            User tempUser = new User();
            tempUser.setId(organizer.getOrganizerId());
            tempUser.setEmail(organizer.getEmail());
            tempUser.setFirstName(organizer.getFirstName());
            tempUser.setLastName(organizer.getLastName());
            return tempUser;
        }
        
        // Check if it's an organizer employee
        OrganizerEmployee employee = organizerEmployeeRepository.findByEmail(authenticatedEmail).orElse(null);
        if (employee != null) {
            User tempUser = new User();
            tempUser.setId(employee.getEmployeeId());
            tempUser.setEmail(employee.getEmail());
            tempUser.setFirstName(employee.getFirstName());
            tempUser.setLastName(employee.getLastName());
            return tempUser;
        }
        
        throw new IllegalStateException("Current authenticated user not found in any table");
    }

    private EventCategoryResponse mapToResponse(EventCategory category) {
        return EventCategoryResponse.builder()
                .id(category.getId())
                .categoryName(category.getCategoryName())
                .description(category.getDescription())
                .active(category.getActive())
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }
}
