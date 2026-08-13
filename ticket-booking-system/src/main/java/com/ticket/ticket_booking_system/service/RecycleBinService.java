package com.ticket.ticket_booking_system.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.ticket.ticket_booking_system.dto.RecycleBinDTO;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Booking;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.EventCategory;
import com.ticket.ticket_booking_system.entity.EventSchedule;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.entity.RecycleBin;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.entity.Venue;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.BookingRepository;
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
import com.ticket.ticket_booking_system.repository.BlogPostRepository;
import com.ticket.ticket_booking_system.entity.BlogPost;

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
    private final BlogPostRepository blogPostRepository;
    private final BookingRepository bookingRepository;
    private final PlatformTransactionManager transactionManager;
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
            EventEmployeeAssignmentRepository eventEmployeeAssignmentRepository,
            BlogPostRepository blogPostRepository,
            BookingRepository bookingRepository,
            PlatformTransactionManager transactionManager) {
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
        this.blogPostRepository = blogPostRepository;
        this.bookingRepository = bookingRepository;
        this.transactionManager = transactionManager;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        // Configure ObjectMapper to handle Hibernate lazy loading and empty beans
        this.objectMapper.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false);
        this.objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    /**
     * Delete all Bookings for an event before the event itself is permanently deleted.
     * Cascades (CascadeType.ALL on Booking.bookingSeats / Booking.transactions) take care
     * of BookingSeat and Transaction rows, avoiding an FK violation on the event delete.
     */
    private void deleteEventBookingsAndDependencies(UUID eventId) {
        List<Booking> eventBookings = bookingRepository.findByEvent_EventId(eventId);
        if (!eventBookings.isEmpty()) {
            bookingRepository.deleteAll(eventBookings);
        }
        eventScheduleRepository.deleteByEvent_EventId(eventId);
        eventEmployeeAssignmentRepository.deleteByEvent_EventId(eventId);
        seatRepository.deleteByEventId(eventId);
        ticketCategoryRepository.deleteByEventId(eventId);
    }

    /**
     * Permanently delete one recycle-bin entity by type, cleaning up dependent rows first
     * so the delete doesn't fail on a foreign-key constraint. Shared by permanentlyDelete(),
     * emptyRecycleBin() and emptyRecycleBinByType() so all three stay consistent.
     */
    private void deleteEntityPermanently(String entityType, UUID entityId) {
        switch (entityType) {
            case "USER" -> {
                if (userRepository.existsById(entityId)) {
                    // Detach (rather than delete) their bookings so revenue/audit history survives
                    List<Booking> userBookings = bookingRepository.findByUser_Id(entityId);
                    if (!userBookings.isEmpty()) {
                        userBookings.forEach(b -> b.setUser(null));
                        bookingRepository.saveAll(userBookings);
                    }
                    userRepository.deleteById(entityId);
                }
            }
            case "ADMIN" -> {
                if (adminRepository.existsById(entityId)) {
                    adminRepository.deleteById(entityId);
                }
            }
            case "ORGANIZER" -> {
                if (organizerRepository.existsById(entityId)) {
                    organizerEmployeeRepository.deleteByOrganizer_OrganizerId(entityId);
                    List<Event> organizerEvents = eventRepository.findByOrganizer_OrganizerId(entityId);
                    for (Event event : organizerEvents) {
                        deleteEventBookingsAndDependencies(event.getEventId());
                    }
                    eventRepository.deleteByOrganizer_OrganizerId(entityId);
                    organizerRepository.deleteById(entityId);
                }
            }
            case "ORGANIZER_EMPLOYEE" -> {
                if (organizerEmployeeRepository.existsById(entityId)) {
                    organizerEmployeeRepository.deleteById(entityId);
                }
            }
            case "EVENT" -> {
                if (eventRepository.existsById(entityId)) {
                    deleteEventBookingsAndDependencies(entityId);
                    eventRepository.deleteById(entityId);
                }
            }
            case "VENUE" -> {
                if (venueRepository.existsById(entityId)) {
                    seatRepository.deleteByVenueId(entityId);
                    venueRepository.deleteById(entityId);
                }
            }
            case "SCHEDULE" -> {
                if (eventScheduleRepository.existsById(entityId)) {
                    eventScheduleRepository.deleteById(entityId);
                }
            }
            case "EVENT_CATEGORY" -> {
                if (eventCategoryRepository.existsById(entityId)) {
                    eventCategoryRepository.deleteById(entityId);
                }
            }
            case "BLOG" -> {
                if (blogPostRepository.existsById(entityId)) {
                    blogPostRepository.deleteById(entityId);
                }
            }
            default -> throw new RuntimeException("Unknown entity type: " + entityType);
        }
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
                .map(emp -> emp.getEmployeeId())
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
                .map(emp -> emp != null ? emp.getEmployeeId() : null)
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
        
        deleteEntityPermanently(recycleBin.getEntityType(), recycleBin.getEntityId());

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
                case "BLOG" -> restoreBlog(recycleBin);
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

    private void restoreBlog(RecycleBin recycleBin) throws JsonProcessingException {
        BlogPost post = blogPostRepository.findById(recycleBin.getEntityId())
                .orElseThrow(() -> new RuntimeException("Blog post not found: " + recycleBin.getEntityId()));
        
        post.setIsDeleted(false);
        blogPostRepository.save(post);
        
        System.out.println("Blog Post " + post.getTitle() + " restored from recycle bin");
    }

    public void emptyRecycleBin() {
        List<RecycleBin> allItems = recycleBinRepository.findAll();

        System.out.println("=== EMPTY RECYCLE BIN START ===");
        System.out.println("Total items to delete: " + allItems.size());

        int deletedCount = purgeItemsEachInOwnTransaction(allItems);

        System.out.println("Recycle bin empty finished: " + deletedCount + "/" + allItems.size()
                + " permanently deleted; any remaining items failed (see errors above) and are still in the recycle bin.");
    }

    public void emptyRecycleBinByType(String entityType) {
        List<RecycleBin> items = recycleBinRepository.findByEntityType(entityType);

        System.out.println("EMPTY RECYCLE BIN BY TYPE: " + entityType);
        System.out.println("Total " + entityType + " items to delete: " + items.size());

        int deletedCount = purgeItemsEachInOwnTransaction(items);

        System.out.println("Recycle bin empty (" + entityType + ") finished: " + deletedCount + "/" + items.size() + " permanently deleted.");
    }

    /**
     * Permanently delete each recycle-bin item in its own REQUIRES_NEW transaction, so a
     * failure on one item (e.g. an unhandled FK constraint) rolls back only that item instead
     * of poisoning the whole batch - which previously made "Empty Recycle Bin" fail entirely
     * with a Postgres "current transaction is aborted" error as soon as any single item failed.
     */
    private int purgeItemsEachInOwnTransaction(List<RecycleBin> items) {
        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);
        txTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        int deletedCount = 0;
        for (RecycleBin item : items) {
            UUID recycleId = item.getRecycleId();
            String entityType = item.getEntityType();
            UUID entityId = item.getEntityId();

            try {
                txTemplate.executeWithoutResult(status -> {
                    deleteEntityPermanently(entityType, entityId);
                    recycleBinRepository.deleteById(recycleId);
                });
                deletedCount++;
                System.out.println(entityType + " " + entityId + " permanently deleted");
            } catch (Exception e) {
                System.err.println("ERROR permanently deleting " + entityType + " " + entityId
                        + ": " + e.getClass().getSimpleName() + " - " + e.getMessage());
            }
        }
        return deletedCount;
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
                case "BLOG" -> {
                    if (blogPostRepository.existsById(entityId)) {
                        blogPostRepository.deleteById(entityId);
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
