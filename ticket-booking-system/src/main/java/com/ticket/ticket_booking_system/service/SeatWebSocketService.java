package com.ticket.ticket_booking_system.service;

import java.util.UUID;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.ticket.ticket_booking_system.entity.Seat;

/**
 * Service for sending real-time seat updates via WebSocket
 */
@Service
public class SeatWebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    public SeatWebSocketService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Notify all users about a seat status change for a specific event
     */
    public void notifySeatUpdate(UUID eventId, Seat seat, String action) {
        SeatUpdateMessage message = new SeatUpdateMessage(
                seat.getSeatId(),
                seat.getSection(),
                seat.getRowNumber(),
                seat.getSeatNumber(),
                seat.getIsAvailable(),
                seat.getIsBlocked(),
                seat.isHeld(),
                action,
                System.currentTimeMillis());

        // Send to all subscribers of this event's seat updates
        messagingTemplate.convertAndSend("/topic/events/" + eventId + "/seats", message);
    }

    /**
     * Notify specific user about their seat hold status
     */
    public void notifyUserSeatHold(UUID userId, UUID eventId, SeatHoldNotification notification) {
        messagingTemplate.convertAndSendToUser(
                userId.toString(),
                "/queue/seat-holds",
                notification);
    }

    /**
     * Notify about seat availability statistics change
     */
    public void notifyAvailabilityStatsUpdate(UUID eventId, SeatAvailabilityStatsMessage stats) {
        messagingTemplate.convertAndSend("/topic/events/" + eventId + "/stats", stats);
    }

    /**
     * Notify about a check-in event in real time
     */
    public void notifyCheckIn(UUID eventId, UUID scheduleId, CheckInEventMessage message) {
        if (eventId != null) {
            messagingTemplate.convertAndSend("/topic/events/" + eventId + "/checkin", message);
        }
        if (scheduleId != null) {
            messagingTemplate.convertAndSend("/topic/schedules/" + scheduleId + "/checkin", message);
        }
    }

    /**
     * Real-time Check-In Event Message
     */
    public static class CheckInEventMessage {
        private UUID eventId;
        private UUID scheduleId;
        private String bookingReference;
        private String customerName;
        private java.util.List<String> ticketCodes;
        private java.util.List<String> venueSeatIds;
        private java.util.List<Integer> sharedAreaNumbers;
        private int checkedInTickets;
        private int totalTicketsInBooking;
        private long totalScheduleBooked;
        private long totalScheduleCheckedIn;
        private String action; // "CHECKED_IN", "UNCHECKED"
        private long timestamp;

        public CheckInEventMessage() {
        }

        public CheckInEventMessage(UUID eventId, UUID scheduleId, String bookingReference, String customerName,
                java.util.List<String> ticketCodes, java.util.List<String> venueSeatIds,
                java.util.List<Integer> sharedAreaNumbers, int checkedInTickets, int totalTicketsInBooking,
                long totalScheduleBooked, long totalScheduleCheckedIn, String action) {
            this.eventId = eventId;
            this.scheduleId = scheduleId;
            this.bookingReference = bookingReference;
            this.customerName = customerName;
            this.ticketCodes = ticketCodes;
            this.venueSeatIds = venueSeatIds;
            this.sharedAreaNumbers = sharedAreaNumbers;
            this.checkedInTickets = checkedInTickets;
            this.totalTicketsInBooking = totalTicketsInBooking;
            this.totalScheduleBooked = totalScheduleBooked;
            this.totalScheduleCheckedIn = totalScheduleCheckedIn;
            this.action = action;
            this.timestamp = System.currentTimeMillis();
        }

        public UUID getEventId() { return eventId; }
        public void setEventId(UUID eventId) { this.eventId = eventId; }

        public UUID getScheduleId() { return scheduleId; }
        public void setScheduleId(UUID scheduleId) { this.scheduleId = scheduleId; }

        public String getBookingReference() { return bookingReference; }
        public void setBookingReference(String bookingReference) { this.bookingReference = bookingReference; }

        public String getCustomerName() { return customerName; }
        public void setCustomerName(String customerName) { this.customerName = customerName; }

        public java.util.List<String> getTicketCodes() { return ticketCodes; }
        public void setTicketCodes(java.util.List<String> ticketCodes) { this.ticketCodes = ticketCodes; }

        public java.util.List<String> getVenueSeatIds() { return venueSeatIds; }
        public void setVenueSeatIds(java.util.List<String> venueSeatIds) { this.venueSeatIds = venueSeatIds; }

        public java.util.List<Integer> getSharedAreaNumbers() { return sharedAreaNumbers; }
        public void setSharedAreaNumbers(java.util.List<Integer> sharedAreaNumbers) { this.sharedAreaNumbers = sharedAreaNumbers; }

        public int getCheckedInTickets() { return checkedInTickets; }
        public void setCheckedInTickets(int checkedInTickets) { this.checkedInTickets = checkedInTickets; }

        public int getTotalTicketsInBooking() { return totalTicketsInBooking; }
        public void setTotalTicketsInBooking(int totalTicketsInBooking) { this.totalTicketsInBooking = totalTicketsInBooking; }

        public long getTotalScheduleBooked() { return totalScheduleBooked; }
        public void setTotalScheduleBooked(long totalScheduleBooked) { this.totalScheduleBooked = totalScheduleBooked; }

        public long getTotalScheduleCheckedIn() { return totalScheduleCheckedIn; }
        public void setTotalScheduleCheckedIn(long totalScheduleCheckedIn) { this.totalScheduleCheckedIn = totalScheduleCheckedIn; }

        public String getAction() { return action; }
        public void setAction(String action) { this.action = action; }

        public long getTimestamp() { return timestamp; }
        public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
    }

    /**
     * Message class for seat updates
     */
    public static class SeatUpdateMessage {
        private UUID seatId;
        private String section;
        private String rowNumber;
        private String seatNumber;
        private Boolean isAvailable;
        private Boolean isBlocked;
        private Boolean isHeld;
        private String action; // "RESERVED", "UNBLOCKED", "HELD", "RESERVED", "RELEASED"
        private long timestamp;

        public SeatUpdateMessage() {
        }

        public SeatUpdateMessage(UUID seatId, String section, String rowNumber, String seatNumber,
                Boolean isAvailable, Boolean isBlocked, Boolean isHeld, String action, long timestamp) {
            this.seatId = seatId;
            this.section = section;
            this.rowNumber = rowNumber;
            this.seatNumber = seatNumber;
            this.isAvailable = isAvailable;
            this.isBlocked = isBlocked;
            this.isHeld = isHeld;
            this.action = action;
            this.timestamp = timestamp;
        }

        // Getters and setters
        public UUID getSeatId() {
            return seatId;
        }

        public void setSeatId(UUID seatId) {
            this.seatId = seatId;
        }

        public String getSection() {
            return section;
        }

        public void setSection(String section) {
            this.section = section;
        }

        public String getRowNumber() {
            return rowNumber;
        }

        public void setRowNumber(String rowNumber) {
            this.rowNumber = rowNumber;
        }

        public String getSeatNumber() {
            return seatNumber;
        }

        public void setSeatNumber(String seatNumber) {
            this.seatNumber = seatNumber;
        }

        public Boolean getIsAvailable() {
            return isAvailable;
        }

        public void setIsAvailable(Boolean isAvailable) {
            this.isAvailable = isAvailable;
        }

        public Boolean getIsBlocked() {
            return isBlocked;
        }

        public void setIsBlocked(Boolean isBlocked) {
            this.isBlocked = isBlocked;
        }

        public Boolean getIsHeld() {
            return isHeld;
        }

        public void setIsHeld(Boolean isHeld) {
            this.isHeld = isHeld;
        }

        public String getAction() {
            return action;
        }

        public void setAction(String action) {
            this.action = action;
        }

        public long getTimestamp() {
            return timestamp;
        }

        public void setTimestamp(long timestamp) {
            this.timestamp = timestamp;
        }
    }

    /**
     * Message class for seat hold notifications to specific users
     */
    public static class SeatHoldNotification {
        private UUID eventId;
        private String message;
        private String type; // "HOLD_CONFIRMED", "HOLD_EXPIRED", "HOLD_RELEASED"
        private long expiresAt;

        public SeatHoldNotification() {
        }

        public SeatHoldNotification(UUID eventId, String message, String type, long expiresAt) {
            this.eventId = eventId;
            this.message = message;
            this.type = type;
            this.expiresAt = expiresAt;
        }

        // Getters and setters
        public UUID getEventId() {
            return eventId;
        }

        public void setEventId(UUID eventId) {
            this.eventId = eventId;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public long getExpiresAt() {
            return expiresAt;
        }

        public void setExpiresAt(long expiresAt) {
            this.expiresAt = expiresAt;
        }
    }

    /**
     * Message class for seat availability statistics
     */
    public static class SeatAvailabilityStatsMessage {
        private long totalSeats;
        private long availableSeats;
        private long bookedSeats;
        private long heldSeats;
        private long blockedSeats;
        private long timestamp;

        public SeatAvailabilityStatsMessage() {
        }

        public SeatAvailabilityStatsMessage(long totalSeats, long availableSeats, long bookedSeats,
                long heldSeats, long blockedSeats) {
            this.totalSeats = totalSeats;
            this.availableSeats = availableSeats;
            this.bookedSeats = bookedSeats;
            this.heldSeats = heldSeats;
            this.blockedSeats = blockedSeats;
            this.timestamp = System.currentTimeMillis();
        }

        // Getters and setters
        public long getTotalSeats() {
            return totalSeats;
        }

        public void setTotalSeats(long totalSeats) {
            this.totalSeats = totalSeats;
        }

        public long getAvailableSeats() {
            return availableSeats;
        }

        public void setAvailableSeats(long availableSeats) {
            this.availableSeats = availableSeats;
        }

        public long getBookedSeats() {
            return bookedSeats;
        }

        public void setBookedSeats(long bookedSeats) {
            this.bookedSeats = bookedSeats;
        }

        public long getHeldSeats() {
            return heldSeats;
        }

        public void setHeldSeats(long heldSeats) {
            this.heldSeats = heldSeats;
        }

        public long getBlockedSeats() {
            return blockedSeats;
        }

        public void setBlockedSeats(long blockedSeats) {
            this.blockedSeats = blockedSeats;
        }

        public long getTimestamp() {
            return timestamp;
        }

        public void setTimestamp(long timestamp) {
            this.timestamp = timestamp;
        }
    }
}