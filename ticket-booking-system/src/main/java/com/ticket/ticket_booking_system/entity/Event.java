package com.ticket.ticket_booking_system.entity;


import java.time.LocalDateTime;
import java.util.List;
import org.hibernate.annotations.UuidGenerator;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "organizer", "venue", "schedules"})
@Table(name = "events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Event {

    @Id
    @Column(name = "event_id")
    @GeneratedValue
    @UuidGenerator
    private java.util.UUID eventId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id")
    private Venue venue;

    @Column(name = "venue_name", length = 255)
    private String venueName;

    @Column(name = "venue_address", columnDefinition = "TEXT")
    private String venueAddress;



    @Column(name = "total_capacity", nullable = false)
    private Integer totalCapacity;

    @Column(name = "available_seats", nullable = false)
    private Integer availableSeats;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventStatus status;

    @Builder.Default
    @Column(name = "active", nullable = false)
    private int active = 1; // 1 = active, 0 = deactivated, -1 = soft deleted

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "slug", length = 255, unique = true)
    private String slug;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    private EventCategory category;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organizer_id")
    private Organizer organizer;

    // Creator reference - can be User, Admin, or Organizer
    // Store the UUID and type separately since creator can be from different tables
    @Column(name = "created_by_user_id", nullable = false)
    private java.util.UUID createdByUserId;
    
    @Column(name = "created_by_type", nullable = false, length = 20)
    private String createdByType; // "USER", "ADMIN", "SUPER_ADMIN", "ORGANIZER"

    // Added ticket categories relationship
    @JsonIgnore
    @OneToMany(mappedBy = "event", fetch = FetchType.LAZY)
    @org.hibernate.annotations.BatchSize(size = 20)
    private List<TicketCategory> ticketCategories;

    @JsonIgnore
    @OneToMany(mappedBy = "event", fetch = FetchType.LAZY)
    @org.hibernate.annotations.BatchSize(size = 20)
    private List<EventEmployeeAssignment> employeeAssignments;

    @OneToMany(mappedBy = "event", fetch = FetchType.LAZY, cascade = jakarta.persistence.CascadeType.ALL)
    @org.hibernate.annotations.BatchSize(size = 20)
    private List<EventSchedule> schedules;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) {
            status = EventStatus.DRAFT;
        }
        if (slug == null || slug.isEmpty()) {
            generateSlug();
        }
    }

    public void generateSlug() {
        if (this.name == null) return;
        String baseSlug = this.name.toLowerCase()
                .replaceAll("[^a-z0-9\\s]", "")
                .replaceAll("\\s+", "-");
        
        // Append first 8 chars of UUID to ensure uniqueness if possible, 
        // or just let the database unique constraint handle it for now.
        // For better UX, we'll just use the name and append a short random string if needed.
        this.slug = baseSlug + "-" + java.util.UUID.randomUUID().toString().substring(0, 8);
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum EventStatus {
        DRAFT, PUBLISHED, CANCELLED, COMPLETED, POSTPONED, PENDING_APPROVAL, REJECTED
    }

    @Builder.Default
    @Column(name = "notification_sent", nullable = false, columnDefinition = "boolean default false")
    private Boolean notificationSent = false;

    @Column(name = "admin_feedback", columnDefinition = "TEXT")
    private String adminFeedback;

    // Add compatibility methods to support existing code
    public java.util.UUID getId() {
        return eventId;
    }

    public void setId(java.util.UUID id) {
        this.eventId = id;
    }
}