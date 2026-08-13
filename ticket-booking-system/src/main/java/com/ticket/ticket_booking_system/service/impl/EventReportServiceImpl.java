package com.ticket.ticket_booking_system.service.impl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
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
import com.ticket.ticket_booking_system.dto.EventReportDTO.ScheduleSummaryDTO;
import com.ticket.ticket_booking_system.dto.EventReportDTO.SeatStatusDTO;
import com.ticket.ticket_booking_system.dto.EventReportDTO.SharedAreaSummaryDTO;
import com.ticket.ticket_booking_system.entity.Booking;
import com.ticket.ticket_booking_system.entity.Booking.BookingStatus;
import com.ticket.ticket_booking_system.entity.BookingSeat;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.EventSchedule;
import com.ticket.ticket_booking_system.entity.SeatHold;
import com.ticket.ticket_booking_system.entity.TicketCategory;
import com.ticket.ticket_booking_system.entity.Venue;
import com.ticket.ticket_booking_system.entity.VenueSeat;
import com.ticket.ticket_booking_system.repository.BookingRepository;
import com.ticket.ticket_booking_system.repository.BookingSeatRepository;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.EventScheduleRepository;
import com.ticket.ticket_booking_system.repository.SeatHoldRepository;
import com.ticket.ticket_booking_system.repository.TicketCategoryRepository;
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

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("MMM dd, yyyy - hh:mm a");

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

        // Fetch bookings for this event
        List<Booking> allEventBookings;
        if (scheduleId != null) {
            allEventBookings = bookingRepository.findByEventAndSchedule(eventId, scheduleId);
        } else {
            allEventBookings = bookingRepository.findAll().stream()
                    .filter(b -> b.getEvent() != null && eventId.equals(b.getEvent().getEventId()))
                    .collect(Collectors.toList());
        }

        // Build Shared Areas Breakdown
        List<SharedAreaSummaryDTO> sharedAreaSummaries = new ArrayList<>();
        int sharedAreaTotalCapacity = 0;
        int sharedAreaTicketsSold = 0;
        BigDecimal sharedAreaTotalRevenue = BigDecimal.ZERO;

        for (TicketCategory saCat : sharedAreaCategories) {
            int saCapacity = saCat.getCapacity() != null ? saCat.getCapacity() : 0;
            BigDecimal saPrice = saCat.getPrice() != null ? saCat.getPrice() : BigDecimal.ZERO;

            Long bookedCountObj = scheduleId != null ?
                    bookingRepository.countBookedSharedAreaTickets(scheduleId, saCat.getSharedAreaNumber()) : null;
            
            int saSold;
            if (bookedCountObj != null) {
                saSold = bookedCountObj.intValue();
            } else {
                // Aggregate across all bookings for this shared area
                saSold = (int) allEventBookings.stream()
                        .filter(b -> b.getStatus() == BookingStatus.CONFIRMED && b.getBookingSeats() != null)
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
                    .build());
        }

        // Build Schedules Breakdown
        List<ScheduleSummaryDTO> scheduleSummaries = new ArrayList<>();
        int totalEventCapacity = 0;
        int totalEventTicketsSold = 0;
        BigDecimal totalEventRevenue = BigDecimal.ZERO;

        for (EventSchedule sch : schedules) {
            LocalDateTime startDateTime = LocalDateTime.of(sch.getScheduleDate(), sch.getStartTime());
            LocalDateTime endDateTime = sch.getEndTime() != null ? LocalDateTime.of(sch.getScheduleDate(), sch.getEndTime()) : startDateTime.plusHours(3);

            List<Booking> schBookings = bookingRepository.findByEventAndSchedule(eventId, sch.getScheduleId());
            int soldCount = schBookings.stream()
                    .filter(b -> b.getStatus() == BookingStatus.CONFIRMED)
                    .mapToInt(b -> b.getBookingSeats() != null ? b.getBookingSeats().size() : 1)
                    .sum();

            BigDecimal schRev = schBookings.stream()
                    .filter(b -> b.getStatus() == BookingStatus.CONFIRMED)
                    .map(b -> b.getTotalAmount() != null ? b.getTotalAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, (a, b) -> a.add(b));

            int schCapacity = (venueSeats.isEmpty() ? (sch.getCapacity() != null ? sch.getCapacity() : 100) : venueSeats.size()) + sharedAreaTotalCapacity;
            int schAvailable = Math.max(0, schCapacity - soldCount);
            double schOccupancy = schCapacity > 0 ? (soldCount * 100.0 / schCapacity) : 0.0;

            totalEventCapacity += schCapacity;
            totalEventTicketsSold += soldCount;
            totalEventRevenue = totalEventRevenue.add(schRev);

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
        // Only CONFIRMED (successfully paid) seats should render as "sold" - a PENDING booking
        // hasn't actually been paid for yet and must show as a temporary hold, not booked.
        Set<String> confirmedSeatIds = targetScheduleId != null ? bookingSeatRepository.findConfirmedVenueSeatIdsByScheduleId(targetScheduleId) : Set.of();
        List<SeatHold> activeHolds = targetScheduleId != null ? seatHoldRepository.findActiveHoldsByScheduleId(targetScheduleId, LocalDateTime.now()) : List.of();
        Map<String, SeatHold> seatHoldMap = activeHolds.stream().collect(Collectors.toMap(h -> h.getVenueSeatId(), h -> h, (a, b) -> a));

        // Category Summaries Calculation (Seated Categories)
        Map<String, Integer> categoryTotalSeats = new HashMap<>();
        Map<String, Integer> categorySoldSeats = new HashMap<>();
        Map<String, Integer> categoryHeldSeats = new HashMap<>();
        Map<String, BigDecimal> categoryRevenueMap = new HashMap<>();
        Map<String, BigDecimal> categoryPriceMap = new HashMap<>();
        Map<String, String> categoryColorMap = new HashMap<>();

        for (VenueSeat seat : venueSeats) {
            String catName = seat.getCategory() != null ? seat.getCategory().getCategoryName() : "General";
            String color = seat.getCategory() != null ? seat.getCategory().getColorCode() : "#1976d2";
            categoryTotalSeats.put(catName, categoryTotalSeats.getOrDefault(catName, 0) + 1);
            categoryColorMap.putIfAbsent(catName, color);
        }

        for (TicketCategory tc : ticketCategories) {
            if (tc.getCategoryName() != null && tc.getPrice() != null) {
                categoryPriceMap.put(tc.getCategoryName(), tc.getPrice());
            }
        }

        // Calculate sold and revenue per category from confirmed bookings
        for (Booking b : allEventBookings) {
            if (b.getStatus() == BookingStatus.CONFIRMED && b.getBookingSeats() != null) {
                for (BookingSeat bs : b.getBookingSeats()) {
                    if (!Boolean.TRUE.equals(bs.getIsSharedAreaTicket())) {
                        String catName = bs.getVenueSeatId() != null ? getCategoryForSeat(bs.getVenueSeatId(), venueSeats) : "General";
                        categorySoldSeats.put(catName, categorySoldSeats.getOrDefault(catName, 0) + 1);
                        BigDecimal p = bs.getPriceAtBooking() != null ? bs.getPriceAtBooking() : BigDecimal.ZERO;
                        categoryRevenueMap.put(catName, categoryRevenueMap.getOrDefault(catName, BigDecimal.ZERO).add(p));
                    }
                }
            }
        }

        List<CategorySummaryDTO> categorySummaries = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : categoryTotalSeats.entrySet()) {
            String catName = entry.getKey();
            int totalS = entry.getValue();
            int soldS = categorySoldSeats.getOrDefault(catName, 0);
            int heldS = categoryHeldSeats.getOrDefault(catName, 0);
            int availS = Math.max(0, totalS - soldS - heldS);
            BigDecimal price = categoryPriceMap.getOrDefault(catName, BigDecimal.ZERO);
            BigDecimal catRev = categoryRevenueMap.getOrDefault(catName, BigDecimal.ZERO);
            double occ = totalS > 0 ? (soldS * 100.0 / totalS) : 0.0;

            categorySummaries.add(CategorySummaryDTO.builder()
                    .categoryName(catName)
                    .colorCode(categoryColorMap.getOrDefault(catName, "#1976d2"))
                    .unitPrice(price)
                    .totalSeats(totalS)
                    .ticketsSold(soldS)
                    .ticketsAvailable(availS)
                    .ticketsHeld(heldS)
                    .categoryRevenue(catRev)
                    .occupancyRate(Math.round(occ * 100.0) / 100.0)
                    .build());
        }

        // Customer Booking Rows
        List<CustomerBookingRowDTO> customerBookings = new ArrayList<>();
        for (Booking b : allEventBookings) {
            String customerName = b.getUser() != null ? 
                    (b.getUser().getFirstName() + " " + (b.getUser().getLastName() != null ? b.getUser().getLastName() : "")).trim() : "Guest";
            String customerEmail = b.getCustomerEmail() != null ? b.getCustomerEmail() : (b.getUser() != null ? b.getUser().getEmail() : "N/A");
            
            String showTime = b.getEventSchedule() != null ? 
                    LocalDateTime.of(b.getEventSchedule().getScheduleDate(), b.getEventSchedule().getStartTime()).format(TIME_FORMATTER) : "N/A";

            String seatList = "N/A";
            String ticketCat = "General";
            int count = b.getNumberOfTickets() != null ? b.getNumberOfTickets() : 1;

            if (b.getBookingSeats() != null && !b.getBookingSeats().isEmpty()) {
                count = b.getBookingSeats().size();
                List<BookingSeat> bsList = new ArrayList<>(b.getBookingSeats());
                BookingSeat firstBs = bsList.get(0);
                if (Boolean.TRUE.equals(firstBs.getIsSharedAreaTicket())) {
                    ticketCat = "Shared Standing Area " + (firstBs.getSharedAreaNumber() != null ? firstBs.getSharedAreaNumber() : "");
                    seatList = "Shared Standing Ticket (" + count + ")";
                } else {
                    ticketCat = getCategoryForSeat(firstBs.getVenueSeatId(), venueSeats);
                    seatList = bsList.stream()
                            .map(bs -> bs.getVenueSeatId() != null ? bs.getVenueSeatId() : "Seat")
                            .filter(s -> s != null && !s.isBlank())
                            .collect(Collectors.joining(", "));
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
                    .bookingDate(b.getBookingTime())
                    .status(b.getStatus() != null ? b.getStatus().name() : "CONFIRMED")
                    .paymentMethod(b.getPaymentStatus() != null ? b.getPaymentStatus() : "PAID")
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
                // Booked by a PENDING (unpaid) booking or an active checkout hold - not sold yet
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
        BigDecimal totalRev = (scheduleId != null ? customerBookings.stream().filter(cb -> "CONFIRMED".equalsIgnoreCase(cb.getStatus())).map(cb -> cb.getTotalAmount()).reduce(BigDecimal.ZERO, (a, b) -> a.add(b)) : totalEventRevenue).add(sharedAreaTotalRevenue);
        int totalAvail = Math.max(0, totalCap - totalSold);
        double overallOccupancy = totalCap > 0 ? (totalSold * 100.0 / totalCap) : 0.0;

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
                .totalCapacity(totalCap)
                .totalTicketsSold(totalSold)
                .totalTicketsAvailable(totalAvail)
                .totalTicketsHeld((int) activeHolds.size())
                .totalTicketsLocked((int) seatStatusMap.stream().filter(s -> "LOCKED".equals(s.getStatus())).count())
                .occupancyRate(Math.round(overallOccupancy * 100.0) / 100.0)
                .schedules(scheduleSummaries)
                .categorySummaries(categorySummaries)
                .sharedAreaSummaries(sharedAreaSummaries)
                .bookingDetails(customerBookings)
                .seatAvailabilityMap(seatStatusMap)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getReportableEvents(UUID organizerId) {
        List<Event> events;
        if (organizerId != null) {
            events = eventRepository.findByOrganizer_OrganizerId(organizerId);
        } else {
            events = eventRepository.findAll();
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
