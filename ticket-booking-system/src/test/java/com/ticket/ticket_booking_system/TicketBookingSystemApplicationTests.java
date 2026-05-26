package com.ticket.ticket_booking_system;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import com.ticket.ticket_booking_system.repository.SystemAuditLogRepository;
import com.ticket.ticket_booking_system.entity.SystemAuditLog;
import org.springframework.data.domain.Page;

@SpringBootTest
class TicketBookingSystemApplicationTests {

	@Autowired
	private SystemAuditLogRepository repo;

	@Test
	void contextLoads() {
	}

	@Test
	void testFilters() {
		try {
			System.out.println("=== STARTING AUDIT FILTERS TEST ===");
			Page<SystemAuditLog> page1 = repo.findByFilters(null, null, PageRequest.of(0, 10));
			System.out.println("No filter count: " + page1.getTotalElements());

			Page<SystemAuditLog> page2 = repo.findByFilters("USER", null, PageRequest.of(0, 10));
			System.out.println("USER filter count: " + page2.getTotalElements());

			Page<SystemAuditLog> page3 = repo.findByFilters(null, "LOGIN", PageRequest.of(0, 10));
			System.out.println("LOGIN action filter count: " + page3.getTotalElements());
			System.out.println("=== ENDING AUDIT FILTERS TEST ===");
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

}
