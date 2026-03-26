package com.ticket.ticket_booking_system.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "recycle_bin")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecycleBin {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "recycle_id", columnDefinition = "UUID")
    private UUID recycleId;

    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType; // USER, EVENT, VENUE

    @Column(name = "entity_id", nullable = false, columnDefinition = "UUID")
    private UUID entityId;

    @Column(name = "entity_name", nullable = false, length = 255)
    private String entityName;

    @Column(name = "entity_data", columnDefinition = "TEXT")
    private String entityData; // JSON string of the entity data

    @Column(name = "deleted_by", nullable = false, columnDefinition = "UUID")
    private UUID deletedBy;

    @Column(name = "deleted_by_name", length = 255)
    private String deletedByName;

    @Column(name = "deleted_at", nullable = false)
    private LocalDateTime deletedAt;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @PrePersist
    protected void onCreate() {
        if (deletedAt == null) {
            deletedAt = LocalDateTime.now();
        }
    }
}
