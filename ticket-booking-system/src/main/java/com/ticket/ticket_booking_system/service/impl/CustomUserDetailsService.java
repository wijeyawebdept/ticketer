package com.ticket.ticket_booking_system.service.impl;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final OrganizerRepository organizerRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // Check in Users table first (role=USER)
        var user = userRepository.findByEmail(username);
        if (user.isPresent()) {
            return user.get();
        }

        // Check in Admins table (role=ADMIN/SUPER_ADMIN)
        var admin = adminRepository.findByEmail(username);
        if (admin.isPresent()) {
            return admin.get();
        }

        // Check in Organizers table (role=ORGANIZER)
        var organizer = organizerRepository.findByEmail(username);
        if (organizer.isPresent()) {
            return organizer.get();
        }

        throw new UsernameNotFoundException("User not found with email: " + username);
    }
}