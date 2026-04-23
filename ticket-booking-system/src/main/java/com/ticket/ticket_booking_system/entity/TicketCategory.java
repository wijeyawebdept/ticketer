package com.ticket.ticket_booking_system.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "ticket_categories")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketCategory {

    @Id
    @Column(name = "category_id")
    @GeneratedValue
    @UuidGenerator
    private UUID categoryId;

    @Column(nullable = false, length = 100)
    private String categoryName;

    @Column(nullable = false)
    private BigDecimal price;

    @Column(nullable = false)
    private Integer capacity;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;
    
    // Shared area support
    @Builder.Default
    @Column(name = "is_shared_area")
    private Boolean isSharedArea = false;
    
    @Column(name = "shared_area_number")
    private Integer sharedAreaNumber;

    // Deal fields – original price is never changed; discounted price is computed dynamically
    @Builder.Default
    @Column(name = "deal_active")
    private Boolean dealActive = false;

    /** Which kind of deal is active. Defaults to PERCENTAGE_DISCOUNT for backward-compat. */
    @Column(name = "deal_type", length = 30)
    private String dealType; // "PERCENTAGE_DISCOUNT" | "BUY_X_GET_Y_FREE"

    // --- PERCENTAGE_DISCOUNT fields ---
    @Column(name = "deal_discount_percentage", precision = 5, scale = 2)
    private java.math.BigDecimal dealDiscountPercentage;

    // --- BUY_X_GET_Y_FREE fields ---
    @Column(name = "deal_buy_quantity")
    private Integer dealBuyQuantity;   // e.g. 5  → "buy 5 …"

    @Column(name = "deal_free_quantity")
    private Integer dealFreeQuantity;  // e.g. 1  → "… get 1 free"

    @Column(name = "deal_label", length = 150)
    private String dealLabel;

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

    // Add compatibility methods
    public UUID getId() {
        return categoryId;
    }

    public void setId(UUID id) {
        this.categoryId = id;
    }
}