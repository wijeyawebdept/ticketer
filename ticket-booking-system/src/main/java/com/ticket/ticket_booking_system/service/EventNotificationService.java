package com.ticket.ticket_booking_system.service;

import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service to handle batched event notifications to users.
 * This fulfills the requirement of sending notifications "time to time" 
 * rather than immediately upon every publication.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EventNotificationService {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    /**
     * Periodically check for new published events that haven't been notified yet.
     * Currently set to run every 3 days at 10:00 AM.
     * Cron format: second, minute, hour, day of month, month, day of week
     */
    @Scheduled(cron = "0 0 10 */3 * *")
    @Transactional
    public void sendNewEventNotifications() {
        log.info("EventNotificationService: Checking for new events to notify users...");

        // Fetch events that are PUBLISHED but haven't had a notification sent yet
        List<Event> pendingEvents = eventRepository.findByStatusAndNotificationSentFalse(Event.EventStatus.PUBLISHED);

        if (pendingEvents.isEmpty()) {
            log.info("EventNotificationService: No new events to notify.");
            return;
        }

        // Fetch users who have opted into email notifications and are active
        List<User> usersToNotify = userRepository.findByEmailNotificationsEnabledTrueAndActive(1);

        if (usersToNotify.isEmpty()) {
            log.info("EventNotificationService: No active users found with notifications enabled.");
            return;
        }

        log.info("EventNotificationService: Sending summary of {} new events to {} users.", 
                pendingEvents.size(), usersToNotify.size());

        // Send batched summary emails asynchronously via EmailService
        for (User user : usersToNotify) {
            emailService.sendNewEventsSummaryEmail(user.getEmail(), user.getFirstName(), pendingEvents);
        }

        // Mark these events as notified so they aren't sent in the next cycle
        for (Event event : pendingEvents) {
            event.setNotificationSent(true);
        }
        eventRepository.saveAll(pendingEvents);

        log.info("EventNotificationService: Notification cycle completed successfully.");
    }
    
    /**
     * Optional: Manual trigger for admin if needed.
     */
    public void triggerManualNotification() {
        sendNewEventNotifications();
    }
}
