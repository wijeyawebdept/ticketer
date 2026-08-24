package com.ticket.ticket_booking_system.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ticket.ticket_booking_system.dto.request.CheckInScanRequest;
import com.ticket.ticket_booking_system.dto.response.CheckInAttendeeDTO;
import com.ticket.ticket_booking_system.dto.response.CheckInResponse;
import com.ticket.ticket_booking_system.dto.response.CheckInResponse.CheckInTicketDetail;
import com.ticket.ticket_booking_system.dto.response.CheckInStatsResponse;
import com.ticket.ticket_booking_system.dto.response.CheckInStatsResponse.RecentCheckInItem;
import com.ticket.ticket_booking_system.dto.response.CheckInStatsResponse.SharedAreaStats;
import com.ticket.ticket_booking_system.entity.Booking;
import com.ticket.ticket_booking_system.entity.Booking.BookingStatus;
import com.ticket.ticket_booking_system.entity.BookingSeat;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.EventSchedule;
import com.ticket.ticket_booking_system.entity.TicketCategory;
import com.ticket.ticket_booking_system.entity.VenueSeat;
import com.ticket.ticket_booking_system.repository.BookingRepository;
import com.ticket.ticket_booking_system.repository.BookingSeatRepository;
import com.ticket.ticket_booking_system.repository.EventScheduleRepository;
import com.ticket.ticket_booking_system.repository.TicketCategoryRepository;
import com.ticket.ticket_booking_system.repository.VenueSeatRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CheckInService {

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final EventScheduleRepository eventScheduleRepository;
    private final VenueSeatRepository venueSeatRepository;
    private final TicketCategoryRepository ticketCategoryRepository;
    private final SeatWebSocketService seatWebSocketService;
    private final ObjectMapper objectMapper;

    private static final Pattern REF_PATTERN = Pattern.compile("REF:\\s*(BK-[A-Z0-9]+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern BK_PATTERN = Pattern.compile("BK-[A-Z0-9]{8}", Pattern.CASE_INSENSITIVE);
    private static final Pattern TK_PATTERN = Pattern.compile("TK-[A-Z0-9]{12}", Pattern.CASE_INSENSITIVE);

    /**
     * Process scanned QR code or manually entered reference/ticket code.
     */
    @Transactional
    public CheckInResponse scanAndCheckIn(CheckInScanRequest request, UUID staffUserId, String staffName) {
        String rawData = request.getQrData() != null ? request.getQrData().trim() : "";
        log.info("Processing check-in scan: '{}', staff: {}", rawData, staffName);

        ParsedScanTarget target = parseScanPayload(rawData, request.getTicketCode());

        if (target.bookingReference == null && target.ticketCode == null) {
            return CheckInResponse.builder()
                    .valid(false)
                    .statusType("ERROR")
                    .message("Unrecognized QR code or ticket format.")
                    .build();
        }

        Booking booking = null;
        BookingSeat specificSeat = null;

        // If ticket code is provided, try finding specific BookingSeat first
        if (target.ticketCode != null) {
            Optional<BookingSeat> seatOpt = bookingSeatRepository.findByTicketCode(target.ticketCode);
            if (seatOpt.isPresent()) {
                specificSeat = seatOpt.get();
                booking = specificSeat.getBooking();
            }
        }

        // Fallback to finding by booking reference
        if (booking == null && target.bookingReference != null) {
            Optional<Booking> bookingOpt = bookingRepository.findByBookingReference(target.bookingReference);
            if (bookingOpt.isPresent()) {
                booking = bookingOpt.get();
            }
        }

        if (booking == null) {
            return CheckInResponse.builder()
                    .valid(false)
                    .statusType("ERROR")
                    .message("No active booking found matching reference: " + (target.bookingReference != null ? target.bookingReference : target.ticketCode))
                    .build();
        }

        // 1. Status Check
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            return CheckInResponse.builder()
                    .valid(false)
                    .statusType(booking.getStatus().name())
                    .bookingId(booking.getBookingId())
                    .bookingReference(booking.getBookingReference())
                    .customerName(resolveCustomerName(booking))
                    .message("Ticket cannot be checked in. Booking status is " + booking.getStatus())
                    .build();
        }

        // 2. Event & Schedule Matching Check (if schedule is specified)
        if (request.getEventScheduleId() != null && booking.getEventSchedule() != null) {
            if (!booking.getEventSchedule().getScheduleId().equals(request.getEventScheduleId())) {
                return CheckInResponse.builder()
                        .valid(false)
                        .statusType("INVALID_EVENT")
                        .bookingId(booking.getBookingId())
                        .bookingReference(booking.getBookingReference())
                        .customerName(resolveCustomerName(booking))
                        .eventName(booking.getEvent() != null ? booking.getEvent().getName() : "")
                        .scheduleDate(booking.getEventSchedule().getScheduleDate() != null ? booking.getEventSchedule().getScheduleDate().toString() : "")
                        .message("Ticket is for a different event schedule! (" + 
                                (booking.getEventSchedule().getScheduleDate() != null ? booking.getEventSchedule().getScheduleDate() : "N/A") + ")")
                        .build();
            }
        }

        LocalDateTime now = LocalDateTime.now();
        boolean alreadyCheckedIn = false;
        List<String> newlyCheckedInSeats = new ArrayList<>();
        List<String> newlyCheckedInTicketCodes = new ArrayList<>();
        List<Integer> newlyCheckedInSharedAreas = new ArrayList<>();

        if (specificSeat != null) {
            // When an individual ticket code (TK-...) is scanned, check in ONLY that specific seat
            if (Boolean.TRUE.equals(specificSeat.getCheckedIn())) {
                alreadyCheckedIn = true;
            } else {
                specificSeat.setCheckedIn(true);
                specificSeat.setCheckedInAt(now);
                specificSeat.setCheckedInBy(staffUserId);
                bookingSeatRepository.save(specificSeat);

                if (specificSeat.getVenueSeatId() != null) newlyCheckedInSeats.add(specificSeat.getVenueSeatId());
                if (specificSeat.getTicketCode() != null) newlyCheckedInTicketCodes.add(specificSeat.getTicketCode());
                if (Boolean.TRUE.equals(specificSeat.getIsSharedAreaTicket()) && specificSeat.getSharedAreaNumber() != null) {
                    newlyCheckedInSharedAreas.add(specificSeat.getSharedAreaNumber());
                }
            }
        } else {
            // Master booking reference BK-... scanned: check in all remaining seats in the booking
            boolean anyUnchecked = false;
            for (BookingSeat bs : booking.getBookingSeats()) {
                if (!Boolean.TRUE.equals(bs.getCheckedIn())) {
                    anyUnchecked = true;
                    bs.setCheckedIn(true);
                    bs.setCheckedInAt(now);
                    bs.setCheckedInBy(staffUserId);

                    if (bs.getVenueSeatId() != null) newlyCheckedInSeats.add(bs.getVenueSeatId());
                    if (bs.getTicketCode() != null) newlyCheckedInTicketCodes.add(bs.getTicketCode());
                    if (Boolean.TRUE.equals(bs.getIsSharedAreaTicket()) && bs.getSharedAreaNumber() != null) {
                        newlyCheckedInSharedAreas.add(bs.getSharedAreaNumber());
                    }
                }
            }

            if (!anyUnchecked) {
                alreadyCheckedIn = true;
            } else {
                bookingSeatRepository.saveAll(booking.getBookingSeats());
            }
        }

        // Mark booking attended
        booking.setAttended(true);
        bookingRepository.save(booking);

        // Calculate counts
        int totalTickets = booking.getBookingSeats().size();
        long checkedInCount = booking.getBookingSeats().stream().filter(bs -> Boolean.TRUE.equals(bs.getCheckedIn())).count();

        // Broadcast WebSocket check-in event if new check-ins occurred
        if (!newlyCheckedInTicketCodes.isEmpty() && booking.getEvent() != null && booking.getEventSchedule() != null) {
            UUID eventId = booking.getEvent().getEventId();
            UUID scheduleId = booking.getEventSchedule().getScheduleId();
            Long totalScheduleBooked = bookingSeatRepository.countBookedSeatsForSchedule(scheduleId);
            Long totalScheduleCheckedIn = bookingSeatRepository.countCheckedInSeatsForSchedule(scheduleId);

            SeatWebSocketService.CheckInEventMessage wsMsg = new SeatWebSocketService.CheckInEventMessage(
                    eventId,
                    scheduleId,
                    booking.getBookingReference(),
                    resolveCustomerName(booking),
                    newlyCheckedInTicketCodes,
                    newlyCheckedInSeats,
                    newlyCheckedInSharedAreas,
                    (int) checkedInCount,
                    totalTickets,
                    totalScheduleBooked != null ? totalScheduleBooked : 0L,
                    totalScheduleCheckedIn != null ? totalScheduleCheckedIn : 0L,
                    "CHECKED_IN"
            );

            seatWebSocketService.notifyCheckIn(eventId, scheduleId, wsMsg);
        }

        // Build Response
        List<CheckInTicketDetail> allDetails = mapBookingSeatsToDetails(booking.getBookingSeats());
        List<CheckInTicketDetail> seatedDetails = allDetails.stream().filter(d -> !Boolean.TRUE.equals(d.getIsSharedAreaTicket())).collect(Collectors.toList());
        List<CheckInTicketDetail> sharedDetails = allDetails.stream().filter(d -> Boolean.TRUE.equals(d.getIsSharedAreaTicket())).collect(Collectors.toList());

        String message;
        String statusType;
        if (alreadyCheckedIn) {
            statusType = "ALREADY_CHECKED_IN";
            if (specificSeat != null) {
                message = "Notice: Ticket " + (specificSeat.getVenueSeatId() != null ? specificSeat.getVenueSeatId() : specificSeat.getTicketCode()) + " is already checked in.";
            } else {
                message = "Notice: All tickets for " + booking.getBookingReference() + " were already checked in.";
            }
        } else {
            statusType = "SUCCESS";
            if (specificSeat != null) {
                String seatLabel = specificSeat.getVenueSeatId() != null ? specificSeat.getVenueSeatId() : "1 ticket";
                message = "Check-in successful! Welcome " + resolveCustomerName(booking) + " (" + seatLabel + " verified)";
            } else {
                message = "Check-in successful! Welcome " + resolveCustomerName(booking) + " (" + newlyCheckedInTicketCodes.size() + " ticket(s) verified)";
            }
        }

        String scheduleDate = "N/A";
        String scheduleTime = "N/A";
        if (booking.getEventSchedule() != null) {
            if (booking.getEventSchedule().getScheduleDate() != null) {
                scheduleDate = booking.getEventSchedule().getScheduleDate().format(DateTimeFormatter.ofPattern("dd MMMM yyyy"));
            }
            if (booking.getEventSchedule().getStartTime() != null) {
                scheduleTime = booking.getEventSchedule().getStartTime().format(DateTimeFormatter.ofPattern("hh:mm a"));
            }
        }

        String venueName = "N/A";
        if (booking.getEvent() != null) {
            venueName = booking.getEvent().getVenueName() != null ? booking.getEvent().getVenueName() : 
                        (booking.getEvent().getVenue() != null ? booking.getEvent().getVenue().getName() : "N/A");
        }

        return CheckInResponse.builder()
                .valid(true)
                .alreadyCheckedIn(alreadyCheckedIn)
                .statusType(statusType)
                .message(message)
                .bookingId(booking.getBookingId())
                .bookingReference(booking.getBookingReference())
                .customerName(resolveCustomerName(booking))
                .customerEmail(booking.getCustomerEmail() != null ? booking.getCustomerEmail() : (booking.getUser() != null ? booking.getUser().getEmail() : ""))
                .customerPhone(booking.getCustomerPhone() != null ? booking.getCustomerPhone() : (booking.getUser() != null ? booking.getUser().getPhoneNumber() : ""))
                .customerNic(booking.getCustomerNic())
                .eventId(booking.getEvent() != null ? booking.getEvent().getEventId() : null)
                .eventName(booking.getEvent() != null ? booking.getEvent().getName() : "N/A")
                .scheduleId(booking.getEventSchedule() != null ? booking.getEventSchedule().getScheduleId() : null)
                .scheduleDate(scheduleDate)
                .scheduleTime(scheduleTime)
                .venueName(venueName)
                .totalTickets(totalTickets)
                .checkedInTickets((int) checkedInCount)
                .checkedInAt(now)
                .checkedInByName(staffName)
                .allTickets(allDetails)
                .seatedTickets(seatedDetails)
                .sharedAreaTickets(sharedDetails)
                .build();
    }

    /**
     * Manually toggle check-in state for an individual seat.
     */
    @Transactional
    public CheckInResponse toggleSeatCheckIn(UUID bookingSeatId, boolean checkIn, UUID staffUserId, String staffName) {
        BookingSeat seat = bookingSeatRepository.findById(bookingSeatId)
                .orElseThrow(() -> new RuntimeException("BookingSeat not found with ID: " + bookingSeatId));

        Booking booking = seat.getBooking();
        seat.setCheckedIn(checkIn);
        seat.setCheckedInAt(checkIn ? LocalDateTime.now() : null);
        seat.setCheckedInBy(checkIn ? staffUserId : null);
        bookingSeatRepository.save(seat);

        // Update booking attended status
        boolean anyAttended = booking.getBookingSeats().stream().anyMatch(bs -> Boolean.TRUE.equals(bs.getCheckedIn()));
        booking.setAttended(anyAttended);
        bookingRepository.save(booking);

        // Broadcast WebSocket
        if (booking.getEvent() != null && booking.getEventSchedule() != null) {
            UUID eventId = booking.getEvent().getEventId();
            UUID scheduleId = booking.getEventSchedule().getScheduleId();
            Long totalScheduleBooked = bookingSeatRepository.countBookedSeatsForSchedule(scheduleId);
            Long totalScheduleCheckedIn = bookingSeatRepository.countCheckedInSeatsForSchedule(scheduleId);

            List<String> tktCodes = seat.getTicketCode() != null ? List.of(seat.getTicketCode()) : List.of();
            List<String> seatIds = seat.getVenueSeatId() != null ? List.of(seat.getVenueSeatId()) : List.of();
            List<Integer> sharedArea = (Boolean.TRUE.equals(seat.getIsSharedAreaTicket()) && seat.getSharedAreaNumber() != null) 
                    ? List.of(seat.getSharedAreaNumber()) : List.of();

            SeatWebSocketService.CheckInEventMessage wsMsg = new SeatWebSocketService.CheckInEventMessage(
                    eventId,
                    scheduleId,
                    booking.getBookingReference(),
                    resolveCustomerName(booking),
                    tktCodes,
                    seatIds,
                    sharedArea,
                    booking.getBookingSeats().stream().filter(bs -> Boolean.TRUE.equals(bs.getCheckedIn())).mapToInt(bs -> 1).sum(),
                    booking.getBookingSeats().size(),
                    totalScheduleBooked != null ? totalScheduleBooked : 0L,
                    totalScheduleCheckedIn != null ? totalScheduleCheckedIn : 0L,
                    checkIn ? "CHECKED_IN" : "UNCHECKED"
            );

            seatWebSocketService.notifyCheckIn(eventId, scheduleId, wsMsg);
        }

        List<CheckInTicketDetail> allDetails = mapBookingSeatsToDetails(booking.getBookingSeats());
        return CheckInResponse.builder()
                .valid(true)
                .statusType("SUCCESS")
                .message("Seat status updated to " + (checkIn ? "CHECKED IN" : "UNCHECKED"))
                .bookingId(booking.getBookingId())
                .bookingReference(booking.getBookingReference())
                .customerName(resolveCustomerName(booking))
                .totalTickets(booking.getBookingSeats().size())
                .checkedInTickets((int) booking.getBookingSeats().stream().filter(bs -> Boolean.TRUE.equals(bs.getCheckedIn())).count())
                .allTickets(allDetails)
                .seatedTickets(allDetails.stream().filter(d -> !Boolean.TRUE.equals(d.getIsSharedAreaTicket())).collect(Collectors.toList()))
                .sharedAreaTickets(allDetails.stream().filter(d -> Boolean.TRUE.equals(d.getIsSharedAreaTicket())).collect(Collectors.toList()))
                .build();
    }

    /**
     * Get real-time check-in stats for an event schedule.
     */
    @Transactional(readOnly = true)
    public CheckInStatsResponse getScheduleCheckInStats(UUID scheduleId) {
        EventSchedule schedule = eventScheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("EventSchedule not found with ID: " + scheduleId));

        Event event = schedule.getEvent();
        List<BookingSeat> allScheduleSeats = bookingSeatRepository.findByScheduleId(scheduleId);

        long totalBooked = allScheduleSeats.size();
        long totalCheckedIn = allScheduleSeats.stream().filter(bs -> Boolean.TRUE.equals(bs.getCheckedIn())).count();
        long totalPending = totalBooked - totalCheckedIn;
        double checkInPercentage = totalBooked > 0 ? ((double) totalCheckedIn / totalBooked) * 100.0 : 0.0;

        // Seated vs Shared
        long seatedBooked = allScheduleSeats.stream().filter(bs -> !Boolean.TRUE.equals(bs.getIsSharedAreaTicket())).count();
        long seatedCheckedIn = allScheduleSeats.stream().filter(bs -> !Boolean.TRUE.equals(bs.getIsSharedAreaTicket()) && Boolean.TRUE.equals(bs.getCheckedIn())).count();
        long sharedBooked = allScheduleSeats.stream().filter(bs -> Boolean.TRUE.equals(bs.getIsSharedAreaTicket())).count();
        long sharedCheckedIn = allScheduleSeats.stream().filter(bs -> Boolean.TRUE.equals(bs.getIsSharedAreaTicket()) && Boolean.TRUE.equals(bs.getCheckedIn())).count();

        // Shared areas breakdown
        Map<Integer, SharedAreaStats> sharedAreaMap = new HashMap<>();
        if (event != null) {
            List<TicketCategory> sharedCategories = ticketCategoryRepository.findSharedAreaCategoriesByEventId(event.getEventId());
            for (TicketCategory tc : sharedCategories) {
                int areaNum = tc.getSharedAreaNumber() != null ? tc.getSharedAreaNumber() : 1;
                long bookedInArea = allScheduleSeats.stream()
                        .filter(bs -> Boolean.TRUE.equals(bs.getIsSharedAreaTicket()) && Integer.valueOf(areaNum).equals(bs.getSharedAreaNumber()))
                        .count();
                long checkedInInArea = allScheduleSeats.stream()
                        .filter(bs -> Boolean.TRUE.equals(bs.getIsSharedAreaTicket()) && Integer.valueOf(areaNum).equals(bs.getSharedAreaNumber()) && Boolean.TRUE.equals(bs.getCheckedIn()))
                        .count();

                sharedAreaMap.put(areaNum, SharedAreaStats.builder()
                        .sharedAreaNumber(areaNum)
                        .categoryName(tc.getCategoryName())
                        .capacity(tc.getCapacity() != null ? tc.getCapacity().longValue() : 0L)
                        .booked(bookedInArea)
                        .checkedIn(checkedInInArea)
                        .pending(bookedInArea - checkedInInArea)
                        .build());
            }
        }

        // Recent check-in items (sorted by checkedInAt desc)
        List<RecentCheckInItem> recentItems = allScheduleSeats.stream()
                .filter(bs -> Boolean.TRUE.equals(bs.getCheckedIn()) && bs.getCheckedInAt() != null)
                .sorted((a, b) -> b.getCheckedInAt().compareTo(a.getCheckedInAt()))
                .limit(25)
                .map(bs -> {
                    String seatDesc;
                    if (Boolean.TRUE.equals(bs.getIsSharedAreaTicket())) {
                        seatDesc = "Shared Area #" + bs.getSharedAreaNumber();
                    } else if (bs.getVenueSeatId() != null) {
                        seatDesc = bs.getVenueSeatId();
                    } else {
                        seatDesc = "Seat";
                    }

                    String timeFormatted = bs.getCheckedInAt().format(DateTimeFormatter.ofPattern("hh:mm:ss a"));

                    return RecentCheckInItem.builder()
                            .customerName(resolveCustomerName(bs.getBooking()))
                            .bookingReference(bs.getBooking() != null ? bs.getBooking().getBookingReference() : "")
                            .ticketCode(bs.getTicketCode())
                            .seatIdentifier(seatDesc)
                            .checkedInAtTime(timeFormatted)
                            .isSharedArea(Boolean.TRUE.equals(bs.getIsSharedAreaTicket()))
                            .build();
                })
                .collect(Collectors.toList());

        String scheduleDate = schedule.getScheduleDate() != null ? schedule.getScheduleDate().format(DateTimeFormatter.ofPattern("dd MMMM yyyy")) : "N/A";
        String scheduleTime = schedule.getStartTime() != null ? schedule.getStartTime().format(DateTimeFormatter.ofPattern("hh:mm a")) : "N/A";

        return CheckInStatsResponse.builder()
                .eventId(event != null ? event.getEventId() : null)
                .eventName(event != null ? event.getName() : "N/A")
                .scheduleId(schedule.getScheduleId())
                .scheduleDate(scheduleDate)
                .scheduleTime(scheduleTime)
                .totalBooked(totalBooked)
                .totalCheckedIn(totalCheckedIn)
                .totalPendingArrival(totalPending)
                .checkInPercentage(Math.round(checkInPercentage * 10.0) / 10.0)
                .totalSeatedBooked(seatedBooked)
                .totalSeatedCheckedIn(seatedCheckedIn)
                .totalSharedBooked(sharedBooked)
                .totalSharedCheckedIn(sharedCheckedIn)
                .sharedAreaBreakdown(sharedAreaMap)
                .recentCheckIns(recentItems)
                .build();
    }

    /**
     * Get attendee list for a schedule with filtering.
     */
    @Transactional(readOnly = true)
    public List<CheckInAttendeeDTO> getScheduleAttendees(UUID scheduleId, String search, Boolean checkedInOnly) {
        List<BookingSeat> seats = bookingSeatRepository.findByScheduleId(scheduleId);

        return seats.stream()
                .filter(bs -> {
                    if (Boolean.TRUE.equals(checkedInOnly) && !Boolean.TRUE.equals(bs.getCheckedIn())) {
                        return false;
                    }
                    if (search != null && !search.isBlank()) {
                        String s = search.toLowerCase();
                        String custName = resolveCustomerName(bs.getBooking()).toLowerCase();
                        String ref = bs.getBooking() != null && bs.getBooking().getBookingReference() != null ? bs.getBooking().getBookingReference().toLowerCase() : "";
                        String tkt = bs.getTicketCode() != null ? bs.getTicketCode().toLowerCase() : "";
                        String phone = bs.getBooking() != null && bs.getBooking().getCustomerPhone() != null ? bs.getBooking().getCustomerPhone().toLowerCase() : "";
                        String nic = bs.getBooking() != null && bs.getBooking().getCustomerNic() != null ? bs.getBooking().getCustomerNic().toLowerCase() : "";
                        String seatId = bs.getVenueSeatId() != null ? bs.getVenueSeatId().toLowerCase() : "";

                        return custName.contains(s) || ref.contains(s) || tkt.contains(s) || phone.contains(s) || nic.contains(s) || seatId.contains(s);
                    }
                    return true;
                })
                .map(bs -> {
                    Booking b = bs.getBooking();
                    String section = "";
                    String row = "";
                    String seatNo = bs.getVenueSeatId() != null ? bs.getVenueSeatId() : "";

                    if (bs.getVenueSeatId() != null) {
                        try {
                            Optional<VenueSeat> vsOpt = venueSeatRepository.findById(bs.getVenueSeatId());
                            if (vsOpt.isPresent()) {
                                VenueSeat vs = vsOpt.get();
                                section = vs.getSection();
                                row = vs.getRowLabel();
                                if (vs.getSeatNumber() != null) seatNo = String.valueOf(vs.getSeatNumber());
                            }
                        } catch (Exception e) {}
                    }

                    return CheckInAttendeeDTO.builder()
                            .bookingSeatId(bs.getBookingSeatId())
                            .bookingId(b != null ? b.getBookingId() : null)
                            .bookingReference(b != null ? b.getBookingReference() : "")
                            .customerName(resolveCustomerName(b))
                            .customerEmail(b != null ? b.getCustomerEmail() : "")
                            .customerPhone(b != null ? b.getCustomerPhone() : "")
                            .customerNic(b != null ? b.getCustomerNic() : "")
                            .ticketCode(bs.getTicketCode())
                            .venueSeatId(bs.getVenueSeatId())
                            .section(section)
                            .rowLabel(row)
                            .seatNumber(seatNo)
                            .isSharedAreaTicket(Boolean.TRUE.equals(bs.getIsSharedAreaTicket()))
                            .sharedAreaNumber(bs.getSharedAreaNumber())
                            .checkedIn(Boolean.TRUE.equals(bs.getCheckedIn()))
                            .checkedInAt(bs.getCheckedInAt())
                            .build();
                })
                .collect(Collectors.toList());
    }

    // ── Helper Methods ────────────────────────────────────────────────────────

    private ParsedScanTarget parseScanPayload(String rawData, String explicitTicketCode) {
        if (explicitTicketCode != null && !explicitTicketCode.isBlank()) {
            return new ParsedScanTarget(null, explicitTicketCode.trim().toUpperCase());
        }

        // Try JSON parsing
        if (rawData.startsWith("{") && rawData.endsWith("}")) {
            try {
                JsonNode node = objectMapper.readTree(rawData);
                String ref = node.has("ref") ? node.get("ref").asText() : null;
                String ticket = node.has("ticket") ? node.get("ticket").asText() : null;
                if (ticket == null && node.has("ticketCode")) ticket = node.get("ticketCode").asText();
                return new ParsedScanTarget(ref, ticket);
            } catch (Exception e) {
                log.debug("Failed to parse JSON QR data: {}", e.getMessage());
            }
        }

        // Try Regex match for REF: BK-...
        Matcher refMatcher = REF_PATTERN.matcher(rawData);
        if (refMatcher.find()) {
            return new ParsedScanTarget(refMatcher.group(1).toUpperCase(), null);
        }

        // Try Ticket code TK-...
        Matcher tkMatcher = TK_PATTERN.matcher(rawData);
        if (tkMatcher.find()) {
            return new ParsedScanTarget(null, tkMatcher.group().toUpperCase());
        }

        // Try raw Booking ref BK-...
        Matcher bkMatcher = BK_PATTERN.matcher(rawData);
        if (bkMatcher.find()) {
            return new ParsedScanTarget(bkMatcher.group().toUpperCase(), null);
        }

        return new ParsedScanTarget(rawData.toUpperCase(), null);
    }

    private String resolveCustomerName(Booking booking) {
        if (booking == null) return "Guest Customer";
        if (booking.getUser() != null) {
            String first = booking.getUser().getFirstName() != null ? booking.getUser().getFirstName() : "";
            String last = booking.getUser().getLastName() != null ? booking.getUser().getLastName() : "";
            String full = (first + " " + last).trim();
            if (!full.isEmpty()) return full;
        }
        return "Customer (" + (booking.getCustomerEmail() != null ? booking.getCustomerEmail() : "Guest") + ")";
    }

    private List<CheckInTicketDetail> mapBookingSeatsToDetails(java.util.Collection<BookingSeat> seats) {
        if (seats == null) return new ArrayList<>();
        return seats.stream().map(bs -> {
            String section = "";
            String row = "";
            String seatNo = bs.getVenueSeatId() != null ? bs.getVenueSeatId() : "";

            if (bs.getVenueSeatId() != null) {
                try {
                    Optional<VenueSeat> vsOpt = venueSeatRepository.findById(bs.getVenueSeatId());
                    if (vsOpt.isPresent()) {
                        VenueSeat vs = vsOpt.get();
                        section = vs.getSection();
                        row = vs.getRowLabel();
                        if (vs.getSeatNumber() != null) seatNo = String.valueOf(vs.getSeatNumber());
                    }
                } catch (Exception e) {}
            }

            return CheckInTicketDetail.builder()
                    .bookingSeatId(bs.getBookingSeatId())
                    .ticketCode(bs.getTicketCode())
                    .venueSeatId(bs.getVenueSeatId())
                    .section(section)
                    .rowLabel(row)
                    .seatNumber(seatNo)
                    .isSharedAreaTicket(Boolean.TRUE.equals(bs.getIsSharedAreaTicket()))
                    .sharedAreaNumber(bs.getSharedAreaNumber())
                    .price(bs.getPriceAtBooking())
                    .checkedIn(Boolean.TRUE.equals(bs.getCheckedIn()))
                    .checkedInAt(bs.getCheckedInAt())
                    .build();
        }).collect(Collectors.toList());
    }

    private static class ParsedScanTarget {
        final String bookingReference;
        final String ticketCode;

        ParsedScanTarget(String bookingReference, String ticketCode) {
            this.bookingReference = bookingReference;
            this.ticketCode = ticketCode;
        }
    }
}
