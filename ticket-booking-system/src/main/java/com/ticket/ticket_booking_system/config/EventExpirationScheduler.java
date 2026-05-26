package com.ticket.ticket_booking_system.config;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.EventSchedule;
import com.ticket.ticket_booking_system.entity.TicketCategory;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.EventScheduleRepository;
import com.ticket.ticket_booking_system.repository.TicketCategoryRepository;

import lombok.RequiredArgsConstructor;

/**
 * Scheduler to automatically close/expire events and their associated deals
 * when their scheduled time has passed.
 */
@Component
@RequiredArgsConstructor
public class EventExpirationScheduler {

    private static final Logger logger = LoggerFactory.getLogger(EventExpirationScheduler.class);
    
    private final EventRepository eventRepository;
    private final EventScheduleRepository eventScheduleRepository;
    private final TicketCategoryRepository ticketCategoryRepository;

    /**
     * Check for expired events every minute.
     * Cron expression: "0 * * * * *" runs at second 0 of every minute.
     */
    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void checkExpiredEvents() {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        
        logger.debug("Running scheduled check for expired events at {} {}", today, now);
        
        try {
            // Find all PUBLISHED events whose schedules have all passed
            List<Event> expiredEvents = eventRepository.findExpiredEvents(today, now);
            
            if (expiredEvents.isEmpty()) {
                return;
            }
            
            logger.info("Found {} expired events to close", expiredEvents.size());
            
            for (Event event : expiredEvents) {
                logger.info("Expiring event: {} (ID: {})", event.getName(), event.getEventId());
                
                // 1. Mark event as COMPLETED and inactive
                event.setStatus(Event.EventStatus.COMPLETED);
                event.setActive(0);
                eventRepository.save(event);
                
                // 2. Mark event schedules as COMPLETED
                List<EventSchedule> schedules = eventScheduleRepository
                        .findByEvent_EventIdAndIsDeletedFalseOrderByScheduleDateAscStartTimeAsc(event.getEventId());
                for (EventSchedule schedule : schedules) {
                    if (schedule.getStatus() != EventSchedule.ScheduleStatus.COMPLETED) {
                        schedule.setStatus(EventSchedule.ScheduleStatus.COMPLETED);
                        eventScheduleRepository.save(schedule);
                        logger.debug("Marked schedule {} as COMPLETED", schedule.getScheduleId());
                    }
                }
                
                // 3. Close/deactivate all deals associated with this event's ticket categories
                List<TicketCategory> categories = ticketCategoryRepository.findByEventId(event.getEventId());
                int deactivatedDealsCount = 0;
                for (TicketCategory category : categories) {
                    if (Boolean.TRUE.equals(category.getDealActive())) {
                        category.setDealActive(false);
                        ticketCategoryRepository.save(category);
                        deactivatedDealsCount++;
                        logger.debug("Deactivated deal for ticket category: {} (ID: {})", 
                                category.getCategoryName(), category.getCategoryId());
                    }
                }
                
                logger.info("Successfully expired event {} and closed {} deals", event.getName(), deactivatedDealsCount);
            }
        } catch (Exception e) {
            logger.error("Error during scheduled event expiration check: {}", e.getMessage(), e);
        }
    }
}
