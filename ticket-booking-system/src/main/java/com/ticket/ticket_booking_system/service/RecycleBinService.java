package com.ticket.ticket_booking_system.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.ticket.ticket_booking_system.dto.RecycleBinDTO;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.EventCategory;
import com.ticket.ticket_booking_system.entity.EventSchedule;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.entity.RecycleBin;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.entity.Venue;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.EventCategoryRepository;
import com.ticket.ticket_booking_system.repository.EventEmployeeAssignmentRepository;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.EventScheduleRepository;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.RecycleBinRepository;
import com.ticket.ticket_booking_system.repository.SeatRepository;
import com.ticket.ticket_booking_system.repository.TicketCategoryRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.repository.VenueRepository;

@Service
public class RecycleBinService {

    private final RecycleBinRepository recycleBinRepository;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final OrganizerRepository organizerRepository;
    private final OrganizerEmployeeRepository organizerEmployeeRepository;
    private final EventRepository eventRepository;
    private final EventScheduleRepository eventScheduleRepository;
    private final VenueRepository venueRepository;
    private final SeatRepository seatRepository;
    private final TicketCategoryRepository ticketCategoryRepository;
    private final EventCategoryRepository eventCategoryRepository;
    private final EventEmployeeAssignmentRepository eventEmployeeAssignmentRepository;
    private final ObjectMapper objectMapper;

    public RecycleBinService(
            RecycleBinRepository recycleBinRepository,
            UserRepository userRepository,
            AdminRepository adminRepository,
            OrganizerRepository organizerRepository,
            OrganizerEmployeeRepository organizerEmployeeRepository,
            EventRepository eventRepository,
            EventScheduleRepository eventScheduleRepository,
            VenueRepository venueRepository,
            SeatRepository seatRepository,
            TicketCategoryRepository ticketCategoryRepository,
            EventCategoryRepository eventCategoryRepository,
            EventEmployeeAssignmentRepository eventEmployeeAssignmentRepository) {
        this.recycleBinRepository = recycleBinRepository;
        this.userRepository = userRepository;
        this.adminRepository = adminRepository;
        this.organizerRepository = organizerRepository;
        this.organizerEmployeeRepository = organizerEmployeeRepository;
        this.eventRepository = eventRepository;
        this.eventScheduleRepository = eventScheduleRepository;
        this.venueRepository = venueRepository;
        this.seatRepository = seatRepository;
        this.ticketCategoryRepository = ticketCategoryRepository;
        this.eventCategoryRepository = eventCategoryRepository;
        this.eventEmployeeAssignmentRepository = eventEmployeeAssignmentRepository;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        // Configure ObjectMapper to handle Hibernate lazy loading and empty beans
        this.objectMapper.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false);
        this.objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    @Transactional
    public RecycleBinDTO moveToRecycleBin(String entityType, UUID entityId, String entityName,
                                          Object entityData, User deletedBy, String reason) {
        try {
            String entityDataJson = objectMapper.writeValueAsString(entityData);
            
            RecycleBin recycleBin = RecycleBin.builder()
                    .entityType(entityType)
                    .entityId(entityId)
                    .entityName(entityName)
                    .entityData(entityDataJson)
                    .deletedBy(deletedBy.getId())
                    .deletedByName(deletedBy.getFirstName() + " " + deletedBy.getLastName())
                    .reason(reason)
                    .build();

            RecycleBin saved = recycleBinRepository.save(recycleBin);
            return convertToDTO(saved);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize entity data", e);
        }
    }

    @Transactional(readOnly = true)
    public List<RecycleBinDTO> getAllRecycleBinItems() {
        return recycleBinRepository.findAllByOrderByDeletedAtDesc().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RecycleBinDTO> getRecycleBinItemsByType(String entityType) {
        return recycleBinRepository.findByEntityTypeOrderByDeletedAtDesc(entityType).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get recycle bin items for organizer and their employees
     * Returns items deleted by the organizer or any of their employees
     */
    @Transactional(readOnly = true)
    public List<RecycleBinDTO> getRecycleBinItemsForOrganizer(UUID organizerId) {
        // Get all employee IDs for this organizer
        List<UUID> employeeIds = organizerEmployeeRepository.findByOrganizer_OrganizerId(organizerId)
                .stream()
                .map(OrganizerEmployee::getEmployeeId)
                .collect(Collectors.toList());
        
        // Verify organizer exists
        if (!organizerRepository.existsById(organizerId)) {
            throw new RuntimeException("Organizer not found");
        }
        
        // Get all items - then filter by deletedBy matching organizer or their employees
        return recycleBinRepository.findAllByOrderByDeletedAtDesc().stream()
                .filter(item -> {
                    UUID deletedBy = item.getDeletedBy();
                    // Skip items with null deletedBy
                    if (deletedBy == null) {
                        return false;
                    }
                    // Check if deleted by organizer or any of their employees
                    return deletedBy.equals(organizerId) || employeeIds.contains(deletedBy);
                })
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get recycle bin items by type for organizer and their employees
     */
    @Transactional(readOnly = true)
    public List<RecycleBinDTO> getRecycleBinItemsByTypeForOrganizer(String entityType, UUID organizerId) {
        // Get all employee IDs for this organizer
        List<UUID> employeeIds = organizerEmployeeRepository.findByOrganizer_OrganizerId(organizerId)
                .stream()
                .map(OrganizerEmployee::getEmployeeId)
                .collect(Collectors.toList());
        
        return recycleBinRepository.findByEntityTypeOrderByDeletedAtDesc(entityType).stream()
                .filter(item -> {
                    UUID deletedBy = item.getDeletedBy();
                    // Skip items with null deletedBy
                    if (deletedBy == null) {
                        return false;
                    }
                    return deletedBy.equals(organizerId) || employeeIds.contains(deletedBy);
                })
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RecycleBinDTO getRecycleBinItem(UUID recycleId) {
        RecycleBin recycleBin = recycleBinRepository.findById(recycleId)
                .orElseThrow(() -> new RuntimeException("Recycle bin item not found with id: " + recycleId));
        return convertToDTO(recycleBin);
    }

    @Transactional
    public void permanentlyDelete(UUID recycleId) {
        RecycleBin recycleBin = recycleBinRepository.findById(recycleId)
                .orElseThrow(() -> new RuntimeException("Recycle bin item not found with id: " + recycleId));
        
        String entityType = recycleBin.getEntityType();
        UUID entityId = recycleBin.getEntityId();
        
        // Delete the actual entity from database
        switch (entityType) {
            case "USER" -> {
                userRepository.deleteById(entityId);
                System.out.println("User permanently deleted: " + entityId);
            }
            case "ADMIN" -> {
                adminRepository.deleteById(entityId);
                System.out.println("Admin permanently deleted: " + entityId);
            }
            case "ORGANIZER" -> {
                // Delete all employees of this organizer first
                System.out.println("Deleting employees for organizer: " + entityId);
                organizerEmployeeRepository.deleteByOrganizer_OrganizerId(entityId);
                
                // Delete all events created by this organizer
                System.out.println("Deleting events for organizer: " + entityId);
                List<Event> organizerEvents = eventRepository.findByOrganizer_OrganizerId(entityId);
                for (Event event : organizerEvents) {
                    // Delete associated seats and ticket categories for each event
                    seatRepository.deleteByEventId(event.getEventId());
                    ticketCategoryRepository.deleteByEventId(event.getEventId());
                }
                eventRepository.deleteByOrganizer_OrganizerId(entityId);
                
                // Finally, delete the organizer
                organizerRepository.deleteById(entityId);
                System.out.println("Organizer permanently deleted: " + entityId);
            }
            case "ORGANIZER_EMPLOYEE" -> {
                organizerEmployeeRepository.deleteById(entityId);
                System.out.println("Organizer Employee permanently deleted: " + entityId);
            }
            case "EVENT" -> {
                // Delete associated event schedules first to avoid foreign key constraint violation
                System.out.println("Deleting event schedules for event: " + entityId);
                eventScheduleRepository.deleteByEvent_EventId(entityId);
                // Delete associated seats
                System.out.println("Deleting seats for event: " + entityId);
                seatRepository.deleteByEventId(entityId);
                // Delete associated ticket categories
                System.out.println("Deleting ticket categories for event: " + entityId);
                ticketCategoryRepository.deleteByEventId(entityId);
                // Finally, delete the event
                eventRepository.deleteById(entityId);
                System.out.println("Event permanently deleted: " + entityId);
            }
            case "VENUE" -> {
                // Delete associated template seats first to avoid foreign key constraint violation
                System.out.println("Deleting template seats for venue: " + entityId);
                seatRepository.deleteByVenueId(entityId);
                // Finally, delete the venue
                venueRepository.deleteById(entityId);
                System.out.println("Venue permanently deleted: " + entityId);
            }
            case "SCHEDULE" -> {
                eventScheduleRepository.deleteById(entityId);
                System.out.println("Event Schedule permanently deleted: " + entityId);
            }
            default -> throw new RuntimeException("Unknown entity type: " + entityType);
        }
        
        // Remove from recycle bin
        recycleBinRepository.delete(recycleBin);
    }

    @Transactional
    @SuppressWarnings("UseSpecificCatch")
    public RecycleBinDTO restoreItem(UUID recycleId) {
        RecycleBin recycleBin = recycleBinRepository.findById(recycleId)
                .orElseThrow(() -> new RuntimeException("Recycle bin item not found with id: " + recycleId));
        
        try {
            String entityType = recycleBin.getEntityType();
            
            switch (entityType) {
                case "USER" -> restoreUser(recycleBin);
                case "ADMIN" -> restoreAdmin(recycleBin);
                case "ORGANIZER" -> restoreOrganizer(recycleBin);
                case "ORGANIZER_EMPLOYEE" -> restoreOrganizerEmployee(recycleBin);
                case "EVENT" -> restoreEvent(recycleBin);
                case "VENUE" -> restoreVenue(recycleBin);
                case "SCHEDULE" -> restoreSchedule(recycleBin);
                case "EVENT_CATEGORY" -> restoreEventCategory(recycleBin);
                default -> throw new RuntimeException("Unknown entity type: " + entityType);
            }
            
            // Remove from recycle bin after successful restore
            RecycleBinDTO dto = convertToDTO(recycleBin);
            recycleBinRepository.delete(recycleBin);
            
            return dto;
        } catch (Exception e) {
            throw new RuntimeException("Failed to restore item: " + e.getMessage(), e);
        }
    }

    private void restoreUser(RecycleBin recycleBin) throws JsonProcessingException {
        User user = userRepository.findById(recycleBin.getEntityId())
                .orElseThrow(() -> new RuntimeException("User not found: " + recycleBin.getEntityId()));
        
        // Reactivate the user
        user.setActive(1);
        userRepository.save(user);
        
        System.out.println("User " + user.getEmail() + " restored from recycle bin");
    }

    private void restoreAdmin(RecycleBin recycleBin) throws JsonProcessingException {
        Admin admin = adminRepository.findById(recycleBin.getEntityId())
                .orElseThrow(() -> new RuntimeException("Admin not found: " + recycleBin.getEntityId()));
        
        // Reactivate the admin
        admin.setActive(1);
        adminRepository.save(admin);
        
        System.out.println("Admin " + admin.getEmail() + " restored from recycle bin");
    }

    private void restoreOrganizer(RecycleBin recycleBin) throws JsonProcessingException {
        Organizer organizer = organizerRepository.findById(recycleBin.getEntityId())
                .orElseThrow(() -> new RuntimeException("Organizer not found: " + recycleBin.getEntityId()));
        
        // Reactivate the organizer
        organizer.setActive(1);
        organizerRepository.save(organizer);
        
        System.out.println("Organizer " + organizer.getEmail() + " restored from recycle bin");
    }

    private void restoreOrganizerEmployee(RecycleBin recycleBin) throws JsonProcessingException {
        OrganizerEmployee employee = organizerEmployeeRepository.findById(recycleBin.getEntityId())
                .orElseThrow(() -> new RuntimeException("Organizer Employee not found: " + recycleBin.getEntityId()));
        
        // Reactivate the employee
        employee.setActive(1);
        organizerEmployeeRepository.save(employee);
        
        System.out.println("Organizer Employee " + employee.getEmail() + " restored from recycle bin");
    }

    private void restoreEvent(RecycleBin recycleBin) throws JsonProcessingException {
        Event event = eventRepository.findById(recycleBin.getEntityId())
                .orElseThrow(() -> new RuntimeException("Event not found: " + recycleBin.getEntityId()));
        
        // Reactivate the event - set active = 1 and isDeleted = false
        event.setActive(1);
        event.setIsDeleted(false);
        eventRepository.save(event);
        
        System.out.println("Event " + event.getName() + " restored from recycle bin (status=1)");
    }

    private void restoreVenue(RecycleBin recycleBin) throws JsonProcessingException {
        Venue venue = venueRepository.findById(recycleBin.getEntityId())
                .orElseThrow(() -> new RuntimeException("Venue not found: " + recycleBin.getEntityId()));
        
        // Reactivate the venue - set status to 1 (active)
        venue.setStatus(1);
        venueRepository.save(venue);
        
        System.out.println("Venue " + venue.getName() + " restored from recycle bin (status=1)");
    }

    private void restoreSchedule(RecycleBin recycleBin) throws JsonProcessingException {
        EventSchedule schedule = eventScheduleRepository.findById(recycleBin.getEntityId())
                .orElseThrow(() -> new RuntimeException("Event Schedule not found: " + recycleBin.getEntityId()));
        
        // Reactivate the schedule
        schedule.setIsDeleted(false);
        eventScheduleRepository.save(schedule);
        
        System.out.println("Event Schedule " + schedule.getScheduleId() + " restored from recycle bin");
    }

    private void restoreEventCategory(RecycleBin recycleBin) throws JsonProcessingException {
        EventCategory category = eventCategoryRepository.findById(recycleBin.getEntityId())
                .orElseThrow(() -> new RuntimeException("Event Category not found: " + recycleBin.getEntityId()));
        
        // Reactivate the category
        category.setActive(1);
        category.setUpdatedAt(LocalDateTime.now());
        eventCategoryRepository.save(category);
        
        System.out.println("Event Category " + category.getCategoryName() + " restored from recycle bin");
    }

    @Transactional
    public void emptyRecycleBin() {
        List<RecycleBin> allItems = recycleBinRepository.findAll();
        
        System.out.println("=== EMPTY RECYCLE BIN START ===");
        System.out.println("Total items to delete: " + allItems.size());
        
        // Permanently delete all actual entities first
        for (RecycleBin item : allItems) {
            String entityType = item.getEntityType();
            UUID entityId = item.getEntityId();
            
            try {
                switch (entityType) {
                    case "USER" -> {
                        if (userRepository.existsById(entityId)) {
                            userRepository.deleteById(entityId);
                            System.out.println("User permanently deleted: " + entityId);
                        } else {
                            System.out.println("User not found (already deleted): " + entityId);
                        }
                    }
                    case "ADMIN" -> {
                        if (adminRepository.existsById(entityId)) {
                            adminRepository.deleteById(entityId);
                            System.out.println("Admin permanently deleted: " + entityId);
                        } else {
                            System.out.println("Admin not found (already deleted): " + entityId);
                        }
                    }
                    case "ORGANIZER" -> {
                        if (organizerRepository.existsById(entityId)) {
                            organizerRepository.deleteById(entityId);
                            System.out.println("Organizer permanently deleted: " + entityId);
                        } else {
                            System.out.println("Organizer not found (already deleted): " + entityId);
                        }
                    }
                    case "ORGANIZER_EMPLOYEE" -> {
                        if (organizerEmployeeRepository.existsById(entityId)) {
                            organizerEmployeeRepository.deleteById(entityId);
                            System.out.println("Organizer Employee permanently deleted: " + entityId);
                        } else {
                            System.out.println("Organizer Employee not found (already deleted): " + entityId);
                        }
                    }
                    case "EVENT" -> {
                        if (eventRepository.existsById(entityId)) {
                            // Delete associated event schedules first
                            System.out.println("Deleting event schedules for event: " + entityId);
                            eventScheduleRepository.deleteByEvent_EventId(entityId);
                            // Delete associated employee assignments
                            System.out.println("Deleting event employee assignments for event: " + entityId);
                            eventEmployeeAssignmentRepository.deleteByEvent_EventId(entityId);
                            // Delete associated seats and ticket categories
                            System.out.println("Deleting seats for event: " + entityId);
                            seatRepository.deleteByEventId(entityId);
                            System.out.println("Deleting ticket categories for event: " + entityId);
                            ticketCategoryRepository.deleteByEventId(entityId);
                            System.out.println("Deleting event: " + entityId);
                            eventRepository.deleteById(entityId);
                            System.out.println("Event permanently deleted: " + entityId);
                        } else {
                            System.out.println("Event not found (already deleted): " + entityId);
                        }
                    }
                    case "VENUE" -> {
                        if (venueRepository.existsById(entityId)) {
                            // Delete associated template seats first
                            System.out.println("Deleting template seats for venue: " + entityId);
                            seatRepository.deleteByVenueId(entityId);
                            venueRepository.deleteById(entityId);
                            System.out.println("Venue permanently deleted: " + entityId);
                        } else {
                            System.out.println("Venue not found (already deleted): " + entityId);
                        }
                    }
                    case "EVENT_CATEGORY" -> {
                        if (eventCategoryRepository.existsById(entityId)) {
                            eventCategoryRepository.deleteById(entityId);
                            System.out.println("Event Category permanently deleted: " + entityId);
                        } else {
                            System.out.println("Event Category not found (already deleted): " + entityId);
                        }
                    }
                    default -> System.err.println("Unknown entity type: " + entityType);
                }
            } catch (Exception e) {
                System.err.println("ERROR deleting entity " + entityId + " (" + entityType + "): " + e.getClass().getSimpleName() + " - " + e.getMessage());
                e.printStackTrace();
                // Don't throw - continue with other items
            }
        }
        
        // Then clear the recycle bin
        recycleBinRepository.deleteAll();
        System.out.println("Recycle bin emptied successfully");
    }

    @Transactional
    public void emptyRecycleBinByType(String entityType) {
        List<RecycleBin> items = recycleBinRepository.findByEntityType(entityType);
        
        System.out.println("EMPTY RECYCLE BIN BY TYPE: " + entityType + "");
        System.out.println("Total " + entityType + " items to delete: " + items.size());
        
        // Permanently delete all actual entities of this type first
        for (RecycleBin item : items) {
            UUID entityId = item.getEntityId();
            
            try {
                switch (entityType) {
                    case "USER" -> {
                        if (userRepository.existsById(entityId)) {
                            userRepository.deleteById(entityId);
                            System.out.println("User permanently deleted: " + entityId);
                        } else {
                            System.out.println("User not found (already deleted): " + entityId);
                        }
                    }
                    case "EVENT" -> {
                        if (eventRepository.existsById(entityId)) {
                            // Delete associated event schedules first
                            System.out.println("Deleting event schedules for event: " + entityId);
                            eventScheduleRepository.deleteByEvent_EventId(entityId);
                            // Delete associated employee assignments
                            System.out.println("Deleting event employee assignments for event: " + entityId);
                            eventEmployeeAssignmentRepository.deleteByEvent_EventId(entityId);
                            // Delete associated seats and ticket categories
                            seatRepository.deleteByEventId(entityId);
                            ticketCategoryRepository.deleteByEventId(entityId);
                            eventRepository.deleteById(entityId);
                            System.out.println("Event permanently deleted: " + entityId);
                        } else {
                            System.out.println("Event not found (already deleted): " + entityId);
                        }
                    }
                    case "VENUE" -> {
                        if (venueRepository.existsById(entityId)) {
                            // Delete associated template seats first
                            System.out.println("Deleting template seats for venue: " + entityId);
                            seatRepository.deleteByVenueId(entityId);
                            venueRepository.deleteById(entityId);
                            System.out.println("Venue permanently deleted: " + entityId);
                        } else {
                            System.out.println("Venue not found (already deleted): " + entityId);
                        }
                    }
                    case "SCHEDULE" -> {
                        if (eventScheduleRepository.existsById(entityId)) {
                            eventScheduleRepository.deleteById(entityId);
                            System.out.println("Event Schedule permanently deleted: " + entityId);
                        } else {
                            System.out.println("Event Schedule not found (already deleted): " + entityId);
                        }
                    }
                    case "EVENT_CATEGORY" -> {
                        if (eventCategoryRepository.existsById(entityId)) {
                            eventCategoryRepository.deleteById(entityId);
                            System.out.println("Event Category permanently deleted: " + entityId);
                        } else {
                            System.out.println("Event Category not found (already deleted): " + entityId);
                        }
                    }
                    default -> System.err.println("Unknown entity type: " + entityType);
                }
            } catch (Exception e) {
                System.err.println("ERROR deleting entity " + entityId + " (" + entityType + "): " + e.getClass().getSimpleName() + " - " + e.getMessage());
                e.printStackTrace();
                // Don't throw - continue with other items
            }
        }
        
        // Then remove from recycle bin
        recycleBinRepository.deleteAll(items);
        System.out.println("Recycle bin emptied for type: " + entityType);
    }

    // Helper method to permanently delete an entity from database
    @SuppressWarnings("unused")
    private void permanentlyDeleteEntity(String entityType, UUID entityId) {
        try {
            switch (entityType.toUpperCase()) {
                case "USER" -> {
                    if (userRepository.existsById(entityId)) {
                        userRepository.deleteById(entityId);
                    }
                }
                case "ORGANIZER" -> {
                    if (organizerRepository.existsById(entityId)) {
                        organizerRepository.deleteById(entityId);
                    }
                }
                case "ORGANIZER_EMPLOYEE" -> {
                    if (organizerEmployeeRepository.existsById(entityId)) {
                        organizerEmployeeRepository.deleteById(entityId);
                    }
                }
                case "ADMIN" -> {
                    if (adminRepository.existsById(entityId)) {
                        adminRepository.deleteById(entityId);
                    }
                }
                case "EVENT" -> {
                    if (eventRepository.existsById(entityId)) {
                        seatRepository.deleteByEventId(entityId);
                        ticketCategoryRepository.deleteByEventId(entityId);
                        eventRepository.deleteById(entityId);
                    }
                }
                case "VENUE" -> {
                    if (venueRepository.existsById(entityId)) {
                        seatRepository.deleteByVenueId(entityId);
                        venueRepository.deleteById(entityId);
                    }
                }
                case "EVENT_CATEGORY" -> {
                    if (eventCategoryRepository.existsById(entityId)) {
                        eventCategoryRepository.deleteById(entityId);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("ERROR deleting entity " + entityId + " (" + entityType + "): " + e.getMessage());
        }
    }

    private RecycleBinDTO convertToDTO(RecycleBin recycleBin) {
        return RecycleBinDTO.builder()
                .recycleId(recycleBin.getRecycleId())
                .entityType(recycleBin.getEntityType())
                .entityId(recycleBin.getEntityId())
                .entityName(recycleBin.getEntityName())
                .entityData(recycleBin.getEntityData())
                .deletedBy(recycleBin.getDeletedBy())
                .deletedByName(recycleBin.getDeletedByName())
                .deletedAt(recycleBin.getDeletedAt())
                .reason(recycleBin.getReason())
                .build();
    }
}
