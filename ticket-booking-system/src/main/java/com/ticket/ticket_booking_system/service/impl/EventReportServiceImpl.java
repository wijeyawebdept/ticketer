package com.ticket.ticket_booking_system.service.impl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.dto.EventReportDTO;
import com.ticket.ticket_booking_system.dto.EventReportDTO.CategorySummaryDTO;
import com.ticket.ticket_booking_system.dto.EventReportDTO.CustomerBookingRowDTO;
import com.ticket.ticket_booking_system.dto.EventReportDTO.DealConfigDTO;
import com.ticket.ticket_booking_system.dto.EventReportDTO.DealUsageDTO;
import com.ticket.ticket_booking_system.dto.EventReportDTO.PromoCodeConfigDTO;
import com.ticket.ticket_booking_system.dto.EventReportDTO.PromoCodeUsageDTO;
import com.ticket.ticket_booking_system.dto.EventReportDTO.ScheduleSummaryDTO;
import com.ticket.ticket_booking_system.dto.EventReportDTO.SeatStatusDTO;
import com.ticket.ticket_booking_system.dto.EventReportDTO.SharedAreaSummaryDTO;
import com.ticket.ticket_booking_system.dto.SalesByDateReportDTO;
import com.ticket.ticket_booking_system.dto.SalesByDateReportDTO.DailyEventSalesDTO;
import com.ticket.ticket_booking_system.dto.SalesByDateReportDTO.DailySalesSummaryDTO;
import com.ticket.ticket_booking_system.dto.SalesByDateReportDTO.EventSalesSummaryDTO;
import com.ticket.ticket_booking_system.entity.Booking;
import com.ticket.ticket_booking_system.entity.Booking.BookingStatus;
import com.ticket.ticket_booking_system.entity.BookingSeat;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.EventSchedule;
import com.ticket.ticket_booking_system.entity.PromoCode;
import com.ticket.ticket_booking_system.entity.SeatHold;
import com.ticket.ticket_booking_system.entity.TicketCategory;
import com.ticket.ticket_booking_system.entity.Transaction;
import com.ticket.ticket_booking_system.entity.Venue;
import com.ticket.ticket_booking_system.entity.VenueSeat;
import com.ticket.ticket_booking_system.repository.BookingRepository;
import com.ticket.ticket_booking_system.repository.BookingSeatRepository;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.EventScheduleRepository;
import com.ticket.ticket_booking_system.repository.PromoCodeRepository;
import com.ticket.ticket_booking_system.repository.SeatHoldRepository;
import com.ticket.ticket_booking_system.repository.TicketCategoryRepository;
import com.ticket.ticket_booking_system.repository.TransactionRepository;
import com.ticket.ticket_booking_system.repository.VenueSeatRepository;
import com.ticket.ticket_booking_system.service.EventReportService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EventReportServiceImpl implements EventReportService {

    private final EventRepository eventRepository;
    private final EventScheduleRepository eventScheduleRepository;
    private final VenueSeatRepository venueSeatRepository;
    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final SeatHoldRepository seatHoldRepository;
    private final TicketCategoryRepository ticketCategoryRepository;
    private final TransactionRepository transactionRepository;
    private final PromoCodeRepository promoCodeRepository;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("MMM dd, yyyy - hh:mm a");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("MMM dd, yyyy");

    @Override
    @Transactional(readOnly = true)
    public EventReportDTO generateEventReport(UUID eventId, UUID scheduleId, UUID organizerId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found with ID: " + eventId));

        // Security check for organizer access
        if (organizerId != null) {
            if (event.getOrganizer() == null || !organizerId.equals(event.getOrganizer().getOrganizerId())) {
                throw new RuntimeException("Unauthorized: Event does not belong to the organizer.");
            }
        }

        Venue venue = event.getVenue();
        List<EventSchedule> schedules = eventScheduleRepository.findByEvent_EventIdAndIsDeletedFalseOrderByScheduleDateAscStartTimeAsc(eventId);
        List<VenueSeat> venueSeats = venue != null ? venueSeatRepository.findByVenueOrderedByLayout(venue.getVenueId()) : new ArrayList<>();
        List<TicketCategory> ticketCategories = ticketCategoryRepository.findByEventId(eventId);
        List<TicketCategory> sharedAreaCategories = ticketCategoryRepository.findSharedAreaCategoriesByEventId(eventId);

        // Map category by name and ID
        Map<String, TicketCategory> categoryByName = new HashMap<>();
        Map<UUID, TicketCategory> categoryById = new HashMap<>();
        for (TicketCategory tc : ticketCategories) {
            if (tc.getCategoryName() != null) categoryByName.put(tc.getCategoryName(), tc);
            if (tc.getCategoryId() != null) categoryById.put(tc.getCategoryId(), tc);
        }

        // Fetch bookings for this event
        List<Booking> allEventBookings;
        if (scheduleId != null) {
            allEventBookings = bookingRepository.findByEventAndSchedule(eventId, scheduleId);
        } else {
            allEventBookings = bookingRepository.findAll().stream()
                    .filter(b -> b.getEvent() != null && eventId.equals(b.getEvent().getEventId()))
                    .collect(Collectors.toList());
        }

        // Successful refunds for this event
        Map<UUID, BigDecimal> refundedAmountByBookingId = new HashMap<>();
        for (Transaction refundTx : transactionRepository.findSuccessfulRefundsForEvent(eventId)) {
            if (refundTx.getBooking() == null || refundTx.getAmount() == null) continue;
            refundedAmountByBookingId.merge(refundTx.getBooking().getBookingId(), refundTx.getAmount(), (a, b) -> a.add(b));
        }

        LocalDateTime now = LocalDateTime.now();

        // Build Shared Areas Breakdown
        List<SharedAreaSummaryDTO> sharedAreaSummaries = new ArrayList<>();
        int sharedAreaTotalCapacity = 0;
        int sharedAreaTicketsSold = 0;
        int sharedAreaEarlyBirdSold = 0;
        BigDecimal sharedAreaTotalRevenue = BigDecimal.ZERO;

        for (TicketCategory saCat : sharedAreaCategories) {
            int saCapacity = saCat.getCapacity() != null ? saCat.getCapacity() : 0;
            BigDecimal saPrice = saCat.getPrice() != null ? saCat.getPrice() : BigDecimal.ZERO;
            BigDecimal saEbPrice = saCat.getEarlyBirdPrice();
            Integer saEbCap = saCat.getEarlyBirdCapacity();
            LocalDateTime saStart = saCat.getSalesStartDate();
            LocalDateTime saEnd = saCat.getSalesEndDate();
            boolean saEbActive = isEarlyBirdActive(saEbPrice, saStart, saEnd, now);

            Long bookedCountObj = scheduleId != null ?
                    bookingRepository.countBookedSharedAreaTickets(scheduleId, saCat.getSharedAreaNumber()) : null;
            
            int saSold;
            if (bookedCountObj != null) {
                saSold = bookedCountObj.intValue();
            } else {
                saSold = (int) allEventBookings.stream()
                        .filter(b -> b.getStatus() == BookingStatus.CONFIRMED && b.getBookingSeats() != null)
                        .flatMap(b -> b.getBookingSeats().stream())
                        .filter(bs -> Boolean.TRUE.equals(bs.getIsSharedAreaTicket()) && 
                                (saCat.getSharedAreaNumber() != null && saCat.getSharedAreaNumber().equals(bs.getSharedAreaNumber())))
                        .count();
            }

            int saEbSold = 0;
            if (saEbPrice != null) {
                saEbSold = (int) allEventBookings.stream()
                        .filter(b -> (b.getStatus() == BookingStatus.CONFIRMED || b.getStatus() == BookingStatus.REFUNDED) && b.getBookingSeats() != null)
                        .filter(b -> isBookingInEarlyBirdWindow(b.getBookingTime(), saStart, saEnd))
                        .flatMap(b -> b.getBookingSeats().stream())
                        .filter(bs -> Boolean.TRUE.equals(bs.getIsSharedAreaTicket()) &&
                                (saCat.getSharedAreaNumber() != null && saCat.getSharedAreaNumber().equals(bs.getSharedAreaNumber())))
                        .count();
            }

            int saAvail = Math.max(0, saCapacity - saSold);
            BigDecimal saRev = saPrice.multiply(BigDecimal.valueOf(saSold));
            double saOcc = saCapacity > 0 ? (saSold * 100.0 / saCapacity) : 0.0;

            sharedAreaTotalCapacity += saCapacity;
            sharedAreaTicketsSold += saSold;
            sharedAreaEarlyBirdSold += saEbSold;
            sharedAreaTotalRevenue = sharedAreaTotalRevenue.add(saRev);

            sharedAreaSummaries.add(SharedAreaSummaryDTO.builder()
                    .categoryId(saCat.getCategoryId())
                    .categoryName(saCat.getCategoryName())
                    .sharedAreaNumber(saCat.getSharedAreaNumber())
                    .unitPrice(saPrice)
                    .totalCapacity(saCapacity)
                    .ticketsSold(saSold)
                    .ticketsAvailable(saAvail)
                    .totalRevenue(saRev)
                    .occupancyRate(Math.round(saOcc * 100.0) / 100.0)
                    .earlyBirdPrice(saEbPrice)
                    .earlyBirdCapacity(saEbCap)
                    .earlyBirdTicketsSold(saEbSold)
                    .salesStartDate(saStart)
                    .salesEndDate(saEnd)
                    .earlyBirdActive(saEbActive)
                    .build());
        }

        // Build Schedules Breakdown
        List<ScheduleSummaryDTO> scheduleSummaries = new ArrayList<>();
        int totalEventCapacity = 0;
        int totalEventTicketsSold = 0;

        for (EventSchedule sch : schedules) {
            LocalDateTime startDateTime = LocalDateTime.of(sch.getScheduleDate(), sch.getStartTime());
            LocalDateTime endDateTime = sch.getEndTime() != null ? LocalDateTime.of(sch.getScheduleDate(), sch.getEndTime()) : startDateTime.plusHours(3);

            List<Booking> schBookings = bookingRepository.findByEventAndSchedule(eventId, sch.getScheduleId());
            int soldCount = schBookings.stream()
                    .filter(b -> b.getStatus() == BookingStatus.CONFIRMED)
                    .mapToInt(b -> b.getBookingSeats() != null && !b.getBookingSeats().isEmpty() ? b.getBookingSeats().size() : (b.getNumberOfTickets() != null ? b.getNumberOfTickets() : 1))
                    .sum();

            BigDecimal schGross = schBookings.stream()
                    .filter(b -> b.getStatus() == BookingStatus.CONFIRMED || b.getStatus() == BookingStatus.REFUNDED)
                    .map(b -> b.getTotalAmount() != null ? b.getTotalAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, (a, b) -> a.add(b));
            BigDecimal schRefunds = schBookings.stream()
                    .map(b -> refundedAmountByBookingId.getOrDefault(b.getBookingId(), BigDecimal.ZERO))
                    .reduce(BigDecimal.ZERO, (a, b) -> a.add(b));
            BigDecimal schRev = schGross.subtract(schRefunds);

            int schCapacity = (venueSeats.isEmpty() ? (sch.getCapacity() != null ? sch.getCapacity() : 100) : venueSeats.size()) + sharedAreaTotalCapacity;
            int schAvailable = Math.max(0, schCapacity - soldCount);
            double schOccupancy = schCapacity > 0 ? (soldCount * 100.0 / schCapacity) : 0.0;

            totalEventCapacity += schCapacity;
            totalEventTicketsSold += soldCount;

            scheduleSummaries.add(ScheduleSummaryDTO.builder()
                    .scheduleId(sch.getScheduleId())
                    .startTime(startDateTime)
                    .endTime(endDateTime)
                    .status(sch.getStatus() != null ? sch.getStatus().name() : "ACTIVE")
                    .totalCapacity(schCapacity)
                    .ticketsSold(soldCount)
                    .ticketsAvailable(schAvailable)
                    .revenue(schRev)
                    .occupancyRate(Math.round(schOccupancy * 100.0) / 100.0)
                    .build());
        }

        // Selected Schedule Label
        String selectedScheduleLabel = "All Show Times";
        if (scheduleId != null) {
            EventSchedule selSch = schedules.stream()
                    .filter(s -> s.getScheduleId().equals(scheduleId))
                    .findFirst()
                    .orElse(null);
            if (selSch != null) {
                LocalDateTime dt = LocalDateTime.of(selSch.getScheduleDate(), selSch.getStartTime());
                selectedScheduleLabel = dt.format(TIME_FORMATTER);
            }
        }

        // Active holds & booked seats for target schedule
        UUID targetScheduleId = scheduleId != null ? scheduleId : (schedules.isEmpty() ? null : schedules.get(0).getScheduleId());
        Set<String> bookedSeatIds = targetScheduleId != null ? bookingSeatRepository.findBookedVenueSeatIdsByScheduleId(targetScheduleId) : Set.of();
        Set<String> confirmedSeatIds = targetScheduleId != null ? bookingSeatRepository.findConfirmedVenueSeatIdsByScheduleId(targetScheduleId) : Set.of();
        List<SeatHold> activeHolds = targetScheduleId != null ? seatHoldRepository.findActiveHoldsByScheduleId(targetScheduleId, LocalDateTime.now()) : List.of();
        Map<String, SeatHold> seatHoldMap = activeHolds.stream().collect(Collectors.toMap(h -> h.getVenueSeatId(), h -> h, (a, b) -> a));

        // Category Summaries Calculation (Seated Categories)
        Map<String, Integer> categoryTotalSeats = new HashMap<>();
        Map<String, Integer> categorySoldSeats = new HashMap<>();
        Map<String, Integer> categoryEarlyBirdSoldSeats = new HashMap<>();
        Map<String, Integer> categoryHeldSeats = new HashMap<>();
        Map<String, BigDecimal> categoryRevenueMap = new HashMap<>();
        Map<String, BigDecimal> categoryPriceMap = new HashMap<>();
        Map<String, String> categoryColorMap = new HashMap<>();
        Map<String, UUID> categoryIdMap = new HashMap<>();

        for (VenueSeat seat : venueSeats) {
            String catName = seat.getCategory() != null ? seat.getCategory().getCategoryName() : "General";
            String color = seat.getCategory() != null ? seat.getCategory().getColorCode() : "#1976d2";
            categoryTotalSeats.put(catName, categoryTotalSeats.getOrDefault(catName, 0) + 1);
            categoryColorMap.putIfAbsent(catName, color);
        }

        for (TicketCategory tc : ticketCategories) {
            if (tc.getCategoryName() != null && tc.getPrice() != null) {
                categoryPriceMap.put(tc.getCategoryName(), tc.getPrice());
                categoryIdMap.put(tc.getCategoryName(), tc.getCategoryId());
            }
        }

        // Calculate sold, early bird, and revenue per category from confirmed bookings
        int seatedEarlyBirdTotal = 0;
        BigDecimal earlyBirdTotalRev = BigDecimal.ZERO;
        BigDecimal earlyBirdTotalSavings = BigDecimal.ZERO;

        for (Booking b : allEventBookings) {
            if ((b.getStatus() == BookingStatus.CONFIRMED || b.getStatus() == BookingStatus.REFUNDED) && b.getBookingSeats() != null) {
                for (BookingSeat bs : b.getBookingSeats()) {
                    if (!Boolean.TRUE.equals(bs.getIsSharedAreaTicket())) {
                        String catName = bs.getVenueSeatId() != null ? getCategoryForSeat(bs.getVenueSeatId(), venueSeats) : "General";
                        if (b.getStatus() == BookingStatus.CONFIRMED) {
                            categorySoldSeats.put(catName, categorySoldSeats.getOrDefault(catName, 0) + 1);
                        }
                        BigDecimal p = bs.getPriceAtBooking() != null ? bs.getPriceAtBooking() : BigDecimal.ZERO;
                        categoryRevenueMap.put(catName, categoryRevenueMap.getOrDefault(catName, BigDecimal.ZERO).add(p));

                        // Check early bird
                        TicketCategory tc = categoryByName.get(catName);
                        if (tc != null && tc.getEarlyBirdPrice() != null) {
                            if (isBookingInEarlyBirdWindow(b.getBookingTime(), tc.getSalesStartDate(), tc.getSalesEndDate())) {
                                categoryEarlyBirdSoldSeats.put(catName, categoryEarlyBirdSoldSeats.getOrDefault(catName, 0) + 1);
                                seatedEarlyBirdTotal++;
                                earlyBirdTotalRev = earlyBirdTotalRev.add(tc.getEarlyBirdPrice());
                                if (tc.getPrice() != null && tc.getPrice().compareTo(tc.getEarlyBirdPrice()) > 0) {
                                    earlyBirdTotalSavings = earlyBirdTotalSavings.add(tc.getPrice().subtract(tc.getEarlyBirdPrice()));
                                }
                            }
                        }
                    }
                }
            }
        }

        List<CategorySummaryDTO> categorySummaries = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : categoryTotalSeats.entrySet()) {
            String catName = entry.getKey();
            int totalS = entry.getValue();
            int soldS = categorySoldSeats.getOrDefault(catName, 0);
            int ebSold = categoryEarlyBirdSoldSeats.getOrDefault(catName, 0);
            int heldS = categoryHeldSeats.getOrDefault(catName, 0);
            int availS = Math.max(0, totalS - soldS - heldS);
            BigDecimal price = categoryPriceMap.getOrDefault(catName, BigDecimal.ZERO);
            BigDecimal catRev = categoryRevenueMap.getOrDefault(catName, BigDecimal.ZERO);
            double occ = totalS > 0 ? (soldS * 100.0 / totalS) : 0.0;

            TicketCategory tc = categoryByName.get(catName);
            BigDecimal ebPrice = tc != null ? tc.getEarlyBirdPrice() : null;
            Integer ebCap = tc != null ? tc.getEarlyBirdCapacity() : null;
            LocalDateTime sStart = tc != null ? tc.getSalesStartDate() : null;
            LocalDateTime sEnd = tc != null ? tc.getSalesEndDate() : null;
            boolean ebActive = isEarlyBirdActive(ebPrice, sStart, sEnd, now);

            categorySummaries.add(CategorySummaryDTO.builder()
                    .categoryId(categoryIdMap.get(catName))
                    .categoryName(catName)
                    .colorCode(categoryColorMap.getOrDefault(catName, "#1976d2"))
                    .unitPrice(price)
                    .totalSeats(totalS)
                    .ticketsSold(soldS)
                    .ticketsAvailable(availS)
                    .ticketsHeld(heldS)
                    .categoryRevenue(catRev)
                    .occupancyRate(Math.round(occ * 100.0) / 100.0)
                    .earlyBirdPrice(ebPrice)
                    .earlyBirdCapacity(ebCap)
                    .earlyBirdTicketsSold(ebSold)
                    .salesStartDate(sStart)
                    .salesEndDate(sEnd)
                    .earlyBirdActive(ebActive)
                    .build());
        }

        // Customer Booking Rows
        List<CustomerBookingRowDTO> customerBookings = new ArrayList<>();
        BigDecimal totalPromoDiscounts = BigDecimal.ZERO;
        Map<String, long[]> promoCodeUsageCounts = new HashMap<>();
        Map<String, BigDecimal> promoCodeUsageAmounts = new HashMap<>();

        for (Booking b : allEventBookings) {
            String customerName = b.getUser() != null ? 
                    (b.getUser().getFirstName() + " " + (b.getUser().getLastName() != null ? b.getUser().getLastName() : "")).trim() : "Guest";
            String customerEmail = b.getCustomerEmail() != null ? b.getCustomerEmail() : (b.getUser() != null ? b.getUser().getEmail() : "N/A");
            
            String showTime = b.getEventSchedule() != null ? 
                    LocalDateTime.of(b.getEventSchedule().getScheduleDate(), b.getEventSchedule().getStartTime()).format(TIME_FORMATTER) : "N/A";

            String seatList = "N/A";
            String ticketCat = "General";
            int count = b.getNumberOfTickets() != null ? b.getNumberOfTickets() : 1;
            boolean isEb = false;

            if (b.getBookingSeats() != null && !b.getBookingSeats().isEmpty()) {
                count = b.getBookingSeats().size();
                List<BookingSeat> bsList = new ArrayList<>(b.getBookingSeats());
                BookingSeat firstBs = bsList.get(0);
                if (Boolean.TRUE.equals(firstBs.getIsSharedAreaTicket())) {
                    ticketCat = "Shared Standing Area " + (firstBs.getSharedAreaNumber() != null ? firstBs.getSharedAreaNumber() : "");
                    seatList = "Shared Standing Ticket (" + count + ")";
                    TicketCategory saCat = sharedAreaCategories.stream()
                            .filter(sa -> sa.getSharedAreaNumber() != null && sa.getSharedAreaNumber().equals(firstBs.getSharedAreaNumber()))
                            .findFirst().orElse(null);
                    if (saCat != null && isBookingInEarlyBirdWindow(b.getBookingTime(), saCat.getSalesStartDate(), saCat.getSalesEndDate())) {
                        isEb = true;
                    }
                } else {
                    ticketCat = getCategoryForSeat(firstBs.getVenueSeatId(), venueSeats);
                    seatList = bsList.stream()
                            .map(bs -> bs.getVenueSeatId() != null ? bs.getVenueSeatId() : "Seat")
                            .filter(s -> s != null && !s.isBlank())
                            .collect(Collectors.joining(", "));
                    TicketCategory tc = categoryByName.get(ticketCat);
                    if (tc != null && isBookingInEarlyBirdWindow(b.getBookingTime(), tc.getSalesStartDate(), tc.getSalesEndDate())) {
                        isEb = true;
                    }
                }
            }

            // Detect promo code usage from discountInfo
            String extractedPromoCode = null;
            if (b.getDiscountInfo() != null && !b.getDiscountInfo().isBlank()) {
                String dInfo = b.getDiscountInfo().trim();
                if (dInfo.toUpperCase().contains("PROMO") || dInfo.startsWith("CODE:") || dInfo.startsWith("PROMO:")) {
                    extractedPromoCode = dInfo;
                    if (b.getDiscountAmount() != null && b.getDiscountAmount().signum() > 0) {
                        totalPromoDiscounts = totalPromoDiscounts.add(b.getDiscountAmount());
                        promoCodeUsageCounts.computeIfAbsent(dInfo, k -> new long[]{0})[0]++;
                        promoCodeUsageAmounts.merge(dInfo, b.getDiscountAmount(), (a, bAmt) -> a.add(bAmt));
                    }
                }
            }

            customerBookings.add(CustomerBookingRowDTO.builder()
                    .bookingId(b.getBookingId())
                    .bookingReference(b.getBookingReference() != null ? b.getBookingReference() : b.getBookingId().toString().substring(0, 8).toUpperCase())
                    .customerName(customerName)
                    .customerEmail(customerEmail)
                    .showTimeLabel(showTime)
                    .seatNumbers(seatList.isEmpty() ? "General Ticket" : seatList)
                    .ticketCategory(ticketCat)
                    .ticketCount(count)
                    .totalAmount(b.getTotalAmount() != null ? b.getTotalAmount() : BigDecimal.ZERO)
                    .discountAmount(b.getDiscountAmount() != null ? b.getDiscountAmount() : BigDecimal.ZERO)
                    .discountInfo(b.getDiscountInfo())
                    .promoCode(extractedPromoCode)
                    .bookingDate(b.getBookingTime())
                    .status(b.getStatus() != null ? b.getStatus().name() : "CONFIRMED")
                    .paymentMethod(b.getPaymentStatus() != null ? b.getPaymentStatus() : "PAID")
                    .isEarlyBird(isEb)
                    .build());
        }

        // Build Seat Availability Status Map for SVG Diagram
        List<SeatStatusDTO> seatStatusMap = new ArrayList<>();
        for (VenueSeat seat : venueSeats) {
            String notes = seat.getNotes() != null ? seat.getNotes().toLowerCase() : "";
            String status;

            if (confirmedSeatIds.contains(seat.getSeatId())) {
                status = "BOOKED";
            } else if (bookedSeatIds.contains(seat.getSeatId()) || seatHoldMap.containsKey(seat.getSeatId())) {
                status = "TEMPORARY_HOLD";
            } else if (notes.contains("[locked]")) {
                status = "LOCKED";
            } else if (notes.contains("[vip]")) {
                status = "VIP_RESERVED";
            } else {
                status = "AVAILABLE";
            }

            String catName = seat.getCategory() != null ? seat.getCategory().getCategoryName() : "General";
            BigDecimal seatPrice = categoryPriceMap.getOrDefault(catName, BigDecimal.ZERO);

            seatStatusMap.add(SeatStatusDTO.builder()
                    .seatId(seat.getSeatId())
                    .section(seat.getSection())
                    .rowLabel(seat.getRowLabel())
                    .seatNumber(seat.getSeatNumber())
                    .categoryName(catName)
                    .colorCode(seat.getCategory() != null ? seat.getCategory().getColorCode() : "#1976d2")
                    .xPosition(seat.getXPosition() != null ? seat.getXPosition().doubleValue() : 0.0)
                    .yPosition(seat.getYPosition() != null ? seat.getYPosition().doubleValue() : 0.0)
                    .status(status)
                    .price(seatPrice)
                    .build());
        }

        // Total KPIs
        int totalCap = (scheduleId != null ? (venueSeats.isEmpty() ? 100 : venueSeats.size()) : totalEventCapacity) + sharedAreaTotalCapacity;
        int totalSold = (scheduleId != null ? (int) customerBookings.stream().filter(cb -> "CONFIRMED".equalsIgnoreCase(cb.getStatus())).count() : totalEventTicketsSold) + sharedAreaTicketsSold;
        int totalAvail = Math.max(0, totalCap - totalSold);
        double overallOccupancy = totalCap > 0 ? (totalSold * 100.0 / totalCap) : 0.0;

        BigDecimal grossBookingRevenue = allEventBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.CONFIRMED || b.getStatus() == BookingStatus.REFUNDED)
                .map(b -> b.getTotalAmount() != null ? b.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, (a, b) -> a.add(b));

        BigDecimal totalDiscounts = allEventBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.CONFIRMED || b.getStatus() == BookingStatus.REFUNDED)
                .map(b -> b.getDiscountAmount() != null ? b.getDiscountAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, (a, b) -> a.add(b));

        BigDecimal totalRefunds = allEventBookings.stream()
                .map(b -> refundedAmountByBookingId.getOrDefault(b.getBookingId(), BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, (a, b) -> a.add(b));

        BigDecimal grossRev = grossBookingRevenue.add(sharedAreaTotalRevenue);
        BigDecimal totalRev = grossRev.subtract(totalRefunds);

        int totalEbSold = seatedEarlyBirdTotal + sharedAreaEarlyBirdSold;

        // Deals configured for this event
        List<DealConfigDTO> configuredDeals = ticketCategoryRepository.findAllDealsForEvent(eventId).stream()
                .map(tc -> DealConfigDTO.builder()
                        .categoryId(tc.getCategoryId())
                        .categoryName(tc.getCategoryName())
                        .dealActive(Boolean.TRUE.equals(tc.getDealActive()))
                        .dealType(tc.getDealType())
                        .dealLabel(tc.getDealLabel())
                        .dealDiscountPercentage(tc.getDealDiscountPercentage())
                        .dealBuyQuantity(tc.getDealBuyQuantity())
                        .dealFreeQuantity(tc.getDealFreeQuantity())
                        .build())
                .collect(Collectors.toList());

        // Deal usage breakdown
        Map<String, long[]> dealUsageCounts = new HashMap<>();
        Map<String, BigDecimal> dealUsageAmounts = new HashMap<>();
        for (Booking b : allEventBookings) {
            if (b.getStatus() != BookingStatus.CONFIRMED && b.getStatus() != BookingStatus.REFUNDED) continue;
            String label = b.getDiscountInfo();
            BigDecimal discount = b.getDiscountAmount();
            if (label == null || label.isBlank() || discount == null || discount.signum() <= 0) continue;

            dealUsageCounts.computeIfAbsent(label, k -> new long[]{0})[0]++;
            dealUsageAmounts.merge(label, discount, (a, bAmt) -> a.add(bAmt));
        }
        List<DealUsageDTO> dealUsageSummaries = dealUsageCounts.entrySet().stream()
                .map(e -> DealUsageDTO.builder()
                        .label(e.getKey())
                        .timesUsed((int) e.getValue()[0])
                        .totalDiscountGiven(dealUsageAmounts.getOrDefault(e.getKey(), BigDecimal.ZERO))
                        .build())
                .sorted((a, c) -> c.getTotalDiscountGiven().compareTo(a.getTotalDiscountGiven()))
                .collect(Collectors.toList());

        // Configured Promo Codes for this event
        List<PromoCode> eventPromoCodes = promoCodeRepository.findAll().stream()
                .filter(p -> p.getEvent() != null && eventId.equals(p.getEvent().getEventId()) ||
                        (p.getTicketCategory() != null && p.getTicketCategory().getEvent() != null && eventId.equals(p.getTicketCategory().getEvent().getEventId())) ||
                        p.getScope() == PromoCode.PromoCodeScope.ALL_EVENTS)
                .collect(Collectors.toList());

        List<PromoCodeConfigDTO> configuredPromoCodes = eventPromoCodes.stream()
                .map(p -> PromoCodeConfigDTO.builder()
                        .id(p.getId())
                        .code(p.getCode())
                        .description(p.getDescription())
                        .scope(p.getScope() != null ? p.getScope().name() : "EVENT")
                        .discountPercentage(p.getDiscountPercentage())
                        .maxDiscountAmount(p.getMaxDiscountAmount())
                        .ticketCategoryName(p.getTicketCategoryName())
                        .usageLimit(p.getUsageLimit())
                        .usageCount(p.getUsageCount() != null ? p.getUsageCount() : 0)
                        .startDate(p.getStartDate())
                        .endDate(p.getEndDate())
                        .isActive(Boolean.TRUE.equals(p.getIsActive()))
                        .statusLabel(getPromoStatusLabel(p, now))
                        .build())
                .collect(Collectors.toList());

        // Promo code usage summaries
        List<PromoCodeUsageDTO> promoCodeUsageSummaries = promoCodeUsageCounts.entrySet().stream()
                .map(e -> PromoCodeUsageDTO.builder()
                        .code(e.getKey())
                        .timesUsed((int) e.getValue()[0])
                        .totalDiscountGiven(promoCodeUsageAmounts.getOrDefault(e.getKey(), BigDecimal.ZERO))
                        .build())
                .sorted((a, c) -> c.getTotalDiscountGiven().compareTo(a.getTotalDiscountGiven()))
                .collect(Collectors.toList());

        // Build single-event daily sales breakdown
        List<DailySalesSummaryDTO> singleEventDailySales = buildDailySalesForEvent(allEventBookings, event, refundedAmountByBookingId);

        return EventReportDTO.builder()
                .eventId(event.getEventId())
                .eventTitle(event.getName())
                .eventDescription(event.getDescription())
                .categoryName(event.getCategory() != null ? event.getCategory().getCategoryName() : "Uncategorized")
                .eventStatus(event.getStatus() != null ? event.getStatus().name() : "PUBLISHED")
                .bannerUrl(event.getImageUrl())
                .organizerName(event.getOrganizer() != null ? event.getOrganizer().getOrganizationName() : "System Admin")
                .organizerEmail(event.getOrganizer() != null ? event.getOrganizer().getEmail() : "admin@ticketbooking.com")
                .venueId(venue != null ? venue.getVenueId() : null)
                .venueName(venue != null ? venue.getName() : (event.getVenueName() != null ? event.getVenueName() : "Main Arena"))
                .venueAddress(venue != null ? venue.getAddress() : (event.getVenueAddress() != null ? event.getVenueAddress() : "N/A"))
                .venueCity(venue != null ? venue.getCity() : "N/A")
                .venueType(venue != null ? (venue.getHasSharedAreas() ? "Shared / Standing" : "Seated Arena") : "Indoor")
                .totalVenueCapacity(venueSeats.size())
                .hasSharedAreas(venue != null && Boolean.TRUE.equals(venue.getHasSharedAreas()) || !sharedAreaCategories.isEmpty())
                .selectedScheduleId(scheduleId)
                .selectedScheduleLabel(selectedScheduleLabel)
                .totalRevenue(totalRev)
                .grossRevenue(grossRev)
                .totalDiscounts(totalDiscounts)
                .totalRefunds(totalRefunds)
                .totalPromoDiscounts(totalPromoDiscounts)
                .earlyBirdTotalSavings(earlyBirdTotalSavings)
                .totalCapacity(totalCap)
                .totalTicketsSold(totalSold)
                .earlyBirdTotalTicketsSold(totalEbSold)
                .earlyBirdTotalRevenue(earlyBirdTotalRev)
                .totalTicketsAvailable(totalAvail)
                .totalTicketsHeld((int) activeHolds.size())
                .totalTicketsLocked((int) seatStatusMap.stream().filter(s -> "LOCKED".equals(s.getStatus())).count())
                .occupancyRate(Math.round(overallOccupancy * 100.0) / 100.0)
                .dailySales(singleEventDailySales)
                .schedules(scheduleSummaries)
                .categorySummaries(categorySummaries)
                .sharedAreaSummaries(sharedAreaSummaries)
                .bookingDetails(customerBookings)
                .seatAvailabilityMap(seatStatusMap)
                .configuredDeals(configuredDeals)
                .dealUsageSummaries(dealUsageSummaries)
                .configuredPromoCodes(configuredPromoCodes)
                .promoCodeUsageSummaries(promoCodeUsageSummaries)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public SalesByDateReportDTO generateSalesByDateReport(LocalDate startDate, LocalDate endDate, UUID eventId, UUID organizerId) {
        // 1. Resolve target events
        List<Event> targetEvents;
        if (eventId != null) {
            Event ev = eventRepository.findById(eventId)
                    .orElseThrow(() -> new RuntimeException("Event not found with ID: " + eventId));
            if (organizerId != null && (ev.getOrganizer() == null || !organizerId.equals(ev.getOrganizer().getOrganizerId()))) {
                throw new RuntimeException("Unauthorized: Event does not belong to the organizer.");
            }
            targetEvents = List.of(ev);
        } else if (organizerId != null) {
            targetEvents = eventRepository.findByOrganizer_OrganizerIdAndIsDeletedFalse(organizerId);
        } else {
            targetEvents = eventRepository.findAllByIsDeletedFalse();
        }

        Set<UUID> targetEventIds = targetEvents.stream().map(e -> e.getEventId()).collect(Collectors.toSet());
        Map<UUID, Event> eventById = targetEvents.stream().collect(Collectors.toMap(e -> e.getEventId(), e -> e, (a, b) -> a));

        // 2. Fetch all ticket categories and promo codes for target events to support Early Bird and Promo Code tracking
        Map<UUID, List<TicketCategory>> categoriesByEventId = new HashMap<>();
        for (UUID evId : targetEventIds) {
            categoriesByEventId.put(evId, ticketCategoryRepository.findByEventId(evId));
        }

        // 3. Fetch bookings for target events within date range
        LocalDateTime startDateTime = startDate != null ? startDate.atStartOfDay() : null;
        LocalDateTime endDateTime = endDate != null ? endDate.atTime(23, 59, 59, 999999999) : null;

        List<Booking> allBookings = bookingRepository.findAll().stream()
                .filter(b -> b.getEvent() != null && targetEventIds.contains(b.getEvent().getEventId()))
                .filter(b -> b.getStatus() == BookingStatus.CONFIRMED || b.getStatus() == BookingStatus.REFUNDED)
                .filter(b -> startDateTime == null || (b.getBookingTime() != null && !b.getBookingTime().isBefore(startDateTime)))
                .filter(b -> endDateTime == null || (b.getBookingTime() != null && !b.getBookingTime().isAfter(endDateTime)))
                .sorted(Comparator.comparing(b -> b.getBookingTime(), Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());

        // 4. Fetch refunds for target events
        Map<UUID, BigDecimal> refundedAmountByBookingId = new HashMap<>();
        for (UUID evId : targetEventIds) {
            for (Transaction refundTx : transactionRepository.findSuccessfulRefundsForEvent(evId)) {
                if (refundTx.getBooking() == null || refundTx.getAmount() == null) continue;
                refundedAmountByBookingId.merge(refundTx.getBooking().getBookingId(), refundTx.getAmount(), (a, b) -> a.add(b));
            }
        }

        // 5. Group bookings by date (day by day)
        Map<LocalDate, List<Booking>> bookingsByDate = new HashMap<>();
        for (Booking b : allBookings) {
            if (b.getBookingTime() == null) continue;
            LocalDate day = b.getBookingTime().toLocalDate();
            bookingsByDate.computeIfAbsent(day, k -> new ArrayList<>()).add(b);
        }

        // 6. Build DailySalesSummaryDTO list
        List<DailySalesSummaryDTO> dailySalesList = new ArrayList<>();
        int overallTicketsSold = 0;
        int overallEarlyBirdSold = 0;
        int overallBookingCount = allBookings.size();
        int overallPromoCount = 0;
        BigDecimal overallGross = BigDecimal.ZERO;
        BigDecimal overallRefunds = BigDecimal.ZERO;
        BigDecimal overallDiscounts = BigDecimal.ZERO;
        BigDecimal overallPromoDiscounts = BigDecimal.ZERO;
        BigDecimal overallEbSavings = BigDecimal.ZERO;

        Set<UUID> eventsWithSales = new HashSet<>();

        // Sort dates descending
        List<LocalDate> sortedDates = new ArrayList<>(bookingsByDate.keySet());
        sortedDates.sort(Comparator.reverseOrder());

        for (LocalDate date : sortedDates) {
            List<Booking> dayBookings = bookingsByDate.get(date);
            int dayTicketsSold = 0;
            int dayEarlyBirdSold = 0;
            BigDecimal dayGross = BigDecimal.ZERO;
            BigDecimal dayRefunds = BigDecimal.ZERO;
            BigDecimal dayDiscounts = BigDecimal.ZERO;
            BigDecimal dayPromoDiscounts = BigDecimal.ZERO;
            int dayBookingsCount = dayBookings.size();

            // Group day bookings by event
            Map<UUID, List<Booking>> dayBookingsByEvent = dayBookings.stream()
                    .collect(Collectors.groupingBy(b -> b.getEvent().getEventId()));

            List<DailyEventSalesDTO> eventBreakdowns = new ArrayList<>();

            for (Map.Entry<UUID, List<Booking>> entry : dayBookingsByEvent.entrySet()) {
                UUID evId = entry.getKey();
                Event ev = eventById.get(evId);
                List<Booking> evDayBookings = entry.getValue();
                eventsWithSales.add(evId);

                int evTickets = 0;
                int evEbTickets = 0;
                BigDecimal evGross = BigDecimal.ZERO;
                BigDecimal evRefunds = BigDecimal.ZERO;
                BigDecimal evDiscounts = BigDecimal.ZERO;
                BigDecimal evPromoDiscounts = BigDecimal.ZERO;

                List<TicketCategory> evCategories = categoriesByEventId.getOrDefault(evId, List.of());

                for (Booking b : evDayBookings) {
                    int tkCount = b.getBookingSeats() != null && !b.getBookingSeats().isEmpty() ? 
                            b.getBookingSeats().size() : (b.getNumberOfTickets() != null ? b.getNumberOfTickets() : 1);
                    evTickets += tkCount;

                    BigDecimal bAmount = b.getTotalAmount() != null ? b.getTotalAmount() : BigDecimal.ZERO;
                    BigDecimal bDiscount = b.getDiscountAmount() != null ? b.getDiscountAmount() : BigDecimal.ZERO;
                    BigDecimal bRefund = refundedAmountByBookingId.getOrDefault(b.getBookingId(), BigDecimal.ZERO);

                    evGross = evGross.add(bAmount);
                    evRefunds = evRefunds.add(bRefund);
                    evDiscounts = evDiscounts.add(bDiscount);

                    if (b.getDiscountInfo() != null && (b.getDiscountInfo().toUpperCase().contains("PROMO") || b.getDiscountInfo().startsWith("CODE:"))) {
                        evPromoDiscounts = evPromoDiscounts.add(bDiscount);
                    }

                    // Check Early Bird
                    for (TicketCategory tc : evCategories) {
                        if (tc.getEarlyBirdPrice() != null && isBookingInEarlyBirdWindow(b.getBookingTime(), tc.getSalesStartDate(), tc.getSalesEndDate())) {
                            evEbTickets += tkCount;
                            if (tc.getPrice() != null && tc.getPrice().compareTo(tc.getEarlyBirdPrice()) > 0) {
                                BigDecimal diff = tc.getPrice().subtract(tc.getEarlyBirdPrice()).multiply(BigDecimal.valueOf(tkCount));
                                overallEbSavings = overallEbSavings.add(diff);
                            }
                            break;
                        }
                    }
                }

                BigDecimal evNet = evGross.subtract(evRefunds);

                dayTicketsSold += evTickets;
                dayEarlyBirdSold += evEbTickets;
                dayGross = dayGross.add(evGross);
                dayRefunds = dayRefunds.add(evRefunds);
                dayDiscounts = dayDiscounts.add(evDiscounts);
                dayPromoDiscounts = dayPromoDiscounts.add(evPromoDiscounts);

                eventBreakdowns.add(DailyEventSalesDTO.builder()
                        .eventId(evId)
                        .eventTitle(ev != null ? ev.getName() : "Event")
                        .organizerName(ev != null && ev.getOrganizer() != null ? ev.getOrganizer().getOrganizationName() : "Admin")
                        .categoryName(ev != null && ev.getCategory() != null ? ev.getCategory().getCategoryName() : "General")
                        .venueName(ev != null && ev.getVenue() != null ? ev.getVenue().getName() : "Main Venue")
                        .ticketsSold(evTickets)
                        .earlyBirdTicketsSold(evEbTickets)
                        .revenue(evNet)
                        .grossRevenue(evGross)
                        .discounts(evDiscounts)
                        .promoDiscounts(evPromoDiscounts)
                        .refunds(evRefunds)
                        .bookingCount(evDayBookings.size())
                        .build());
            }

            BigDecimal dayNet = dayGross.subtract(dayRefunds);

            overallTicketsSold += dayTicketsSold;
            overallEarlyBirdSold += dayEarlyBirdSold;
            overallGross = overallGross.add(dayGross);
            overallRefunds = overallRefunds.add(dayRefunds);
            overallDiscounts = overallDiscounts.add(dayDiscounts);
            overallPromoDiscounts = overallPromoDiscounts.add(dayPromoDiscounts);

            dailySalesList.add(DailySalesSummaryDTO.builder()
                    .date(date)
                    .formattedDate(date.format(DATE_FORMATTER))
                    .totalTicketsSold(dayTicketsSold)
                    .earlyBirdTicketsSold(dayEarlyBirdSold)
                    .totalRevenue(dayNet)
                    .grossRevenue(dayGross)
                    .totalRefunds(dayRefunds)
                    .totalDiscounts(dayDiscounts)
                    .promoDiscounts(dayPromoDiscounts)
                    .bookingCount(dayBookingsCount)
                    .activeEventsCount(dayBookingsByEvent.size())
                    .eventBreakdowns(eventBreakdowns)
                    .build());
        }

        BigDecimal overallNet = overallGross.subtract(overallRefunds);

        // 7. Build Event Performance Summary across the selected period
        List<EventSalesSummaryDTO> eventSummaries = new ArrayList<>();
        for (Event ev : targetEvents) {
            UUID evId = ev.getEventId();
            List<Booking> evBookings = allBookings.stream()
                    .filter(b -> b.getEvent() != null && evId.equals(b.getEvent().getEventId()))
                    .collect(Collectors.toList());

            List<TicketCategory> evCats = categoriesByEventId.getOrDefault(evId, List.of());
            TicketCategory primaryEbCat = evCats.stream()
                    .filter(tc -> tc.getEarlyBirdPrice() != null)
                    .findFirst().orElse(null);

            BigDecimal primaryRegPrice = evCats.stream()
                    .filter(tc -> tc.getPrice() != null)
                    .map(c -> c.getPrice())
                    .findFirst().orElse(BigDecimal.ZERO);

            int evTickets = 0;
            int evEbTickets = 0;
            BigDecimal evGross = BigDecimal.ZERO;
            BigDecimal evRefunds = BigDecimal.ZERO;
            BigDecimal evDiscounts = BigDecimal.ZERO;
            BigDecimal evPromo = BigDecimal.ZERO;

            for (Booking b : evBookings) {
                int count = b.getBookingSeats() != null && !b.getBookingSeats().isEmpty() ?
                        b.getBookingSeats().size() : (b.getNumberOfTickets() != null ? b.getNumberOfTickets() : 1);
                evTickets += count;
                evGross = evGross.add(b.getTotalAmount() != null ? b.getTotalAmount() : BigDecimal.ZERO);
                evDiscounts = evDiscounts.add(b.getDiscountAmount() != null ? b.getDiscountAmount() : BigDecimal.ZERO);
                evRefunds = evRefunds.add(refundedAmountByBookingId.getOrDefault(b.getBookingId(), BigDecimal.ZERO));

                if (b.getDiscountInfo() != null && (b.getDiscountInfo().toUpperCase().contains("PROMO") || b.getDiscountInfo().startsWith("CODE:"))) {
                    evPromo = evPromo.add(b.getDiscountAmount() != null ? b.getDiscountAmount() : BigDecimal.ZERO);
                    overallPromoCount++;
                }

                if (primaryEbCat != null && isBookingInEarlyBirdWindow(b.getBookingTime(), primaryEbCat.getSalesStartDate(), primaryEbCat.getSalesEndDate())) {
                    evEbTickets += count;
                }
            }

            int configuredPromoCount = (int) promoCodeRepository.findAll().stream()
                    .filter(p -> (p.getEvent() != null && evId.equals(p.getEvent().getEventId())) || p.getScope() == PromoCode.PromoCodeScope.ALL_EVENTS)
                    .count();

            BigDecimal evNet = evGross.subtract(evRefunds);

            eventSummaries.add(EventSalesSummaryDTO.builder()
                    .eventId(evId)
                    .eventTitle(ev.getName())
                    .organizerName(ev.getOrganizer() != null ? ev.getOrganizer().getOrganizationName() : "Admin")
                    .categoryName(ev.getCategory() != null ? ev.getCategory().getCategoryName() : "General")
                    .venueName(ev.getVenue() != null ? ev.getVenue().getName() : (ev.getVenueName() != null ? ev.getVenueName() : "N/A"))
                    .status(ev.getStatus() != null ? ev.getStatus().name() : "PUBLISHED")
                    .totalTicketsSold(evTickets)
                    .earlyBirdTicketsSold(evEbTickets)
                    .earlyBirdCapacity(primaryEbCat != null ? primaryEbCat.getEarlyBirdCapacity() : null)
                    .earlyBirdPrice(primaryEbCat != null ? primaryEbCat.getEarlyBirdPrice() : null)
                    .earlyBirdActive(primaryEbCat != null && isEarlyBirdActive(primaryEbCat.getEarlyBirdPrice(), primaryEbCat.getSalesStartDate(), primaryEbCat.getSalesEndDate(), LocalDateTime.now()))
                    .regularPrice(primaryRegPrice)
                    .totalRevenue(evNet)
                    .grossRevenue(evGross)
                    .totalDiscounts(evDiscounts)
                    .promoDiscounts(evPromo)
                    .totalRefunds(evRefunds)
                    .bookingCount(evBookings.size())
                    .configuredPromoCodesCount(configuredPromoCount)
                    .build());
        }

        // Sort event summaries by total revenue descending
        eventSummaries.sort((a, b) -> b.getTotalRevenue().compareTo(a.getTotalRevenue()));

        // 8. Build matching CustomerBookingRowDTO list
        List<CustomerBookingRowDTO> bookingDetails = new ArrayList<>();
        for (Booking b : allBookings) {
            String customerName = b.getUser() != null ? 
                    (b.getUser().getFirstName() + " " + (b.getUser().getLastName() != null ? b.getUser().getLastName() : "")).trim() : "Guest";
            String customerEmail = b.getCustomerEmail() != null ? b.getCustomerEmail() : (b.getUser() != null ? b.getUser().getEmail() : "N/A");
            
            String showTime = b.getEventSchedule() != null ? 
                    LocalDateTime.of(b.getEventSchedule().getScheduleDate(), b.getEventSchedule().getStartTime()).format(TIME_FORMATTER) : "N/A";

            int count = b.getNumberOfTickets() != null ? b.getNumberOfTickets() : 1;
            String seatList = "N/A";
            String ticketCat = "General";
            boolean isEb = false;

            if (b.getBookingSeats() != null && !b.getBookingSeats().isEmpty()) {
                count = b.getBookingSeats().size();
                BookingSeat firstBs = b.getBookingSeats().iterator().next();
                if (Boolean.TRUE.equals(firstBs.getIsSharedAreaTicket())) {
                    ticketCat = "Shared Area " + (firstBs.getSharedAreaNumber() != null ? firstBs.getSharedAreaNumber() : "");
                    seatList = "Shared Standing (" + count + ")";
                } else {
                    seatList = b.getBookingSeats().stream()
                            .map(bs -> bs.getVenueSeatId() != null ? bs.getVenueSeatId() : "Seat")
                            .collect(Collectors.joining(", "));
                }
            }

            Event bEvent = b.getEvent();
            if (bEvent != null) {
                List<TicketCategory> bCats = categoriesByEventId.getOrDefault(bEvent.getEventId(), List.of());
                for (TicketCategory tc : bCats) {
                    if (tc.getEarlyBirdPrice() != null && isBookingInEarlyBirdWindow(b.getBookingTime(), tc.getSalesStartDate(), tc.getSalesEndDate())) {
                        isEb = true;
                        break;
                    }
                }
            }

            bookingDetails.add(CustomerBookingRowDTO.builder()
                    .bookingId(b.getBookingId())
                    .bookingReference(b.getBookingReference() != null ? b.getBookingReference() : b.getBookingId().toString().substring(0, 8).toUpperCase())
                    .customerName(customerName)
                    .customerEmail(customerEmail)
                    .showTimeLabel(showTime)
                    .seatNumbers(seatList)
                    .ticketCategory(ticketCat)
                    .ticketCount(count)
                    .totalAmount(b.getTotalAmount() != null ? b.getTotalAmount() : BigDecimal.ZERO)
                    .discountAmount(b.getDiscountAmount() != null ? b.getDiscountAmount() : BigDecimal.ZERO)
                    .discountInfo(b.getDiscountInfo())
                    .promoCode(b.getDiscountInfo())
                    .bookingDate(b.getBookingTime())
                    .status(b.getStatus() != null ? b.getStatus().name() : "CONFIRMED")
                    .paymentMethod(b.getPaymentStatus() != null ? b.getPaymentStatus() : "PAID")
                    .isEarlyBird(isEb)
                    .build());
        }

        // Date range label formatting
        String dateLabel = "All Time";
        if (startDate != null && endDate != null) {
            if (startDate.equals(endDate)) {
                dateLabel = startDate.format(DATE_FORMATTER) + " (Single Day)";
            } else {
                dateLabel = startDate.format(DATE_FORMATTER) + " - " + endDate.format(DATE_FORMATTER);
            }
        } else if (startDate != null) {
            dateLabel = "Since " + startDate.format(DATE_FORMATTER);
        } else if (endDate != null) {
            dateLabel = "Up to " + endDate.format(DATE_FORMATTER);
        }

        return SalesByDateReportDTO.builder()
                .startDate(startDate)
                .endDate(endDate)
                .dateRangeLabel(dateLabel)
                .totalRevenue(overallNet)
                .grossRevenue(overallGross)
                .totalRefunds(overallRefunds)
                .totalDiscounts(overallDiscounts)
                .totalPromoDiscounts(overallPromoDiscounts)
                .totalEarlyBirdSavings(overallEbSavings)
                .totalTicketsSold(overallTicketsSold)
                .earlyBirdTicketsSold(overallEarlyBirdSold)
                .totalBookingsCount(overallBookingCount)
                .promoBookingsCount(overallPromoCount)
                .activeEventsCount(eventsWithSales.size())
                .dailySales(dailySalesList)
                .eventSummaries(eventSummaries)
                .bookingDetails(bookingDetails)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getReportableEvents(UUID organizerId) {
        List<Event> events;
        if (organizerId != null) {
            events = eventRepository.findByOrganizer_OrganizerIdAndIsDeletedFalse(organizerId);
        } else {
            events = eventRepository.findAllByIsDeletedFalse();
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Event e : events) {
            Map<String, Object> map = new HashMap<>();
            map.put("eventId", e.getEventId());
            map.put("title", e.getName());
            map.put("status", e.getStatus() != null ? e.getStatus().name() : "DRAFT");
            map.put("venueName", e.getVenue() != null ? e.getVenue().getName() : (e.getVenueName() != null ? e.getVenueName() : "N/A"));
            map.put("organizerName", e.getOrganizer() != null ? e.getOrganizer().getOrganizationName() : "Admin");
            map.put("totalSchedules", e.getSchedules() != null ? e.getSchedules().size() : 0);
            result.add(map);
        }
        return result;
    }

    private List<DailySalesSummaryDTO> buildDailySalesForEvent(List<Booking> eventBookings, Event event, Map<UUID, BigDecimal> refundsMap) {
        Map<LocalDate, List<Booking>> grouped = new HashMap<>();
        for (Booking b : eventBookings) {
            if (b.getBookingTime() == null) continue;
            if (b.getStatus() != BookingStatus.CONFIRMED && b.getStatus() != BookingStatus.REFUNDED) continue;
            grouped.computeIfAbsent(b.getBookingTime().toLocalDate(), k -> new ArrayList<>()).add(b);
        }

        List<DailySalesSummaryDTO> result = new ArrayList<>();
        List<LocalDate> dates = new ArrayList<>(grouped.keySet());
        dates.sort(Comparator.reverseOrder());

        for (LocalDate d : dates) {
            List<Booking> bks = grouped.get(d);
            int tkCount = bks.stream()
                    .mapToInt(b -> b.getBookingSeats() != null && !b.getBookingSeats().isEmpty() ?
                            b.getBookingSeats().size() : (b.getNumberOfTickets() != null ? b.getNumberOfTickets() : 1))
                    .sum();

            BigDecimal gross = bks.stream()
                    .map(b -> b.getTotalAmount() != null ? b.getTotalAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, (a, b) -> a.add(b));

            BigDecimal discounts = bks.stream()
                    .map(b -> b.getDiscountAmount() != null ? b.getDiscountAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, (a, b) -> a.add(b));

            BigDecimal promo = bks.stream()
                    .filter(b -> b.getDiscountInfo() != null && (b.getDiscountInfo().toUpperCase().contains("PROMO") || b.getDiscountInfo().startsWith("CODE:")))
                    .map(b -> b.getDiscountAmount() != null ? b.getDiscountAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, (a, b) -> a.add(b));

            BigDecimal refunds = bks.stream()
                    .map(b -> refundsMap.getOrDefault(b.getBookingId(), BigDecimal.ZERO))
                    .reduce(BigDecimal.ZERO, (a, b) -> a.add(b));

            result.add(DailySalesSummaryDTO.builder()
                    .date(d)
                    .formattedDate(d.format(DATE_FORMATTER))
                    .totalTicketsSold(tkCount)
                    .earlyBirdTicketsSold(0)
                    .totalRevenue(gross.subtract(refunds))
                    .grossRevenue(gross)
                    .totalRefunds(refunds)
                    .totalDiscounts(discounts)
                    .promoDiscounts(promo)
                    .bookingCount(bks.size())
                    .activeEventsCount(1)
                    .build());
        }

        return result;
    }

    private boolean isEarlyBirdActive(BigDecimal ebPrice, LocalDateTime startDate, LocalDateTime endDate, LocalDateTime now) {
        if (ebPrice == null || ebPrice.compareTo(BigDecimal.ZERO) <= 0) return false;
        if (startDate != null && now.isBefore(startDate)) return false;
        if (endDate != null && now.isAfter(endDate)) return false;
        return true;
    }

    private boolean isBookingInEarlyBirdWindow(LocalDateTime bookingTime, LocalDateTime startDate, LocalDateTime endDate) {
        if (bookingTime == null) return false;
        if (startDate != null && bookingTime.isBefore(startDate)) return false;
        if (endDate != null && bookingTime.isAfter(endDate)) return false;
        return true;
    }

    private String getPromoStatusLabel(PromoCode p, LocalDateTime now) {
        if (Boolean.FALSE.equals(p.getIsActive())) return "INACTIVE";
        if (p.getUsageLimit() != null && p.getUsageCount() != null && p.getUsageCount() >= p.getUsageLimit()) return "EXHAUSTED";
        if (p.getEndDate() != null && now.isAfter(p.getEndDate())) return "EXPIRED";
        if (p.getStartDate() != null && now.isBefore(p.getStartDate())) return "UPCOMING";
        return "ACTIVE";
    }

    private String getCategoryForSeat(String venueSeatId, List<VenueSeat> seats) {
        if (venueSeatId == null || seats.isEmpty()) return "General";
        for (VenueSeat s : seats) {
            if (venueSeatId.equals(s.getSeatId())) {
                return s.getCategory() != null ? s.getCategory().getCategoryName() : "General";
            }
        }
        return "General";
    }
}
