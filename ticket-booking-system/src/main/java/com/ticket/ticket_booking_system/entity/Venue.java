package com.ticket.ticket_booking_system.entity;

import java.time.LocalDateTime;
import org.hibernate.annotations.UuidGenerator;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.OneToMany;
import jakarta.persistence.CascadeType;
import jakarta.persistence.FetchType;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "venues")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Venue {

    @Id
    @Column(name = "venue_id")
    @GeneratedValue
    @UuidGenerator
    private java.util.UUID venueId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false)
    private String city;

    @Column(nullable = false, length = 50)
    private String state;

    @Column(nullable = false, length = 10)
    private String zipCode;

    @Column(nullable = false)
    private Integer capacity;
    
    // Shared/common areas support
    @Builder.Default
    @Column(name = "has_shared_areas")
    private Boolean hasSharedAreas = false;
    
    @Builder.Default
    @Column(name = "shared_area_count")
    private Integer sharedAreaCount = 0;
    
    @Builder.Default
    @Column(name = "shared_area_total_capacity")
    private Integer sharedAreaTotalCapacity = 0;

    @OneToMany(mappedBy = "venue", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @org.hibernate.annotations.BatchSize(size = 20)
    private List<SeatCategory> seatCategories;

    @OneToMany(mappedBy = "venue", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @org.hibernate.annotations.BatchSize(size = 50)
    private List<VenueSeat> seats;
    


    @Builder.Default
    @Column(name = "status", nullable = false)
    private Integer status = 1; // 1 = active, 0 = inactive, -1 = soft deleted (in recycle bin)

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // Add compatibility methods to support existing code
    public java.util.UUID getId() {
        return venueId;
    }
    
    public void setId(java.util.UUID id) {
        this.venueId = id;
    }
}