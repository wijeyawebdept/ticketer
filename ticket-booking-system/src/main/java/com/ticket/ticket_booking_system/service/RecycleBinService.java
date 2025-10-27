package com.ticket.ticket_booking_system.service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.ticket.ticket_booking_system.dto.RecycleBinDTO;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.RecycleBin;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.entity.Venue;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.RecycleBinRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.repository.VenueRepository;

@Service
public class RecycleBinService {

    private final RecycleBinRepository recycleBinRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final VenueRepository venueRepository;
    private final ObjectMapper objectMapper;

    public RecycleBinService(
            RecycleBinRepository recycleBinRepository,
            UserRepository userRepository,
            EventRepository eventRepository,
            VenueRepository venueRepository) {
        this.recycleBinRepository = recycleBinRepository;
        this.userRepository = userRepository;
        this.eventRepository = eventRepository;
        this.venueRepository = venueRepository;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
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
            case "USER":
                userRepository.deleteById(entityId);
                System.out.println("🗑️ User permanently deleted: " + entityId);
                break;
            case "EVENT":
                eventRepository.deleteById(entityId);
                System.out.println("🗑️ Event permanently deleted: " + entityId);
                break;
            case "VENUE":
                venueRepository.deleteById(entityId);
                System.out.println("🗑️ Venue permanently deleted: " + entityId);
                break;
            default:
                throw new RuntimeException("Unknown entity type: " + entityType);
        }
        
        // Remove from recycle bin
        recycleBinRepository.delete(recycleBin);
    }

    @Transactional
    public RecycleBinDTO restoreItem(UUID recycleId) {
        RecycleBin recycleBin = recycleBinRepository.findById(recycleId)
                .orElseThrow(() -> new RuntimeException("Recycle bin item not found with id: " + recycleId));
        
        try {
            String entityType = recycleBin.getEntityType();
            
            switch (entityType) {
                case "USER":
                    restoreUser(recycleBin);
                    break;
                case "EVENT":
                    restoreEvent(recycleBin);
                    break;
                case "VENUE":
                    restoreVenue(recycleBin);
                    break;
                default:
                    throw new RuntimeException("Unknown entity type: " + entityType);
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
        user.setActive(true);
        userRepository.save(user);
        
        System.out.println("✅ User " + user.getEmail() + " restored from recycle bin");
    }

    private void restoreEvent(RecycleBin recycleBin) throws JsonProcessingException {
        Event event = eventRepository.findById(recycleBin.getEntityId())
                .orElseThrow(() -> new RuntimeException("Event not found: " + recycleBin.getEntityId()));
        
        // Reactivate the event
        event.setIsDeleted(false);
        eventRepository.save(event);
        
        System.out.println("✅ Event " + event.getName() + " restored from recycle bin");
    }

    private void restoreVenue(RecycleBin recycleBin) throws JsonProcessingException {
        Venue venue = venueRepository.findById(recycleBin.getEntityId())
                .orElseThrow(() -> new RuntimeException("Venue not found: " + recycleBin.getEntityId()));
        
        // Reactivate the venue
        venue.setIsDeleted(false);
        venueRepository.save(venue);
        
        System.out.println("✅ Venue " + venue.getName() + " restored from recycle bin");
    }

    @Transactional
    public void emptyRecycleBin() {
        List<RecycleBin> allItems = recycleBinRepository.findAll();
        
        // Permanently delete all actual entities first
        for (RecycleBin item : allItems) {
            String entityType = item.getEntityType();
            UUID entityId = item.getEntityId();
            
            try {
                switch (entityType) {
                    case "USER":
                        userRepository.deleteById(entityId);
                        System.out.println("🗑️ User permanently deleted: " + entityId);
                        break;
                    case "EVENT":
                        eventRepository.deleteById(entityId);
                        System.out.println("🗑️ Event permanently deleted: " + entityId);
                        break;
                    case "VENUE":
                        venueRepository.deleteById(entityId);
                        System.out.println("🗑️ Venue permanently deleted: " + entityId);
                        break;
                    default:
                        System.err.println("⚠️ Unknown entity type: " + entityType);
                }
            } catch (Exception e) {
                System.err.println("⚠️ Failed to delete entity " + entityId + ": " + e.getMessage());
            }
        }
        
        // Then clear the recycle bin
        recycleBinRepository.deleteAll();
        System.out.println("✅ Recycle bin emptied successfully");
    }

    @Transactional
    public void emptyRecycleBinByType(String entityType) {
        List<RecycleBin> items = recycleBinRepository.findByEntityType(entityType);
        
        // Permanently delete all actual entities of this type first
        for (RecycleBin item : items) {
            UUID entityId = item.getEntityId();
            
            try {
                switch (entityType) {
                    case "USER":
                        userRepository.deleteById(entityId);
                        System.out.println("🗑️ User permanently deleted: " + entityId);
                        break;
                    case "EVENT":
                        eventRepository.deleteById(entityId);
                        System.out.println("🗑️ Event permanently deleted: " + entityId);
                        break;
                    case "VENUE":
                        venueRepository.deleteById(entityId);
                        System.out.println("🗑️ Venue permanently deleted: " + entityId);
                        break;
                    default:
                        System.err.println("⚠️ Unknown entity type: " + entityType);
                }
            } catch (Exception e) {
                System.err.println("⚠️ Failed to delete entity " + entityId + ": " + e.getMessage());
            }
        }
        
        // Then remove from recycle bin
        recycleBinRepository.deleteAll(items);
        System.out.println("✅ Recycle bin emptied for type: " + entityType);
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
