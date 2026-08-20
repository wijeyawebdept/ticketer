package com.ticket.ticket_booking_system.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.dto.request.InitiatePaymentRequest;
import com.ticket.ticket_booking_system.dto.request.ValidatePromoCodeRequest;
import com.ticket.ticket_booking_system.dto.response.BookingResponse;
import com.ticket.ticket_booking_system.dto.response.ValidatePromoCodeResponse;
import com.ticket.ticket_booking_system.entity.Booking;
import com.ticket.ticket_booking_system.entity.BookingSeat;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.EventSchedule;
import com.ticket.ticket_booking_system.entity.TicketCategory;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.entity.Transaction;
import com.ticket.ticket_booking_system.entity.VenueSeat;
import com.ticket.ticket_booking_system.repository.BookingRepository;
import com.ticket.ticket_booking_system.repository.TransactionRepository;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.EventScheduleRepository;
import com.ticket.ticket_booking_system.repository.TicketCategoryRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.repository.VenueSeatRepository;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class BookingService {

    private final BookingRepository bookingRepository;
    private final EventRepository eventRepository;
    private final EventScheduleRepository eventScheduleRepository;
    private final EventScheduleService eventScheduleService;
    private final UserRepository userRepository;
    private final VenueSeatRepository venueSeatRepository;
    private final TransactionRepository transactionRepository;
    private final EmailService emailService;
    private final AdminAuditService auditService;
    private final TicketCategoryRepository ticketCategoryRepository;
    private final PromoCodeService promoCodeService;

    @Value("${booking.pending-timeout-minutes:20}")
    private int pendingTimeoutMinutes;

    private static final AtomicBoolean pendingCleanupRunning = new AtomicBoolean(false);

    /**
     * Scheduled task to auto-cancel PENDING bookings whose payment was never completed
     * (abandoned checkout, silent gateway failure, closed tab, etc.) and release their seats
     * back to availability for other customers. A booking only ever reaches CONFIRMED via an
     * explicit successful payment, so anything still PENDING past the timeout never paid.
     */
    @Scheduled(fixedDelay = 60000, initialDelay = 30000) // every minute, 30s initial delay
    public void releaseStalePendingBookings() {
        if (!pendingCleanupRunning.compareAndSet(false, true)) {
            log.debug("Stale pending booking cleanup already running, skipping this execution");
            return;
        }

        try {
            LocalDateTime cutoff = LocalDateTime.now().minusMinutes(pendingTimeoutMinutes);
            List<Booking> staleBookings = bookingRepository.findStalePendingBookings(cutoff);

            if (staleBookings.isEmpty()) {
                log.debug("No stale PENDING bookings older than {} minutes to release", pendingTimeoutMinutes);
                return;
            }

            for (Booking booking : staleBookings) {
                try {
                    cancelBookingAfterPaymentFailure(booking.getBookingId(),
                            "Payment not completed within " + pendingTimeoutMinutes + " minutes - seat released automatically");
                } catch (Exception e) {
                    log.error("Failed to auto-release stale pending booking {}", booking.getBookingId(), e);
                }
            }

            log.info("Released {} stale PENDING booking(s) older than {} minutes", staleBookings.size(), pendingTimeoutMinutes);
        } catch (Exception e) {
            log.error("Error during stale pending booking cleanup", e);
        } finally {
            pendingCleanupRunning.set(false);
        }
    }

    /**
     * Create a PENDING booking before payment is processed
     * This reserves the booking record but doesn't confirm it or update seat availability
     *
     * @param userId User ID
     * @param request Payment initiation request
     * @return Pending booking
     */
    public Booking createPendingBooking(UUID userId, InitiatePaymentRequest request) {
        log.info("Creating PENDING booking for user {} with event {} and schedule {}",
                userId, request.getEventId(), request.getScheduleId());

        // Fetch required entities
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new RuntimeException("Event not found with ID: " + request.getEventId()));

        EventSchedule schedule = eventScheduleRepository.findById(request.getScheduleId())
                .orElseThrow(() -> new RuntimeException("Schedule not found with ID: " + request.getScheduleId()));

        LocalDateTime cutoffTime = event.getTicketCutoffTime();
        if (cutoffTime == null) {
            EventSchedule firstSchedule = event.getSchedules().stream()
                .min(java.util.Comparator.comparing(s -> LocalDateTime.of(s.getScheduleDate(), s.getStartTime())))
                .orElse(schedule);
            cutoffTime = LocalDateTime.of(firstSchedule.getScheduleDate(), firstSchedule.getStartTime()).minusHours(12);
        }
        
        // Enforce Sri Lankan Time (Asia/Colombo) for current time check
        java.time.ZoneId lkZone = java.time.ZoneId.of("Asia/Colombo");
        LocalDateTime nowLK = LocalDateTime.now(lkZone);
        
        if (nowLK.isAfter(cutoffTime)) {
            throw new RuntimeException("Online ticket sales for this event have closed.");
        }

        // ─── SECURITY: recompute the charge from ticket prices stored in the DB. ───
        // request.getTotalAmount()/getDiscountAmount() are attacker-controlled — a client could
        // request real, valid seats/tickets while declaring an arbitrary (e.g. near-zero) amount.
        // The only trustworthy inputs from the request are WHICH seats/tickets were selected;
        // the price for each of them is always looked up server-side.
        BookingPricing pricing = calculateBookingPricing(event, request, nowLK);

        // Create PENDING booking (not confirmed yet)
        Booking booking = Booking.builder()
                .user(user)
                .event(event)
                .eventSchedule(schedule)
                .totalAmount(pricing.totalAmount)
                .status(Booking.BookingStatus.PENDING)
                .bookingReference(generateBookingReference())
                .attended(false)
                .currency(request.getCurrency())
                .build();

        // Add seat bookings if any (using VenueSeat with String ID), priced from the
        // server-side calculation above — never from the client-supplied total.
        if (request.getSeatIds() != null && !request.getSeatIds().isEmpty()) {
            for (String seatId : request.getSeatIds()) {
                venueSeatRepository.findById(seatId)
                        .orElseThrow(() -> new RuntimeException("VenueSeat not found with ID: " + seatId));

                BookingSeat bookingSeat = BookingSeat.builder()
                        .event(event) // Set the event (required by database constraint)
                        .venueSeatId(seatId) // Store the VenueSeat ID
                        .priceAtBooking(pricing.seatPrices.getOrDefault(seatId, BigDecimal.ZERO))
                        .ticketCode(generateTicketCode())
                        .isSharedAreaTicket(false)
                        .build();

                booking.addSeat(bookingSeat);
            }
        }

        // Add shared area tickets if any
        if (request.getSharedAreaTickets() != null && !request.getSharedAreaTickets().isEmpty()) {
            int sharedAreaTicketIndex = 0;
            for (InitiatePaymentRequest.SharedAreaTicketRequest sharedAreaTicket : request.getSharedAreaTickets()) {
                for (int i = 0; i < sharedAreaTicket.getTicketCount(); i++) {
                    BigDecimal price = pricing.sharedAreaPrices.get(sharedAreaTicketIndex++);
                    BookingSeat bookingSeat = BookingSeat.builder()
                            .event(event) // Set the event (required by database constraint)
                            .priceAtBooking(price != null ? price : BigDecimal.ZERO)
                            .ticketCode(generateTicketCode())
                            .isSharedAreaTicket(true)
                            .sharedAreaNumber(sharedAreaTicket.getSharedAreaNumber())
                            .build();

                    booking.addSeat(bookingSeat);
                }

                log.info("Added {} shared area tickets for area {} ({})",
                        sharedAreaTicket.getTicketCount(),
                        sharedAreaTicket.getSharedAreaNumber(),
                        sharedAreaTicket.getCategoryName());
            }
        }

        // NOTE: Do NOT update schedule availability yet - only after payment confirmation

        // Set customer details and booking details
        if (request.getCustomerInfo() != null) {
            booking.setCustomerEmail(request.getCustomerInfo().getEmail());
            booking.setCustomerPhone(request.getCustomerInfo().getPhone());
            booking.setCustomerNic(request.getCustomerInfo().getNic());
        } else {
            booking.setCustomerEmail(user.getEmail());
            booking.setCustomerPhone(user.getPhoneNumber());
        }

        booking.setNumberOfTickets(booking.getBookingSeats().size());
        booking.setFinalAmount(pricing.totalAmount);
        booking.setDiscountAmount(pricing.discountAmount);

        Booking savedBooking = bookingRepository.save(booking);
        log.info("PENDING booking created with reference: {} for customer: {}, server-calculated amount: {}",
                savedBooking.getBookingReference(), user.getEmail(), pricing.totalAmount);

        return savedBooking;
    }

    /**
     * Result of a server-side price calculation for a booking request.
     */
    private static class BookingPricing {
        BigDecimal totalAmount;
        BigDecimal discountAmount;
        final Map<String, BigDecimal> seatPrices = new HashMap<>();
        final List<BigDecimal> sharedAreaPrices = new ArrayList<>();
    }

    /**
     * Recalculates what a booking should cost purely from TicketCategory prices stored in the
     * database (base price, early-bird price if currently active, and any active deal), plus a
     * server-revalidated promo code discount. Nothing here is taken from the client's declared
     * amounts — only which seats/shared-area tickets were selected is trusted from the request.
     */
    private BookingPricing calculateBookingPricing(Event event, InitiatePaymentRequest request, LocalDateTime now) {
        BookingPricing pricing = new BookingPricing();

        List<TicketCategory> eventCategories = ticketCategoryRepository.findByEventId(event.getEventId());

        // venueSeatCategoryName -> TicketCategory (falls back to categoryName), same resolution
        // rule used to price seats on the seat-availability endpoint the customer sees.
        Map<String, TicketCategory> seatCategoryMap = new HashMap<>();
        for (TicketCategory tc : eventCategories) {
            if (!Boolean.TRUE.equals(tc.getIsSharedArea())) {
                if (tc.getVenueSeatCategoryName() != null && !tc.getVenueSeatCategoryName().isBlank()) {
                    seatCategoryMap.put(tc.getVenueSeatCategoryName(), tc);
                }
                seatCategoryMap.putIfAbsent(tc.getCategoryName(), tc);
            }
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        List<ValidatePromoCodeRequest.SelectedSeatItem> promoSeatItems = new ArrayList<>();
        List<ValidatePromoCodeRequest.SelectedSharedAreaItem> promoSharedAreaItems = new ArrayList<>();

        // ── Seated tickets: group by resolved ticket category so a buy-x-get-y-free deal
        // applies across the whole selection rather than seat-by-seat ──
        if (request.getSeatIds() != null && !request.getSeatIds().isEmpty()) {
            Map<UUID, TicketCategory> categoryById = new HashMap<>();
            Map<UUID, List<String>> seatIdsByCategory = new HashMap<>();

            for (String seatId : request.getSeatIds()) {
                VenueSeat venueSeat = venueSeatRepository.findById(seatId)
                        .orElseThrow(() -> new RuntimeException("VenueSeat not found with ID: " + seatId));
                String categoryName = venueSeat.getCategory() != null ? venueSeat.getCategory().getCategoryName() : null;
                TicketCategory tc = categoryName != null ? seatCategoryMap.get(categoryName) : null;
                if (tc == null) {
                    throw new RuntimeException("No pricing configured for seat category of seat: " + seatId);
                }
                categoryById.put(tc.getCategoryId(), tc);
                seatIdsByCategory.computeIfAbsent(tc.getCategoryId(), k -> new ArrayList<>()).add(seatId);
            }

            for (Map.Entry<UUID, List<String>> entry : seatIdsByCategory.entrySet()) {
                TicketCategory tc = categoryById.get(entry.getKey());
                List<String> seatIds = entry.getValue();
                BigDecimal unitPrice = resolveUnitPrice(tc, now);
                int paidUnits = resolvePaidUnits(tc, seatIds.size());

                for (int i = 0; i < seatIds.size(); i++) {
                    BigDecimal seatPrice = i < paidUnits ? unitPrice : BigDecimal.ZERO;
                    pricing.seatPrices.put(seatIds.get(i), seatPrice);
                    subtotal = subtotal.add(seatPrice);

                    promoSeatItems.add(ValidatePromoCodeRequest.SelectedSeatItem.builder()
                            .seatId(seatIds.get(i))
                            .categoryId(tc.getCategoryId())
                            .categoryName(tc.getCategoryName())
                            .venueSeatCategoryName(tc.getVenueSeatCategoryName())
                            .price(unitPrice)
                            .build());
                }
            }
        }

        // ── Shared area tickets: group by resolved category across all request lines ──
        List<InitiatePaymentRequest.SharedAreaTicketRequest> sharedAreaRequests = request.getSharedAreaTickets();
        if (sharedAreaRequests != null && !sharedAreaRequests.isEmpty()) {
            List<TicketCategory> sharedAreaCategories =
                    ticketCategoryRepository.findSharedAreaCategoriesByEventId(event.getEventId());

            Map<UUID, TicketCategory> sharedCategoryById = new HashMap<>();
            Map<UUID, Integer> quantityByCategory = new HashMap<>();
            List<UUID> resolvedCategoryPerLine = new ArrayList<>();

            for (InitiatePaymentRequest.SharedAreaTicketRequest line : sharedAreaRequests) {
                TicketCategory tc = resolveSharedAreaCategory(sharedAreaCategories, line);
                if (tc == null) {
                    throw new RuntimeException("No pricing configured for shared area: " + line.getSharedAreaNumber());
                }
                sharedCategoryById.put(tc.getCategoryId(), tc);
                resolvedCategoryPerLine.add(tc.getCategoryId());
                quantityByCategory.merge(tc.getCategoryId(), line.getTicketCount(), (a, b) -> a + b);
            }

            Map<UUID, Integer> paidUnitsByCategory = new HashMap<>();
            for (Map.Entry<UUID, Integer> entry : quantityByCategory.entrySet()) {
                paidUnitsByCategory.put(entry.getKey(), resolvePaidUnits(sharedCategoryById.get(entry.getKey()), entry.getValue()));
            }

            Map<UUID, Integer> issuedSoFarByCategory = new HashMap<>();
            for (int lineIdx = 0; lineIdx < sharedAreaRequests.size(); lineIdx++) {
                InitiatePaymentRequest.SharedAreaTicketRequest line = sharedAreaRequests.get(lineIdx);
                UUID categoryId = resolvedCategoryPerLine.get(lineIdx);
                TicketCategory tc = sharedCategoryById.get(categoryId);
                BigDecimal unitPrice = resolveUnitPrice(tc, now);
                int paidUnitsTotal = paidUnitsByCategory.get(categoryId);

                for (int i = 0; i < line.getTicketCount(); i++) {
                    int issuedSoFar = issuedSoFarByCategory.merge(categoryId, 1, (a, b) -> a + b) - 1;
                    BigDecimal ticketPrice = issuedSoFar < paidUnitsTotal ? unitPrice : BigDecimal.ZERO;
                    pricing.sharedAreaPrices.add(ticketPrice);
                    subtotal = subtotal.add(ticketPrice);
                }

                promoSharedAreaItems.add(ValidatePromoCodeRequest.SelectedSharedAreaItem.builder()
                        .categoryId(tc.getCategoryId())
                        .categoryName(tc.getCategoryName())
                        .sharedAreaNumber(tc.getSharedAreaNumber())
                        .ticketCount(line.getTicketCount())
                        .pricePerTicket(unitPrice)
                        .build());
            }
        }

        subtotal = subtotal.setScale(2, RoundingMode.HALF_UP);

        // ── Promo code discount: re-validated against the DB (scope, dates, usage limit,
        // min order amount) — never trusted from request.getPromoDiscountAmount() ──
        BigDecimal discount = BigDecimal.ZERO;
        if (request.getPromoCode() != null && !request.getPromoCode().trim().isEmpty()) {
            try {
                ValidatePromoCodeResponse promoResult = promoCodeService.validateAndCalculateDiscount(
                        ValidatePromoCodeRequest.builder()
                                .code(request.getPromoCode())
                                .eventId(event.getEventId())
                                .seats(promoSeatItems)
                                .sharedAreas(promoSharedAreaItems)
                                .subTotal(subtotal)
                                .build());
                if (promoResult.isValid() && promoResult.getDiscountAmount() != null
                        && promoResult.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
                    discount = promoResult.getDiscountAmount();
                } else {
                    log.warn("Promo code '{}' supplied at payment initiation is not currently valid: {}",
                            request.getPromoCode(), promoResult.getMessage());
                }
            } catch (Exception e) {
                log.warn("Failed to re-validate promo code '{}' at payment initiation: {}",
                        request.getPromoCode(), e.getMessage());
            }
        }

        if (discount.compareTo(subtotal) > 0) {
            discount = subtotal;
        }

        pricing.discountAmount = discount.setScale(2, RoundingMode.HALF_UP);
        pricing.totalAmount = subtotal.subtract(discount).setScale(2, RoundingMode.HALF_UP);
        return pricing;
    }

    private TicketCategory resolveSharedAreaCategory(List<TicketCategory> sharedAreaCategories,
            InitiatePaymentRequest.SharedAreaTicketRequest line) {
        if (line.getCategoryId() != null) {
            for (TicketCategory tc : sharedAreaCategories) {
                if (tc.getCategoryId().equals(line.getCategoryId())) {
                    return tc;
                }
            }
        }
        if (line.getSharedAreaNumber() != null) {
            for (TicketCategory tc : sharedAreaCategories) {
                if (line.getSharedAreaNumber().equals(tc.getSharedAreaNumber())) {
                    return tc;
                }
            }
        }
        return null;
    }

    /**
     * Effective per-unit price for a ticket category: early-bird price if currently within its
     * sales window, otherwise the standard price, with an active PERCENTAGE_DISCOUNT deal applied
     * on top. (BUY_X_GET_Y_FREE is handled separately in {@link #resolvePaidUnits}.)
     */
    private BigDecimal resolveUnitPrice(TicketCategory tc, LocalDateTime now) {
        boolean earlyBirdActive = isEarlyBirdActive(tc.getEarlyBirdPrice(), tc.getSalesStartDate(), tc.getSalesEndDate(), now);
        BigDecimal base = earlyBirdActive ? tc.getEarlyBirdPrice() : tc.getPrice();
        if (base == null) {
            base = BigDecimal.ZERO;
        }

        String dealType = tc.getDealType() != null ? tc.getDealType() : "PERCENTAGE_DISCOUNT";
        if (Boolean.TRUE.equals(tc.getDealActive()) && "PERCENTAGE_DISCOUNT".equals(dealType)
                && tc.getDealDiscountPercentage() != null) {
            BigDecimal factor = BigDecimal.ONE.subtract(
                    tc.getDealDiscountPercentage().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
            base = base.multiply(factor).setScale(2, RoundingMode.HALF_UP);
        }
        return base;
    }

    private boolean isEarlyBirdActive(BigDecimal earlyBirdPrice, LocalDateTime startDate, LocalDateTime endDate, LocalDateTime now) {
        if (earlyBirdPrice == null || earlyBirdPrice.compareTo(BigDecimal.ZERO) <= 0) return false;
        if (startDate != null && now.isBefore(startDate)) return false;
        if (endDate != null && now.isAfter(endDate)) return false;
        return true;
    }

    /**
     * How many of {@code quantity} tickets in this category are actually paid for, applying an
     * active BUY_X_GET_Y_FREE deal (grouped across the whole requested quantity for the category).
     */
    private int resolvePaidUnits(TicketCategory tc, int quantity) {
        String dealType = tc.getDealType() != null ? tc.getDealType() : "PERCENTAGE_DISCOUNT";
        if (Boolean.TRUE.equals(tc.getDealActive()) && "BUY_X_GET_Y_FREE".equals(dealType)
                && tc.getDealBuyQuantity() != null && tc.getDealFreeQuantity() != null
                && tc.getDealBuyQuantity() > 0 && tc.getDealFreeQuantity() > 0) {
            int groupSize = tc.getDealBuyQuantity() + tc.getDealFreeQuantity();
            int fullGroups = quantity / groupSize;
            int remainder = quantity % groupSize;
            return fullGroups * tc.getDealBuyQuantity() + Math.min(remainder, tc.getDealBuyQuantity());
        }
        return quantity;
    }

    /**
     * Confirm a booking after successful payment
     *
     * @param bookingId Booking ID
     * @return Confirmed booking
     */
    public Booking confirmBookingAfterPayment(UUID bookingId) {
        log.info("Confirming booking after payment: {}", bookingId);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));

        if (booking.getStatus() != Booking.BookingStatus.PENDING) {
            throw new RuntimeException("Booking is not in PENDING status: " + booking.getStatus());
        }

        // Update status to CONFIRMED
        booking.setStatus(Booking.BookingStatus.CONFIRMED);

        // Ensure customer details are set (in case they weren't during creation)
        if (booking.getCustomerEmail() == null && booking.getUser() != null) {
            booking.setCustomerEmail(booking.getUser().getEmail());
        }
        if (booking.getCustomerPhone() == null && booking.getUser() != null) {
            booking.setCustomerPhone(booking.getUser().getPhoneNumber());
        }
        if (booking.getNumberOfTickets() == null || booking.getNumberOfTickets() == 0) {
            booking.setNumberOfTickets(booking.getBookingSeats().size());
        }
        if (booking.getFinalAmount() == null) {
            booking.setFinalAmount(booking.getTotalAmount());
        }

        // Update schedule availability
        int totalTickets = booking.getBookingSeats().size();
        eventScheduleService.reserveSeats(booking.getEventSchedule().getScheduleId(), totalTickets);

        bookingRepository.save(booking);
        log.info("Booking confirmed with reference: {}", booking.getBookingReference());

        // Log booking confirmation
        if (booking.getUser() != null) {
            auditService.logAction(booking.getUser().getId(), "BOOKING_CONFIRMED", "BOOKING", booking.getBookingId(), 
                    "Booking confirmed: " + booking.getBookingReference());
        }

        // Re-fetch with all lazy associations loaded so the caller (e.g. email service)
        // can access user, event, eventSchedule, bookingSeats without a LazyInitializationException.
        return bookingRepository.findByIdWithDetails(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found after confirmation: " + bookingId));
    }

    /**
     * Cancel a booking after payment failure
     *
     * @param bookingId Booking ID
     * @param reason Cancellation reason
     * @return Cancelled booking
     */
    public Booking cancelBookingAfterPaymentFailure(UUID bookingId, String reason) {
        log.info("Cancelling booking after payment failure: {}", bookingId);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));

        booking.setStatus(Booking.BookingStatus.CANCELLED);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancellationReason(reason);

        Booking cancelledBooking = bookingRepository.save(booking);
        log.info("Booking cancelled due to: {}", reason);

        // Log booking cancellation
        if (cancelledBooking.getUser() != null) {
            auditService.logAction(cancelledBooking.getUser().getId(), "BOOKING_CANCELLED_PAYMENT_FAILURE", "BOOKING", 
                    cancelledBooking.getBookingId(), "Booking cancelled due to payment failure: " + reason);
        }

        return cancelledBooking;
    }

    /**
     * Get all bookings for admin with filters and proper eager loading
     */
    public Page<Booking> getAllBookingsForAdmin(String eventId, String userId, String status, String search, Pageable pageable) {
        log.info("Fetching all bookings for admin with filters - eventId: {}, userId: {}, status: {}, search: {}", eventId, userId, status, search);
        
        try {
            Specification<Booking> spec = createBookingSpecification(eventId, userId, status, search, null, null);
            Page<Booking> page = bookingRepository.findAll(spec, pageable);
            
            // Eagerly load all relationships while still in transaction
            page.getContent().forEach(booking -> {
                // Force initialization of lazy-loaded collections and relationships
                if (booking.getUser() != null) {
                    booking.getUser().getFirstName();
                    booking.getUser().getLastName();
                    booking.getUser().getEmail();
                }
                if (booking.getEvent() != null) {
                    booking.getEvent().getName();
                    booking.getEvent().getDescription();
                    if (booking.getEvent().getVenue() != null) {
                        booking.getEvent().getVenue().getName();
                        booking.getEvent().getVenue().getAddress();
                    }
                }
                if (booking.getEventSchedule() != null) {
                    booking.getEventSchedule().getStartTime();
                    booking.getEventSchedule().getEndTime();
                    booking.getEventSchedule().getScheduleDate();
                }
                // Initialize booking seats collection
                if (booking.getBookingSeats() != null) {
                    booking.getBookingSeats().size();
                }
            });
            
            log.info("Successfully fetched {} bookings for admin", page.getContent().size());
            return page;
        } catch (Exception e) {
            log.error("Error fetching bookings for admin: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch bookings: " + e.getMessage(), e);
        }
    }
    
    /**
     * Get all bookings for admin with schedule filter and proper eager loading
     */
    public Page<Booking> getAllBookingsForAdmin(String eventId, String userId, String status, String search, String scheduleId, Pageable pageable) {
        Specification<Booking> spec = createBookingSpecification(eventId, userId, status, search, scheduleId, null);
        Page<Booking> page = bookingRepository.findAll(spec, pageable);
        
        // Eagerly load all relationships while still in transaction
        page.getContent().forEach(booking -> {
            if (booking.getUser() != null) {
                booking.getUser().getFirstName();
                booking.getUser().getLastName();
                booking.getUser().getEmail();
            }
            if (booking.getEvent() != null) {
                booking.getEvent().getName();
                booking.getEvent().getDescription();
                if (booking.getEvent().getVenue() != null) {
                    booking.getEvent().getVenue().getName();
                }
            }
            if (booking.getEventSchedule() != null) {
                booking.getEventSchedule().getStartTime();
                booking.getEventSchedule().getEndTime();
            }
            if (booking.getBookingSeats() != null) {
                booking.getBookingSeats().size();
            }
        });
        
        return page;
    }
    
    /**
     * Get all bookings for organizer with filters and proper eager loading
     */
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public Page<Booking> getAllBookingsForOrganizer(java.util.UUID organizerId, String eventId, String userId, String status, String search, Pageable pageable) {
        log.info("Fetching all bookings for organizer {} with filters - eventId: {}, userId: {}, status: {}, search: {}", 
                organizerId, eventId, userId, status, search);
        
        try {
            // Use specification to filter by organizer AND other filters
            Specification<Booking> spec = createBookingSpecification(eventId, userId, status, search, null, organizerId);
            Page<Booking> page = bookingRepository.findAll(spec, pageable);
            
            // Eagerly load all relationships while still in transaction
            page.getContent().forEach(booking -> {
                if (booking.getUser() != null) {
                    booking.getUser().getFirstName();
                    booking.getUser().getLastName();
                    booking.getUser().getEmail();
                }
                if (booking.getEvent() != null) {
                    booking.getEvent().getName();
                    booking.getEvent().getDescription();
                    if (booking.getEvent().getVenue() != null) {
                        booking.getEvent().getVenue().getName();
                    }
                }
                if (booking.getEventSchedule() != null) {
                    booking.getEventSchedule().getStartTime();
                    booking.getEventSchedule().getEndTime();
                }
                if (booking.getBookingSeats() != null) {
                    booking.getBookingSeats().size();
                }
            });
            
            return page;
        } catch (Exception e) {
            log.error("Error fetching bookings for organizer: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch bookings: " + e.getMessage(), e);
        }
    }

    /**
     * Legacy method for backward compatibility
     */
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public Page<Booking> getAllBookingsForOrganizer(java.util.UUID organizerId, Pageable pageable) {
        return getAllBookingsForOrganizer(organizerId, null, null, null, null, pageable);
    }
    
    /**
     * Generate a unique booking reference
     */
    private String generateBookingReference() {
        return "BK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
    
    /**
     * Generate a unique ticket code
     */
    private String generateTicketCode() {
        return "TK-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
    }

    /**
     * Get booking by ID
     */
    public Booking getBookingById(String bookingId) {
        UUID uuid = UUID.fromString(bookingId);
        return bookingRepository.findById(uuid)
                .orElseThrow(() -> new RuntimeException("Booking not found with ID: " + bookingId));
    }

    /**
     * Update booking status
     */
    public Booking updateBookingStatus(String bookingId, String status) {
        Booking booking = getBookingById(bookingId);
        Booking.BookingStatus oldStatus = booking.getStatus();
        
        try {
            Booking.BookingStatus bookingStatus = Booking.BookingStatus.valueOf(status.toUpperCase());
            booking.setStatus(bookingStatus);
            
            if (bookingStatus == Booking.BookingStatus.CANCELLED) {
                booking.setCancelledAt(LocalDateTime.now());
                booking.setCancellationReason("Cancelled by admin");
                
                // Release seats back to schedule if booking was previously confirmed
                if (oldStatus == Booking.BookingStatus.CONFIRMED && booking.getEventSchedule() != null) {
                    int seatsToRelease = booking.getBookingSeats().size();
                    eventScheduleService.releaseSeats(booking.getEventSchedule().getScheduleId(), seatsToRelease);
                }
            }
            
            Booking saved = bookingRepository.save(booking);

            // Notify customer by email when booking is cancelled by admin
            if (bookingStatus == Booking.BookingStatus.CANCELLED && saved.getUser() != null) {
                emailService.sendBookingCancellationEmail(saved, saved.getUser().getEmail());
            }

            return saved;
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid booking status: " + status);
        }
    }

    /**
     * Cancel a booking
     */
    public Booking cancelBooking(String bookingId) {
        return updateBookingStatus(bookingId, "CANCELLED");
    }

    /**
     * Mark booking as attended
     */
    public Booking markAsAttended(String bookingId) {
        Booking booking = getBookingById(bookingId);
        booking.setAttended(true);
        return bookingRepository.save(booking);
    }

    /**
     * Get bookings by event ID
     */
    public List<Booking> getBookingsByEventId(String eventId) {
        UUID uuid = UUID.fromString(eventId);
        Event event = eventRepository.findById(uuid)
                .orElseThrow(() -> new RuntimeException("Event not found with ID: " + eventId));
        
        return bookingRepository.findByEvent(event, Pageable.unpaged()).getContent();
    }
    
    /**
     * Get bookings by schedule ID
     */
    public Page<Booking> getBookingsByScheduleId(String scheduleId, Pageable pageable) {
        UUID uuid = UUID.fromString(scheduleId);
        eventScheduleRepository.findById(uuid)
                .orElseThrow(() -> new RuntimeException("Schedule not found with ID: " + scheduleId));
        
        return bookingRepository.findByEventSchedule_ScheduleId(uuid, pageable);
    }
    
    /**
     * Get bookings by event and schedule
     */
    public List<Booking> getBookingsByEventAndSchedule(String eventId, String scheduleId) {
        UUID eventUuid = UUID.fromString(eventId);
        UUID scheduleUuid = UUID.fromString(scheduleId);
        
        return bookingRepository.findByEventAndSchedule(eventUuid, scheduleUuid);
    }
    
    /**
     * Get bookings by user ID (returns DTOs to avoid lazy loading issues)
     */
    public List<BookingResponse> getBookingsByUserId(UUID userId) {
        log.info("Fetching bookings for user: {}", userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));
        
        // Use fetch-join query to load all relationships in one go
        List<Booking> bookings = bookingRepository.findByUserWithDetails(user);
        
        // Map entities to DTOs
        return bookings.stream()
                .map(this::mapToBookingResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * Map Booking entity to BookingResponse DTO
     */
    private BookingResponse mapToBookingResponse(Booking booking) {
        // Calculate ticket count
        int ticketCount = booking.getBookingSeats() != null ? booking.getBookingSeats().size() : 0;
        
        BookingResponse.BookingResponseBuilder builder = BookingResponse.builder()
                .bookingId(booking.getBookingId())
                .bookingReference(booking.getBookingReference())
                .bookingTime(booking.getBookingTime())
                .totalAmount(booking.getTotalAmount())
                .status(booking.getStatus())
                .attended(booking.getAttended())
                .ticketCount(ticketCount)
                .cancelledAt(booking.getCancelledAt())
                .cancellationReason(booking.getCancellationReason());
        
        // Map user information
        if (booking.getUser() != null) {
            builder.userId(booking.getUser().getUserId())
                   .userFirstName(booking.getUser().getFirstName())
                   .userLastName(booking.getUser().getLastName())
                   .userEmail(booking.getUser().getEmail());
        }
        
        // Map event information
        if (booking.getEvent() != null) {
            Event event = booking.getEvent();
            builder.eventId(event.getEventId())
                   .eventName(event.getName())
                   .eventDescription(event.getDescription())
                   .eventImageUrl(event.getImageUrl());
            
            // Map venue information if available
            if (event.getVenue() != null) {
                builder.venueId(event.getVenue().getVenueId())
                       .venueName(event.getVenue().getName())
                       .venueAddress(event.getVenue().getAddress());
            }
        }
        
        // Map schedule information if available
        if (booking.getEventSchedule() != null) {
            EventSchedule schedule = booking.getEventSchedule();
            builder.scheduleId(schedule.getScheduleId())
                   .scheduleDate(schedule.getScheduleDate() != null ? schedule.getScheduleDate().toString() : null)
                   .scheduleStartTime(schedule.getStartTime() != null ? schedule.getStartTime().toString() : null)
                   .scheduleEndTime(schedule.getEndTime() != null ? schedule.getEndTime().toString() : null)
                   .scheduleFinalPrice(schedule.getPriceAdjustment()) // Use price adjustment
                   .scheduleStatus(schedule.getStatus() != null ? schedule.getStatus().toString() : null);
        }
        
        // Map booking seats
        if (booking.getBookingSeats() != null && !booking.getBookingSeats().isEmpty()) {
            List<BookingResponse.BookingSeatInfo> seatInfos = booking.getBookingSeats().stream()
                    .map(bookingSeat -> {
                        BookingResponse.BookingSeatInfo.BookingSeatInfoBuilder seatBuilder = 
                                BookingResponse.BookingSeatInfo.builder()
                                .price(bookingSeat.getPriceAtBooking());
                        
                        // For shared area tickets, use venue seat ID or shared area number
                        if (Boolean.TRUE.equals(bookingSeat.getIsSharedAreaTicket())) {
                            seatBuilder.seatNumber("Shared Area " + bookingSeat.getSharedAreaNumber())
                                      .section("Shared Area");
                        } else if (bookingSeat.getVenueSeatId() != null) {
                            // VenueSeat format (e.g., "L-A-01")
                            seatBuilder.seatNumber(bookingSeat.getVenueSeatId());
                            
                            // Look up VenueSeat to get section and row
                            try {
                                venueSeatRepository.findById(bookingSeat.getVenueSeatId()).ifPresent(vs -> {
                                    seatBuilder.seatRow(vs.getRowLabel());
                                    seatBuilder.section(vs.getSection());
                                    // Use formatted seat number if available, else keep the ID
                                    if (vs.getSeatNumber() != null) {
                                        seatBuilder.seatNumber(String.valueOf(vs.getSeatNumber()));
                                    }
                                });
                            } catch (Exception e) {
                                log.warn("Could not fetch VenueSeat details for ID: {}", bookingSeat.getVenueSeatId());
                            }
                        } else {
                            // Fallback if neither is present
                            seatBuilder.seatNumber("Unknown Seat");
                        }
                        
                        return seatBuilder.build();
                    })
                    .collect(Collectors.toList());
            
            builder.seats(seatInfos);
        }
        
        return builder.build();
    }

    /**
     * Get booking statistics
     */
    public Map<String, Object> getBookingStatistics(String eventId, String dateFrom, String dateTo) {
        return getBookingStatistics(eventId, null, dateFrom, dateTo);
    }
    
    /**
     * Get booking statistics with schedule filter
     */
    public Map<String, Object> getBookingStatistics(String eventId, String scheduleId, String dateFrom, String dateTo) {
        Map<String, Object> statistics = new HashMap<>();
        
        try {
            // Total bookings
            long totalBookings = bookingRepository.count();
            statistics.put("totalBookings", totalBookings);
            
            // Today's bookings
            LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
            long todayBookings = bookingRepository.countTodayBookings(startOfDay);
            statistics.put("todayBookings", todayBookings);
            
            // Confirmed bookings
            long confirmedBookings = bookingRepository.findByStatus(Booking.BookingStatus.CONFIRMED, Pageable.unpaged()).getTotalElements();
            statistics.put("confirmedBookings", confirmedBookings);
            
            // Cancelled bookings
            long cancelledBookings = bookingRepository.findByStatus(Booking.BookingStatus.CANCELLED, Pageable.unpaged()).getTotalElements();
            statistics.put("cancelledBookings", cancelledBookings);
            
            // Date range statistics if provided
            if (dateFrom != null && dateTo != null) {
                LocalDateTime fromDate = LocalDateTime.parse(dateFrom + "T00:00:00");
                LocalDateTime toDate = LocalDateTime.parse(dateTo + "T23:59:59");
                
                long rangeBookings = bookingRepository.countBookingsBetweenDates(fromDate, toDate);
                statistics.put("dateRangeBookings", rangeBookings);
                statistics.put("dateFrom", dateFrom);
                statistics.put("dateTo", dateTo);
            }
            
            // Event specific statistics if provided
            if (eventId != null) {
                UUID uuid = UUID.fromString(eventId);
                Event event = eventRepository.findById(uuid).orElse(null);
                if (event != null) {
                    long eventBookings = bookingRepository.countConfirmedBookingsForEvent(event);
                    statistics.put("eventBookings", eventBookings);
                    statistics.put("eventName", event.getName());
                }
            }
            
            // Schedule specific statistics if provided
            if (scheduleId != null) {
                UUID uuid = UUID.fromString(scheduleId);
                EventSchedule schedule = eventScheduleRepository.findById(uuid).orElse(null);
                if (schedule != null) {
                    long scheduleBookings = bookingRepository.countConfirmedBookingsForSchedule(uuid);
                    long allScheduleBookings = bookingRepository.countAllBookingsForSchedule(uuid);
                    statistics.put("scheduleConfirmedBookings", scheduleBookings);
                    statistics.put("scheduleTotalBookings", allScheduleBookings);
                    statistics.put("scheduleDate", schedule.getScheduleDate().toString());
                    statistics.put("scheduleTime", schedule.getStartTime() + " - " + schedule.getEndTime());
                }
            }
            
        } catch (Exception e) {
            log.error("Error calculating booking statistics", e);
            statistics.put("error", "Error calculating statistics: " + e.getMessage());
        }
        
        return statistics;
    }

    /**
     * Delete a booking (admin only)
     */
    /**
     * Delete a booking and all its associated data (transactions, seats, etc.)
     * Performs a 'Hard Delete' for a clean database.
     */
    @org.springframework.transaction.annotation.Transactional
    public void deleteBooking(String bookingId) {
        UUID uuid = UUID.fromString(bookingId);
        Booking booking = bookingRepository.findById(uuid)
                .orElseThrow(() -> new RuntimeException("Booking not found with ID: " + bookingId));
                
        // 1. Delete all transactions associated with this booking
        List<Transaction> transactions = transactionRepository.findByBooking(booking);
        if (transactions != null && !transactions.isEmpty()) {
            transactionRepository.deleteAll(transactions);
        }

        // 2. Clear and delete booking seats
        booking.getBookingSeats().clear();
        bookingRepository.save(booking);
        
        // 3. Final deletion of the booking
        bookingRepository.deleteById(uuid);
        log.info("Hard delete performed on booking: {} and all its related data", bookingId);
    }

    /**
     * Create specification for dynamic filtering
     */
    private Specification<Booking> createBookingSpecification(String eventId, String userId, String status, String search, String scheduleId, UUID organizerId) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Filter by organizer ID (if provided)
            if (organizerId != null) {
                predicates.add(criteriaBuilder.equal(root.get("event").get("organizer").get("organizerId"), organizerId));
            }

            // Filter by event ID
            if (eventId != null && !eventId.trim().isEmpty()) {
                try {
                    UUID eventUuid = UUID.fromString(eventId);
                    predicates.add(criteriaBuilder.equal(root.get("event").get("eventId"), eventUuid));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid event ID format: " + eventId);
                }
            }

            // Filter by user ID
            if (userId != null && !userId.trim().isEmpty()) {
                try {
                    UUID userUuid = UUID.fromString(userId);
                    predicates.add(criteriaBuilder.equal(root.get("user").get("id"), userUuid));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid user ID format: " + userId);
                }
            }

            // Filter by status
            if (status != null && !status.trim().isEmpty()) {
                try {
                    Booking.BookingStatus bookingStatus = Booking.BookingStatus.valueOf(status.toUpperCase());
                    predicates.add(criteriaBuilder.equal(root.get("status"), bookingStatus));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid booking status: " + status);
                }
            }
            
            // Filter by schedule ID
            if (scheduleId != null && !scheduleId.trim().isEmpty()) {
                try {
                    UUID scheduleUuid = UUID.fromString(scheduleId);
                    predicates.add(criteriaBuilder.equal(root.get("eventSchedule").get("scheduleId"), scheduleUuid));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid schedule ID format: " + scheduleId);
                }
            }

            // Search in booking ID, booking reference, user details, or event title
            if (search != null && !search.trim().isEmpty()) {
                String searchPattern = "%" + search.toLowerCase() + "%";
                List<Predicate> searchPredicates = new ArrayList<>();
                
                log.info("Search triggered with pattern: '{}'", search);
                
                // Search by booking ID (UUID)
                try {
                    UUID searchUuid = UUID.fromString(search.trim());
                    searchPredicates.add(criteriaBuilder.equal(root.get("bookingId"), searchUuid));
                    log.info("Added UUID search predicate");
                } catch (IllegalArgumentException e) {
                    // Not a valid UUID, continue with pattern matching
                    log.debug("Search term is not a valid UUID: {}", search);
                }
                
                // Pattern matching searches - booking reference
                searchPredicates.add(criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("bookingReference")), 
                    searchPattern
                ));
                log.info("Added booking reference search predicate");
                
                // Search in event fields (safe - event is required, non-null)
                searchPredicates.add(criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("event").get("name")), 
                    searchPattern
                ));
                log.info("Added event name search predicate");
                
                // Search in user fields - use left join to handle null users safely
                jakarta.persistence.criteria.Join<Booking, User> userJoin = root.join("user", jakarta.persistence.criteria.JoinType.LEFT);
                searchPredicates.add(criteriaBuilder.like(
                    criteriaBuilder.lower(userJoin.get("firstName")), 
                    searchPattern
                ));
                searchPredicates.add(criteriaBuilder.like(
                    criteriaBuilder.lower(userJoin.get("lastName")), 
                    searchPattern
                ));
                searchPredicates.add(criteriaBuilder.like(
                    criteriaBuilder.lower(userJoin.get("email")), 
                    searchPattern
                ));
                log.info("Added user field search predicates (firstName, lastName, email)");
                
                Predicate searchPredicate = criteriaBuilder.or(searchPredicates.toArray(new Predicate[0]));
                predicates.add(searchPredicate);
                
                log.info("Search predicate combined with {} total conditions", searchPredicates.size());
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}