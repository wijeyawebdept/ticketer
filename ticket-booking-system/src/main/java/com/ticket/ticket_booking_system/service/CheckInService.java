package com.ticket.ticket_booking_system.service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ticket.ticket_booking_system.dto.request.CheckInScanRequest;
import com.ticket.ticket_booking_system.dto.request.OfflineSyncRequest;
import com.ticket.ticket_booking_system.dto.response.CheckInAttendeeDTO;
import com.ticket.ticket_booking_system.dto.response.CheckInResponse;
import com.ticket.ticket_booking_system.dto.response.CheckInResponse.CheckInTicketDetail;
import com.ticket.ticket_booking_system.dto.response.CheckInStatsResponse;
import com.ticket.ticket_booking_system.dto.response.CheckInStatsResponse.RecentCheckInItem;
import com.ticket.ticket_booking_system.dto.response.CheckInStatsResponse.SharedAreaStats;
import com.ticket.ticket_booking_system.dto.response.OfflineSyncResponse;
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
    private final SeatWebSocketService seatWebSocketService;
    private final ObjectMapper objectMapper;

    private static final Pattern REF_PATTERN = Pattern.compile("REF:\\s*(BK-[A-Z0-9]+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern BK_PATTERN = Pattern.compile("BK-[A-Z0-9]{8}", Pattern.CASE_INSENSITIVE);
    private static final Pattern TK_PATTERN = Pattern.compile("TK-[A-Z0-9]{12}", Pattern.CASE_INSENSITIVE);

    public static final String HMAC_ALGO = "HmacSHA256";
    public static final String DEFAULT_HMAC_SECRET = "TicketerSecretKeyForQrCodeCryptographicSigning2026!";

    /**
     * Compute compact 16-hex HMAC-SHA256 signature for anti-counterfeiting verification.
     */
    public static String computeHmacSignature(String ticketCode, String bookingRef, String secret) {
        try {
            String keyToUse = (secret != null && !secret.isBlank()) ? secret : DEFAULT_HMAC_SECRET;
            Mac mac = Mac.getInstance(HMAC_ALGO);
            SecretKeySpec keySpec = new SecretKeySpec(keyToUse.getBytes(StandardCharsets.UTF_8), HMAC_ALGO);
            mac.init(keySpec);
            String data = (bookingRef != null ? bookingRef : "") + ":" + (ticketCode != null ? ticketCode : "");
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : rawHmac) {
                hex.append(String.format("%02x", b));
            }
            return hex.substring(0, 16);
        } catch (Exception e) {
            return "SIGERR";
        }
    }

    /**
     * Process scanned QR code or manually entered reference/ticket code with advanced security,
     * pass-out (re-entry), gate-zone restriction, velocity anti-fraud, and partial group check-in support.
     */
    @Transactional
    public CheckInResponse scanAndCheckIn(CheckInScanRequest request, UUID staffUserId, String staffName) {
        String rawData = request.getQrData() != null ? request.getQrData().trim() : "";
        String scanMode = request.getScanMode() != null ? request.getScanMode().toUpperCase() : "CHECK_IN";
        boolean isCheckOut = "CHECK_OUT".equals(scanMode) || "PASS_OUT".equals(scanMode);
        String gateName = request.getGateName() != null && !request.getGateName().isBlank() ? request.getGateName().trim() : "Gate";

        log.info("Processing scan [mode={}]: '{}', gate={}, staff={}", scanMode, rawData, gateName, staffName);

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

        // 2. Event & Schedule Matching Check
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

        // 3. Cryptographic Signature Verification (Anti-Counterfeiting)
        Boolean signatureValid = null;
        if (target.signature != null && !target.signature.isBlank()) {
            String expectedSig = computeHmacSignature(
                    target.ticketCode != null ? target.ticketCode : (specificSeat != null ? specificSeat.getTicketCode() : ""),
                    booking.getBookingReference(),
                    null
            );
            if (!target.signature.equalsIgnoreCase(expectedSig)) {
                return CheckInResponse.builder()
                        .valid(false)
                        .signatureValid(false)
                        .statusType("FORGED_SIGNATURE")
                        .bookingId(booking.getBookingId())
                        .bookingReference(booking.getBookingReference())
                        .customerName(resolveCustomerName(booking))
                        .message("SECURITY ALERT: Invalid cryptographic QR signature! Potential counterfeit or tampered ticket.")
                        .build();
            }
            signatureValid = true;
        }

        // 4. Gate / Zone Access Restriction Check
        if (request.getAllowedZone() != null && !request.getAllowedZone().isBlank() && !"ALL".equalsIgnoreCase(request.getAllowedZone())) {
            String allowed = request.getAllowedZone().trim().toLowerCase();
            if (specificSeat != null) {
                String seatZone = (specificSeat.getVenueSeatId() != null ? specificSeat.getVenueSeatId() : "").toLowerCase();
                String isShared = Boolean.TRUE.equals(specificSeat.getIsSharedAreaTicket()) ? "shared standing" : "seated";
                if (!seatZone.contains(allowed) && !isShared.contains(allowed)) {
                    return CheckInResponse.builder()
                            .valid(false)
                            .statusType("WRONG_GATE")
                            .bookingId(booking.getBookingId())
                            .bookingReference(booking.getBookingReference())
                            .customerName(resolveCustomerName(booking))
                            .message("Wrong Gate / Entrance: This ticket belongs to " + (specificSeat.getVenueSeatId() != null ? specificSeat.getVenueSeatId() : "another section") + ". Gate assigned: " + request.getAllowedZone())
                            .build();
                }
            }
        }

        LocalDateTime now = LocalDateTime.now();

        // 5. PASS-OUT (CHECK-OUT) MODE
        if (isCheckOut) {
            List<BookingSeat> seatsToPassOut = new ArrayList<>();
            if (specificSeat != null) {
                if (!Boolean.TRUE.equals(specificSeat.getCheckedIn())) {
                    return CheckInResponse.builder()
                            .valid(false)
                            .statusType("NOT_CHECKED_IN")
                            .message("Cannot record pass-out: Ticket has not been checked in yet.")
                            .bookingReference(booking.getBookingReference())
                            .customerName(resolveCustomerName(booking))
                            .build();
                }
                specificSeat.setExitedAt(now);
                specificSeat.setLastScanGate(gateName);
                seatsToPassOut.add(specificSeat);
                bookingSeatRepository.save(specificSeat);
            } else {
                for (BookingSeat bs : booking.getBookingSeats()) {
                    if (Boolean.TRUE.equals(bs.getCheckedIn())) {
                        bs.setExitedAt(now);
                        bs.setLastScanGate(gateName);
                        seatsToPassOut.add(bs);
                    }
                }
                if (seatsToPassOut.isEmpty()) {
                    return CheckInResponse.builder()
                            .valid(false)
                            .statusType("NOT_CHECKED_IN")
                            .message("Cannot record pass-out: None of the tickets in this booking are currently inside.")
                            .bookingReference(booking.getBookingReference())
                            .customerName(resolveCustomerName(booking))
                            .build();
                }
                bookingSeatRepository.saveAll(seatsToPassOut);
            }

            return CheckInResponse.builder()
                    .valid(true)
                    .isPassOut(true)
                    .statusType("CHECKED_OUT")
                    .exitedAt(now)
                    .lastScanGate(gateName)
                    .bookingId(booking.getBookingId())
                    .bookingReference(booking.getBookingReference())
                    .customerName(resolveCustomerName(booking))
                    .message("Pass-out recorded successfully! Guest is authorized for re-entry.")
                    .totalTickets(booking.getBookingSeats().size())
                    .checkedInTickets((int) booking.getBookingSeats().stream().filter(bs -> Boolean.TRUE.equals(bs.getCheckedIn())).count())
                    .allTickets(mapBookingSeatsToDetails(booking.getBookingSeats()))
                    .build();
        }

        // 6. GROUP / PARTIAL CHECK-IN SELECTION CHECK
        // If master booking code was scanned, contains multiple seats, checkInAll is false, and no explicit selection was passed:
        if (specificSeat == null && booking.getBookingSeats().size() > 1 && Boolean.FALSE.equals(request.getCheckInAll()) && (request.getSelectedTicketCodes() == null || request.getSelectedTicketCodes().isEmpty())) {
            List<CheckInTicketDetail> allDetails = mapBookingSeatsToDetails(booking.getBookingSeats());
            return CheckInResponse.builder()
                    .valid(true)
                    .requiresGuestSelection(true)
                    .statusType("SELECTION_REQUIRED")
                    .bookingId(booking.getBookingId())
                    .bookingReference(booking.getBookingReference())
                    .customerName(resolveCustomerName(booking))
                    .totalTickets(booking.getBookingSeats().size())
                    .checkedInTickets((int) booking.getBookingSeats().stream().filter(bs -> Boolean.TRUE.equals(bs.getCheckedIn())).count())
                    .allTickets(allDetails)
                    .message("Group booking detected (" + booking.getBookingSeats().size() + " guests). Select guests who have arrived to check in.")
                    .build();
        }

        // 7. ENTRY (CHECK-IN) MODE
        boolean alreadyCheckedIn = false;
        boolean isReEntryApproved = false;
        boolean isClonedSuspect = false;
        Long secondsSinceLastScan = null;
        String prevScanGate = null;

        List<String> newlyCheckedInSeats = new ArrayList<>();
        List<String> newlyCheckedInTicketCodes = new ArrayList<>();
        List<Integer> newlyCheckedInSharedAreas = new ArrayList<>();

        if (specificSeat != null) {
            // Specific seat/ticket evaluation
            if (Boolean.TRUE.equals(specificSeat.getCheckedIn())) {
                // Check if they exited earlier -> RE-ENTRY APPROVED
                if (specificSeat.getExitedAt() != null) {
                    isReEntryApproved = true;
                    specificSeat.setExitedAt(null);
                    int currentEntries = specificSeat.getEntryCount() != null ? specificSeat.getEntryCount() : 1;
                    specificSeat.setEntryCount(currentEntries + 1);
                    specificSeat.setCheckedInAt(now);
                    specificSeat.setLastScanGate(gateName);
                    bookingSeatRepository.save(specificSeat);
                } else {
                    // Duplicate scan / Cloned check
                    alreadyCheckedIn = true;
                    if (specificSeat.getCheckedInAt() != null) {
                        secondsSinceLastScan = ChronoUnit.SECONDS.between(specificSeat.getCheckedInAt(), now);
                    }
                    prevScanGate = specificSeat.getLastScanGate();
                    if (secondsSinceLastScan != null && secondsSinceLastScan <= 90) {
                        isClonedSuspect = true;
                    }
                }
            } else {
                specificSeat.setCheckedIn(true);
                specificSeat.setCheckedInAt(now);
                specificSeat.setCheckedInBy(staffUserId);
                specificSeat.setLastScanGate(gateName);
                specificSeat.setEntryCount(1);
                bookingSeatRepository.save(specificSeat);

                if (specificSeat.getVenueSeatId() != null) newlyCheckedInSeats.add(specificSeat.getVenueSeatId());
                if (specificSeat.getTicketCode() != null) newlyCheckedInTicketCodes.add(specificSeat.getTicketCode());
                if (Boolean.TRUE.equals(specificSeat.getIsSharedAreaTicket()) && specificSeat.getSharedAreaNumber() != null) {
                    newlyCheckedInSharedAreas.add(specificSeat.getSharedAreaNumber());
                }
            }
        } else {
            // Master booking reference: check in all or selected remaining seats
            List<String> selectedCodes = request.getSelectedTicketCodes();
            boolean anyProcessed = false;

            for (BookingSeat bs : booking.getBookingSeats()) {
                if (selectedCodes != null && !selectedCodes.isEmpty() && !selectedCodes.contains(bs.getTicketCode())) {
                    continue; // Skip seats not selected for partial check-in
                }

                if (!Boolean.TRUE.equals(bs.getCheckedIn())) {
                    anyProcessed = true;
                    bs.setCheckedIn(true);
                    bs.setCheckedInAt(now);
                    bs.setCheckedInBy(staffUserId);
                    bs.setLastScanGate(gateName);
                    bs.setEntryCount(1);

                    if (bs.getVenueSeatId() != null) newlyCheckedInSeats.add(bs.getVenueSeatId());
                    if (bs.getTicketCode() != null) newlyCheckedInTicketCodes.add(bs.getTicketCode());
                    if (Boolean.TRUE.equals(bs.getIsSharedAreaTicket()) && bs.getSharedAreaNumber() != null) {
                        newlyCheckedInSharedAreas.add(bs.getSharedAreaNumber());
                    }
                } else if (bs.getExitedAt() != null) {
                    // Re-entry for this seat
                    anyProcessed = true;
                    isReEntryApproved = true;
                    bs.setExitedAt(null);
                    bs.setEntryCount((bs.getEntryCount() != null ? bs.getEntryCount() : 1) + 1);
                    bs.setCheckedInAt(now);
                    bs.setLastScanGate(gateName);
                }
            }

            if (!anyProcessed) {
                alreadyCheckedIn = true;
            } else {
                bookingSeatRepository.saveAll(booking.getBookingSeats());
            }
        }

        // Mark booking attended
        booking.setAttended(true);
        bookingRepository.save(booking);

        int totalTickets = booking.getBookingSeats().size();
        long checkedInCount = booking.getBookingSeats().stream().filter(bs -> Boolean.TRUE.equals(bs.getCheckedIn())).count();

        // Broadcast WebSocket check-in event
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

        if (isReEntryApproved) {
            statusType = "RE_ENTRY_APPROVED";
            message = "Re-entry approved! Welcome back, " + resolveCustomerName(booking) + " (Pass-out verified)";
        } else if (isClonedSuspect) {
            statusType = "CLONED_SUSPECT";
            message = "FRAUD ALERT: Ticket was already scanned " + (secondsSinceLastScan != null ? secondsSinceLastScan + "s" : "") 
                    + " ago at " + (prevScanGate != null ? prevScanGate : "another gate") + "! Inspect physical pass.";
        } else if (alreadyCheckedIn) {
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
                .valid(!isClonedSuspect && !alreadyCheckedIn)
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
                .lastScanGate(gateName)
                .secondsSinceLastScan(secondsSinceLastScan)
                .signatureValid(signatureValid)
                .allTickets(allDetails)
                .seatedTickets(seatedDetails)
                .sharedAreaTickets(sharedDetails)
                .build();
    }

    /**
     * Bulk sync scans performed while gate scanner was offline.
     */
    @Transactional
    public OfflineSyncResponse syncOfflineScans(OfflineSyncRequest request, UUID staffUserId, String staffName) {
        if (request == null || request.getScans() == null || request.getScans().isEmpty()) {
            return OfflineSyncResponse.builder()
                    .totalSubmitted(0)
                    .successfullySynced(0)
                    .duplicatesSkipped(0)
                    .errorsCount(0)
                    .message("No offline scans provided for synchronization.")
                    .results(new ArrayList<>())
                    .build();
        }

        int success = 0;
        int duplicates = 0;
        int errors = 0;
        List<CheckInResponse> results = new ArrayList<>();

        for (OfflineSyncRequest.OfflineScanItem item : request.getScans()) {
            try {
                CheckInScanRequest scanReq = CheckInScanRequest.builder()
                        .qrData(item.getQrData() != null ? item.getQrData() : item.getTicketCode())
                        .ticketCode(item.getTicketCode())
                        .eventScheduleId(request.getEventScheduleId())
                        .eventId(request.getEventId())
                        .gateName(request.getGateName())
                        .scanMode(item.getScanMode() != null ? item.getScanMode() : "CHECK_IN")
                        .offlineTimestamp(item.getOfflineTimestamp())
                        .checkInAll(true)
                        .build();

                CheckInResponse res = scanAndCheckIn(scanReq, staffUserId, staffName);
                results.add(res);

                if (res.isValid()) {
                    if (res.isAlreadyCheckedIn()) {
                        duplicates++;
                    } else {
                        success++;
                    }
                } else {
                    if ("ALREADY_CHECKED_IN".equals(res.getStatusType()) || "CLONED_SUSPECT".equals(res.getStatusType())) {
                        duplicates++;
                    } else {
                        errors++;
                    }
                }
            } catch (Exception e) {
                log.error("Error syncing offline scan item: {}", e.getMessage());
                errors++;
            }
        }

        String msg = String.format("Offline sync completed: %d synced, %d duplicate/re-entries, %d errors out of %d scans.",
                success, duplicates, errors, request.getScans().size());

        return OfflineSyncResponse.builder()
                .totalSubmitted(request.getScans().size())
                .successfullySynced(success)
                .duplicatesSkipped(duplicates)
                .errorsCount(errors)
                .message(msg)
                .results(results)
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
        if (checkIn) {
            seat.setExitedAt(null);
            seat.setEntryCount((seat.getEntryCount() != null ? seat.getEntryCount() : 0) + 1);
        }
        bookingSeatRepository.save(seat);

        // Update booking attended status
        boolean anyAttended = booking.getBookingSeats().stream().anyMatch(bs -> Boolean.TRUE.equals(bs.getCheckedIn()));
        booking.setAttended(anyAttended);
        bookingRepository.save(booking);

        // Broadcast WS update
        if (booking.getEvent() != null && booking.getEventSchedule() != null) {
            UUID eventId = booking.getEvent().getEventId();
            UUID scheduleId = booking.getEventSchedule().getScheduleId();
            Long totalScheduleBooked = bookingSeatRepository.countBookedSeatsForSchedule(scheduleId);
            Long totalScheduleCheckedIn = bookingSeatRepository.countCheckedInSeatsForSchedule(scheduleId);

            SeatWebSocketService.CheckInEventMessage wsMsg = new SeatWebSocketService.CheckInEventMessage(
                    eventId,
                    scheduleId,
                    booking.getBookingReference(),
                    resolveCustomerName(booking),
                    seat.getTicketCode() != null ? List.of(seat.getTicketCode()) : new ArrayList<>(),
                    seat.getVenueSeatId() != null ? List.of(seat.getVenueSeatId()) : new ArrayList<>(),
                    seat.getSharedAreaNumber() != null ? List.of(seat.getSharedAreaNumber()) : new ArrayList<>(),
                    (int) booking.getBookingSeats().stream().filter(bs -> Boolean.TRUE.equals(bs.getCheckedIn())).count(),
                    booking.getBookingSeats().size(),
                    totalScheduleBooked != null ? totalScheduleBooked : 0L,
                    totalScheduleCheckedIn != null ? totalScheduleCheckedIn : 0L,
                    checkIn ? "CHECKED_IN" : "CHECK_IN_REVERSED"
            );

            seatWebSocketService.notifyCheckIn(eventId, scheduleId, wsMsg);
        }

        return CheckInResponse.builder()
                .valid(true)
                .statusType(checkIn ? "SUCCESS" : "REVERSED")
                .message("Seat check-in status updated to: " + (checkIn ? "Checked In" : "Unchecked"))
                .bookingReference(booking.getBookingReference())
                .customerName(resolveCustomerName(booking))
                .allTickets(mapBookingSeatsToDetails(booking.getBookingSeats()))
                .build();
    }

    /**
     * Get live stats for a specific schedule.
     */
    @Transactional(readOnly = true)
    public CheckInStatsResponse getScheduleCheckInStats(UUID scheduleId) {
        EventSchedule schedule = eventScheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found with ID: " + scheduleId));

        Event event = schedule.getEvent();
        List<BookingSeat> allScheduleSeats = bookingSeatRepository.findByBooking_EventSchedule_ScheduleIdAndBooking_Status(
                scheduleId, BookingStatus.CONFIRMED);

        long seatedBooked = allScheduleSeats.stream().filter(bs -> !Boolean.TRUE.equals(bs.getIsSharedAreaTicket())).count();
        long seatedCheckedIn = allScheduleSeats.stream().filter(bs -> !Boolean.TRUE.equals(bs.getIsSharedAreaTicket()) && Boolean.TRUE.equals(bs.getCheckedIn())).count();
        long sharedBooked = allScheduleSeats.stream().filter(bs -> Boolean.TRUE.equals(bs.getIsSharedAreaTicket())).count();
        long sharedCheckedIn = allScheduleSeats.stream().filter(bs -> Boolean.TRUE.equals(bs.getIsSharedAreaTicket()) && Boolean.TRUE.equals(bs.getCheckedIn())).count();

        long totalBooked = seatedBooked + sharedBooked;
        long totalCheckedIn = seatedCheckedIn + sharedCheckedIn;
        long pending = Math.max(0, totalBooked - totalCheckedIn);
        double checkInPct = totalBooked > 0 ? ((double) totalCheckedIn / totalBooked) * 100.0 : 0.0;

        // Breakdown per shared area
        Map<Integer, SharedAreaStats> sharedAreaBreakdown = new LinkedHashMap<>();
        if (event != null && event.getTicketCategories() != null) {
            for (TicketCategory tc : event.getTicketCategories()) {
                if (Boolean.TRUE.equals(tc.getIsSharedArea()) && tc.getSharedAreaNumber() != null) {
                    int areaNum = tc.getSharedAreaNumber();
                    long aBooked = allScheduleSeats.stream()
                            .filter(bs -> Boolean.TRUE.equals(bs.getIsSharedAreaTicket()) && Integer.valueOf(areaNum).equals(bs.getSharedAreaNumber()))
                            .count();
                    long aCheckedIn = allScheduleSeats.stream()
                            .filter(bs -> Boolean.TRUE.equals(bs.getIsSharedAreaTicket()) && Integer.valueOf(areaNum).equals(bs.getSharedAreaNumber()) && Boolean.TRUE.equals(bs.getCheckedIn()))
                            .count();
                    sharedAreaBreakdown.put(areaNum, SharedAreaStats.builder()
                            .sharedAreaNumber(areaNum)
                            .categoryName(tc.getCategoryName())
                            .capacity(tc.getCapacity() != null ? tc.getCapacity().longValue() : 0L)
                            .booked(aBooked)
                            .checkedIn(aCheckedIn)
                            .pending(Math.max(0L, aBooked - aCheckedIn))
                            .build());
                }
            }
        }

        // Recent check-ins list (latest 25)
        List<RecentCheckInItem> recentItems = allScheduleSeats.stream()
                .filter(bs -> Boolean.TRUE.equals(bs.getCheckedIn()) && bs.getCheckedInAt() != null)
                .sorted((a, b) -> b.getCheckedInAt().compareTo(a.getCheckedInAt()))
                .limit(25)
                .map(bs -> {
                    String identifier = bs.getVenueSeatId() != null ? bs.getVenueSeatId() : 
                                        (Boolean.TRUE.equals(bs.getIsSharedAreaTicket()) ? "Shared Area #" + bs.getSharedAreaNumber() : "General");
                    if (bs.getVenueSeatId() != null) {
                        try {
                            Optional<VenueSeat> vs = venueSeatRepository.findById(bs.getVenueSeatId());
                            if (vs.isPresent()) {
                                identifier = vs.get().getSection() + " • Row " + vs.get().getRowLabel() + " Seat " + vs.get().getSeatNumber();
                            }
                        } catch (Exception e) {}
                    }
                    return RecentCheckInItem.builder()
                            .customerName(resolveCustomerName(bs.getBooking()))
                            .bookingReference(bs.getBooking() != null ? bs.getBooking().getBookingReference() : "")
                            .ticketCode(bs.getTicketCode() != null ? bs.getTicketCode() : "")
                            .seatIdentifier(identifier)
                            .checkedInAtTime(bs.getCheckedInAt().format(DateTimeFormatter.ofPattern("hh:mm:ss a")))
                            .isSharedArea(Boolean.TRUE.equals(bs.getIsSharedAreaTicket()))
                            .build();
                })
                .collect(Collectors.toList());

        return CheckInStatsResponse.builder()
                .scheduleId(scheduleId)
                .eventId(event != null ? event.getEventId() : null)
                .eventName(event != null ? event.getName() : "Event")
                .totalBooked(totalBooked)
                .totalCheckedIn(totalCheckedIn)
                .totalPendingArrival(pending)
                .checkInPercentage(Math.round(checkInPct * 10.0) / 10.0)
                .totalSeatedBooked(seatedBooked)
                .totalSeatedCheckedIn(seatedCheckedIn)
                .totalSharedBooked(sharedBooked)
                .totalSharedCheckedIn(sharedCheckedIn)
                .sharedAreaBreakdown(sharedAreaBreakdown)
                .recentCheckIns(recentItems)
                .build();
    }

    /**
     * Get attendee roster for search and manual check-in.
     */
    @Transactional(readOnly = true)
    public List<CheckInAttendeeDTO> getScheduleAttendees(UUID scheduleId, String search, Boolean checkedInOnly) {
        List<BookingSeat> seats = bookingSeatRepository.findByBooking_EventSchedule_ScheduleIdAndBooking_Status(
                scheduleId, BookingStatus.CONFIRMED);

        return seats.stream()
                .filter(bs -> {
                    if (checkedInOnly != null) {
                        if (checkedInOnly && !Boolean.TRUE.equals(bs.getCheckedIn())) return false;
                        if (!checkedInOnly && Boolean.TRUE.equals(bs.getCheckedIn())) return false;
                    }
                    if (search != null && !search.isBlank()) {
                        String q = search.trim().toLowerCase();
                        Booking b = bs.getBooking();
                        String name = resolveCustomerName(b).toLowerCase();
                        String ref = (b != null && b.getBookingReference() != null ? b.getBookingReference() : "").toLowerCase();
                        String code = (bs.getTicketCode() != null ? bs.getTicketCode() : "").toLowerCase();
                        String seat = (bs.getVenueSeatId() != null ? bs.getVenueSeatId() : "").toLowerCase();
                        String email = (b != null && b.getCustomerEmail() != null ? b.getCustomerEmail() : "").toLowerCase();
                        String phone = (b != null && b.getCustomerPhone() != null ? b.getCustomerPhone() : "").toLowerCase();
                        return name.contains(q) || ref.contains(q) || code.contains(q) || seat.contains(q) || email.contains(q) || phone.contains(q);
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
                            .exitedAt(bs.getExitedAt())
                            .entryCount(bs.getEntryCount() != null ? bs.getEntryCount() : (Boolean.TRUE.equals(bs.getCheckedIn()) ? 1 : 0))
                            .lastScanGate(bs.getLastScanGate())
                            .build();
                })
                .collect(Collectors.toList());
    }

    // ── Helper Methods ────────────────────────────────────────────────────────

    private ParsedScanTarget parseScanPayload(String rawData, String explicitTicketCode) {
        if (explicitTicketCode != null && !explicitTicketCode.isBlank()) {
            return new ParsedScanTarget(null, explicitTicketCode.trim().toUpperCase(), null);
        }

        // Try JSON parsing
        if (rawData.startsWith("{") && rawData.endsWith("}")) {
            try {
                JsonNode node = objectMapper.readTree(rawData);
                String ref = node.has("ref") ? node.get("ref").asText() : null;
                String ticket = node.has("ticket") ? node.get("ticket").asText() : null;
                if (ticket == null && node.has("ticketCode")) ticket = node.get("ticketCode").asText();
                String sig = node.has("sig") ? node.get("sig").asText() : null;
                return new ParsedScanTarget(ref, ticket, sig);
            } catch (Exception e) {
                log.debug("Failed to parse JSON QR data: {}", e.getMessage());
            }
        }

        // Try Regex match for REF: BK-...
        Matcher refMatcher = REF_PATTERN.matcher(rawData);
        if (refMatcher.find()) {
            return new ParsedScanTarget(refMatcher.group(1).toUpperCase(), null, null);
        }

        // Try Ticket code TK-...
        Matcher tkMatcher = TK_PATTERN.matcher(rawData);
        if (tkMatcher.find()) {
            return new ParsedScanTarget(null, tkMatcher.group().toUpperCase(), null);
        }

        // Try raw Booking ref BK-...
        Matcher bkMatcher = BK_PATTERN.matcher(rawData);
        if (bkMatcher.find()) {
            return new ParsedScanTarget(bkMatcher.group().toUpperCase(), null, null);
        }

        return new ParsedScanTarget(rawData.toUpperCase(), null, null);
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
                    .exitedAt(bs.getExitedAt())
                    .entryCount(bs.getEntryCount() != null ? bs.getEntryCount() : (Boolean.TRUE.equals(bs.getCheckedIn()) ? 1 : 0))
                    .lastScanGate(bs.getLastScanGate())
                    .build();
        }).collect(Collectors.toList());
    }

    private static class ParsedScanTarget {
        final String bookingReference;
        final String ticketCode;
        final String signature;

        ParsedScanTarget(String bookingReference, String ticketCode, String signature) {
            this.bookingReference = bookingReference;
            this.ticketCode = ticketCode;
            this.signature = signature;
        }
    }
}
