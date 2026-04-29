package com.ticket.ticket_booking_system.service.impl;

import java.io.IOException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.ticket.ticket_booking_system.dto.ProfileDTO;
import com.ticket.ticket_booking_system.dto.ProfileUpdateDTO;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.service.EmailService;
import com.ticket.ticket_booking_system.service.FileUploadService;
import com.ticket.ticket_booking_system.service.ProfileService;

@Service
public class ProfileServiceImpl implements ProfileService {

    // In-memory OTP store: email -> [otp, expiryTime]
    private final Map<String, String[]> otpStore = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();

    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final OrganizerRepository organizerRepository;
    private final OrganizerEmployeeRepository employeeRepository;
    private final FileUploadService fileUploadService;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public ProfileServiceImpl(UserRepository userRepository, AdminRepository adminRepository,
            OrganizerRepository organizerRepository, OrganizerEmployeeRepository employeeRepository,
            FileUploadService fileUploadService, PasswordEncoder passwordEncoder,
            EmailService emailService) {
        this.userRepository = userRepository;
        this.adminRepository = adminRepository;
        this.organizerRepository = organizerRepository;
        this.employeeRepository = employeeRepository;
        this.fileUploadService = fileUploadService;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    @Override
    public ProfileDTO getProfileByEmail(String email) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        boolean isOrganizer = auth != null
                && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ORGANIZER"));
        boolean isEmployee = auth != null
                && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ORGANIZER_EMPLOYEE"));

        if (isAdmin) {
            Admin admin = adminRepository.findByEmail(email).orElse(null);
            if (admin != null)
                return convertAdminToProfileDTO(admin);
        }
        if (isOrganizer) {
            Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
            if (organizer != null)
                return convertOrganizerToProfileDTO(organizer);
        }
        if (isEmployee) {
            OrganizerEmployee employee = employeeRepository.findByEmail(email).orElse(null);
            if (employee != null)
                return convertEmployeeToProfileDTO(employee);
        }

        // Check users table first
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            return convertUserToProfileDTO(user);
        }

        // Check admins table
        Admin admin = adminRepository.findByEmail(email).orElse(null);
        if (admin != null) {
            return convertAdminToProfileDTO(admin);
        }

        // Check organizers table
        Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
        if (organizer != null) {
            return convertOrganizerToProfileDTO(organizer);
        }

        // Check organizer employees table
        OrganizerEmployee employee = employeeRepository.findByEmail(email).orElse(null);
        if (employee != null) {
            return convertEmployeeToProfileDTO(employee);
        }

        throw new ResourceNotFoundException("User", "email", email);
    }

    @Override
    public ProfileDTO updateProfile(String email, ProfileUpdateDTO profileUpdateDTO) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));

        if (isAdmin) {
            Admin admin = adminRepository.findByEmail(email).orElse(null);
            if (admin != null) {
                admin.setFirstName(profileUpdateDTO.getFirstName());
                admin.setLastName(profileUpdateDTO.getLastName());
                admin.setEmail(profileUpdateDTO.getEmail());
                admin.setPhoneNumber(profileUpdateDTO.getPhoneNumber());
                admin.setDateOfBirth(profileUpdateDTO.getDateOfBirth());
                if (profileUpdateDTO.getProfilePicture() != null) {
                    admin.setProfilePicture(profileUpdateDTO.getProfilePicture());
                }
                Admin updatedAdmin = adminRepository.save(admin);
                return convertAdminToProfileDTO(updatedAdmin);
            }
        }

        // Check users table first
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            user.setFirstName(profileUpdateDTO.getFirstName());
            user.setLastName(profileUpdateDTO.getLastName());
            user.setEmail(profileUpdateDTO.getEmail());
            user.setPhoneNumber(profileUpdateDTO.getPhoneNumber());
            user.setDateOfBirth(profileUpdateDTO.getDateOfBirth());
            if (profileUpdateDTO.getProfilePicture() != null) {
                user.setProfilePicture(profileUpdateDTO.getProfilePicture());
            }
            User updatedUser = userRepository.save(user);
            return convertUserToProfileDTO(updatedUser);
        }

        // Check admins table
        Admin admin = adminRepository.findByEmail(email).orElse(null);
        if (admin != null) {
            admin.setFirstName(profileUpdateDTO.getFirstName());
            admin.setLastName(profileUpdateDTO.getLastName());
            admin.setEmail(profileUpdateDTO.getEmail());
            admin.setPhoneNumber(profileUpdateDTO.getPhoneNumber());
            admin.setDateOfBirth(profileUpdateDTO.getDateOfBirth());
            if (profileUpdateDTO.getProfilePicture() != null) {
                admin.setProfilePicture(profileUpdateDTO.getProfilePicture());
            }
            Admin updatedAdmin = adminRepository.save(admin);
            return convertAdminToProfileDTO(updatedAdmin);
        }

        // Check organizers table
        Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
        if (organizer != null) {
            organizer.setFirstName(profileUpdateDTO.getFirstName());
            organizer.setLastName(profileUpdateDTO.getLastName());
            organizer.setEmail(profileUpdateDTO.getEmail());
            organizer.setPhoneNumber(profileUpdateDTO.getPhoneNumber());
            organizer.setDateOfBirth(profileUpdateDTO.getDateOfBirth());
            if (profileUpdateDTO.getProfilePicture() != null) {
                organizer.setProfilePicture(profileUpdateDTO.getProfilePicture());
            }
            // Business info
            if (profileUpdateDTO.getOrganizationName() != null)
                organizer.setOrganizationName(profileUpdateDTO.getOrganizationName());
            if (profileUpdateDTO.getBusinessRegistrationNumber() != null)
                organizer.setBusinessRegistrationNumber(profileUpdateDTO.getBusinessRegistrationNumber());
            if (profileUpdateDTO.getTaxId() != null)
                organizer.setTaxId(profileUpdateDTO.getTaxId());
            if (profileUpdateDTO.getBusinessAddress() != null)
                organizer.setBusinessAddress(profileUpdateDTO.getBusinessAddress());
            if (profileUpdateDTO.getBusinessPhone() != null)
                organizer.setBusinessPhone(profileUpdateDTO.getBusinessPhone());
            // Banking info
            if (profileUpdateDTO.getBankName() != null)
                organizer.setBankName(profileUpdateDTO.getBankName());
            if (profileUpdateDTO.getBankAccountNumber() != null)
                organizer.setBankAccountNumber(profileUpdateDTO.getBankAccountNumber());
            if (profileUpdateDTO.getBankRoutingNumber() != null)
                organizer.setBankRoutingNumber(profileUpdateDTO.getBankRoutingNumber());
            Organizer updatedOrganizer = organizerRepository.save(organizer);
            return convertOrganizerToProfileDTO(updatedOrganizer);
        }

        // Check organizer employees table
        OrganizerEmployee employee = employeeRepository.findByEmail(email).orElse(null);
        if (employee != null) {
            employee.setFirstName(profileUpdateDTO.getFirstName());
            employee.setLastName(profileUpdateDTO.getLastName());
            employee.setEmail(profileUpdateDTO.getEmail());
            employee.setPhoneNumber(profileUpdateDTO.getPhoneNumber());
            employee.setDateOfBirth(profileUpdateDTO.getDateOfBirth());
            if (profileUpdateDTO.getProfilePicture() != null) {
                employee.setProfilePicture(profileUpdateDTO.getProfilePicture());
            }
            OrganizerEmployee updatedEmployee = employeeRepository.save(employee);
            return convertEmployeeToProfileDTO(updatedEmployee);
        }

        throw new ResourceNotFoundException("User", "email", email);
    }

    @Override
    public String uploadProfilePicture(String email, MultipartFile file) throws IOException {
        // Check users table first
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            String old = user.getProfilePicture();
            if (old != null && !old.isBlank() &&
                    !(old.startsWith("http://") || old.startsWith("https://"))) {
                fileUploadService.deleteProfilePicture(old);
            }
            String profilePicturePath = fileUploadService.uploadProfilePicture(file);
            user.setProfilePicture(profilePicturePath);
            userRepository.save(user);
            return profilePicturePath;
        }

        // Check admins table
        Admin admin = adminRepository.findByEmail(email).orElse(null);
        if (admin != null) {
            String old = admin.getProfilePicture();
            if (old != null && !old.isBlank() &&
                    !(old.startsWith("http://") || old.startsWith("https://"))) {
                fileUploadService.deleteProfilePicture(old);
            }
            String profilePicturePath = fileUploadService.uploadProfilePicture(file);
            admin.setProfilePicture(profilePicturePath);
            adminRepository.save(admin);
            return profilePicturePath;
        }

        // Check organizers table
        Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
        if (organizer != null) {
            String old = organizer.getProfilePicture();
            if (old != null && !old.isBlank() &&
                    !(old.startsWith("http://") || old.startsWith("https://"))) {
                fileUploadService.deleteProfilePicture(old);
            }
            String profilePicturePath = fileUploadService.uploadProfilePicture(file);
            organizer.setProfilePicture(profilePicturePath);
            organizerRepository.save(organizer);
            return profilePicturePath;
        }

        // Check organizer employees table
        OrganizerEmployee employee = employeeRepository.findByEmail(email).orElse(null);
        if (employee != null) {
            String old = employee.getProfilePicture();
            if (old != null && !old.isBlank() &&
                    !(old.startsWith("http://") || old.startsWith("https://"))) {
                fileUploadService.deleteProfilePicture(old);
            }
            String profilePicturePath = fileUploadService.uploadProfilePicture(file);
            employee.setProfilePicture(profilePicturePath);
            employeeRepository.save(employee);
            return profilePicturePath;
        }

        throw new ResourceNotFoundException("User", "email", email);
    }

    private ProfileDTO convertUserToProfileDTO(User user) {
        return ProfileDTO.builder()
                .userId(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .dateOfBirth(user.getDateOfBirth())
                .profilePicture(user.getProfilePicture())
                .role(user.getRole().name())
                .active(user.isActive())
                .emailVerified(user.isEmailVerified())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .updatedAt(user.getUpdatedAt())
                .loginEmailEnabled(user.isLoginEmailEnabled())
                .emailNotificationsEnabled(user.isEmailNotificationsEnabled())
                .smsNotificationsEnabled(user.isSmsNotificationsEnabled())
                .marketingEmailsEnabled(user.isMarketingEmailsEnabled())
                .build();
    }

    private ProfileDTO convertAdminToProfileDTO(Admin admin) {
        return ProfileDTO.builder()
                .userId(admin.getAdminId())
                .firstName(admin.getFirstName())
                .lastName(admin.getLastName())
                .email(admin.getEmail())
                .phoneNumber(admin.getPhoneNumber())
                .dateOfBirth(admin.getDateOfBirth())
                .profilePicture(admin.getProfilePicture())
                .role(admin.getRole().name())
                .active(admin.isActive())
                .emailVerified(admin.isEmailVerified())
                .createdAt(admin.getCreatedAt())
                .lastLoginAt(admin.getLastLoginAt())
                .updatedAt(admin.getUpdatedAt())
                .build();
    }

    private ProfileDTO convertOrganizerToProfileDTO(Organizer organizer) {
        return ProfileDTO.builder()
                .userId(organizer.getOrganizerId())
                .firstName(organizer.getFirstName())
                .lastName(organizer.getLastName())
                .email(organizer.getEmail())
                .phoneNumber(organizer.getPhoneNumber())
                .dateOfBirth(organizer.getDateOfBirth())
                .profilePicture(organizer.getProfilePicture())
                .role(organizer.getRole().name())
                .active(organizer.isActive())
                .emailVerified(organizer.isEmailVerified())
                .createdAt(organizer.getCreatedAt())
                .lastLoginAt(organizer.getLastLoginAt())
                .updatedAt(organizer.getUpdatedAt())
                // Organizer-specific
                .organizationName(organizer.getOrganizationName())
                .businessRegistrationNumber(organizer.getBusinessRegistrationNumber())
                .taxId(organizer.getTaxId())
                .businessAddress(organizer.getBusinessAddress())
                .businessPhone(organizer.getBusinessPhone())
                // Banking
                .bankName(organizer.getBankName())
                .bankAccountNumber(organizer.getBankAccountNumber())
                .bankRoutingNumber(organizer.getBankRoutingNumber())
                .build();
    }

    private ProfileDTO convertEmployeeToProfileDTO(OrganizerEmployee employee) {
        return ProfileDTO.builder()
                .userId(employee.getEmployeeId())
                .firstName(employee.getFirstName())
                .lastName(employee.getLastName())
                .email(employee.getEmail())
                .phoneNumber(employee.getPhoneNumber())
                .dateOfBirth(employee.getDateOfBirth())
                .profilePicture(employee.getProfilePicture())
                .role(employee.getRole().name())
                .active(employee.isActive())
                .emailVerified(employee.isEmailVerified())
                .createdAt(employee.getCreatedAt())
                .lastLoginAt(employee.getLastLoginAt())
                .updatedAt(employee.getUpdatedAt())
                .build();
    }

    @Override
    public void changePassword(String email, String currentPassword, String newPassword) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        boolean isOrganizer = auth != null
                && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ORGANIZER"));
        boolean isEmployee = auth != null
                && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ORGANIZER_EMPLOYEE"));

        if (isAdmin) {
            Admin admin = adminRepository.findByEmail(email).orElse(null);
            if (admin != null) {
                if (!passwordEncoder.matches(currentPassword, admin.getPassword())) {
                    throw new RuntimeException("Current password is incorrect");
                }
                admin.setPassword(passwordEncoder.encode(newPassword));
                adminRepository.save(admin);
                return;
            }
        }

        if (isOrganizer) {
            Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
            if (organizer != null) {
                if (!passwordEncoder.matches(currentPassword, organizer.getPassword())) {
                    throw new RuntimeException("Current password is incorrect");
                }
                organizer.setPassword(passwordEncoder.encode(newPassword));
                organizerRepository.save(organizer);
                return;
            }
        }

        if (isEmployee) {
            OrganizerEmployee employee = employeeRepository.findByEmail(email).orElse(null);
            if (employee != null) {
                if (!passwordEncoder.matches(currentPassword, employee.getPassword())) {
                    throw new RuntimeException("Current password is incorrect");
                }
                employee.setPassword(passwordEncoder.encode(newPassword));
                employeeRepository.save(employee);
                return;
            }
        }

        // Check users table first
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
                throw new RuntimeException("Current password is incorrect");
            }
            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);
            return;
        }

        // Check admins table
        Admin admin = adminRepository.findByEmail(email).orElse(null);
        if (admin != null) {
            if (!passwordEncoder.matches(currentPassword, admin.getPassword())) {
                throw new RuntimeException("Current password is incorrect");
            }
            admin.setPassword(passwordEncoder.encode(newPassword));
            adminRepository.save(admin);
            return;
        }

        // Check organizers table
        Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
        if (organizer != null) {
            if (!passwordEncoder.matches(currentPassword, organizer.getPassword())) {
                throw new RuntimeException("Current password is incorrect");
            }
            organizer.setPassword(passwordEncoder.encode(newPassword));
            organizerRepository.save(organizer);
            return;
        }

        // Check organizer employees table
        OrganizerEmployee employee = employeeRepository.findByEmail(email).orElse(null);
        if (employee != null) {
            if (!passwordEncoder.matches(currentPassword, employee.getPassword())) {
                throw new RuntimeException("Current password is incorrect");
            }
            employee.setPassword(passwordEncoder.encode(newPassword));
            employeeRepository.save(employee);
            return;
        }

        throw new ResourceNotFoundException("User", "email", email);
    }

    @Override
    public void changeEmail(String currentEmail, String newEmail, String password) {
        // Check if new email is already in use
        if (userRepository.findByEmail(newEmail).isPresent() ||
                adminRepository.findByEmail(newEmail).isPresent() ||
                organizerRepository.findByEmail(newEmail).isPresent() ||
                employeeRepository.findByEmail(newEmail).isPresent()) {
            throw new RuntimeException("Email address is already in use");
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        boolean isOrganizer = auth != null
                && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ORGANIZER"));
        boolean isEmployee = auth != null
                && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ORGANIZER_EMPLOYEE"));

        // Prioritize update by role
        if (isAdmin) {
            Admin admin = adminRepository.findByEmail(currentEmail).orElse(null);
            if (admin != null) {
                if (!passwordEncoder.matches(password, admin.getPassword())) {
                    throw new RuntimeException("Password is incorrect");
                }
                admin.setEmail(newEmail);
                admin.setEmailVerified(false); // Require re-verification
                adminRepository.save(admin);
                return;
            }
        }

        if (isOrganizer) {
            Organizer organizer = organizerRepository.findByEmail(currentEmail).orElse(null);
            if (organizer != null) {
                if (!passwordEncoder.matches(password, organizer.getPassword())) {
                    throw new RuntimeException("Password is incorrect");
                }
                organizer.setEmail(newEmail);
                organizer.setEmailVerified(false); // Require re-verification
                organizerRepository.save(organizer);
                return;
            }
        }

        if (isEmployee) {
            OrganizerEmployee employee = employeeRepository.findByEmail(currentEmail).orElse(null);
            if (employee != null) {
                if (!passwordEncoder.matches(password, employee.getPassword())) {
                    throw new RuntimeException("Password is incorrect");
                }
                employee.setEmail(newEmail);
                employee.setEmailVerified(false); // Require re-verification
                employeeRepository.save(employee);
                return;
            }
        }

        // Check users table (default)
        User user = userRepository.findByEmail(currentEmail).orElse(null);
        if (user != null) {
            if (!passwordEncoder.matches(password, user.getPassword())) {
                throw new RuntimeException("Password is incorrect");
            }
            user.setEmail(newEmail);
            user.setEmailVerified(false); // Require re-verification
            userRepository.save(user);
            return;
        }

        // Final fallbacks
        Admin admin = adminRepository.findByEmail(currentEmail).orElse(null);
        if (admin != null) {
            if (!passwordEncoder.matches(password, admin.getPassword())) {
                throw new RuntimeException("Password is incorrect");
            }
            admin.setEmail(newEmail);
            admin.setEmailVerified(false); // Require re-verification
            adminRepository.save(admin);
            return;
        }

        Organizer organizer = organizerRepository.findByEmail(currentEmail).orElse(null);
        if (organizer != null) {
            if (!passwordEncoder.matches(password, organizer.getPassword())) {
                throw new RuntimeException("Password is incorrect");
            }
            organizer.setEmail(newEmail);
            organizer.setEmailVerified(false); // Require re-verification
            organizerRepository.save(organizer);
            return;
        }

        throw new ResourceNotFoundException("User", "email", currentEmail);
    }

    @Override
    public boolean toggleLoginEmailPreference(String email, boolean enabled) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        user.setLoginEmailEnabled(enabled);
        userRepository.save(user);
        return user.isLoginEmailEnabled();
    }

    @Override
    public void updateNotificationPreferences(String email, boolean emailNotifications, boolean smsNotifications,
            boolean marketingEmails) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        user.setEmailNotificationsEnabled(emailNotifications);
        user.setSmsNotificationsEnabled(smsNotifications);
        user.setMarketingEmailsEnabled(marketingEmails);
        userRepository.save(user);
    }
    // Email OTP Verification

    @Override
    public void sendEmailVerificationOtp(String email) {
        String firstName;
        String recipientEmail;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        boolean isOrganizer = auth != null
                && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ORGANIZER"));
        boolean isEmployee = auth != null
                && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ORGANIZER_EMPLOYEE"));

        // Prioritize by role
        if (isOrganizer) {
            Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
            if (organizer != null) {
                firstName = organizer.getFirstName();
                recipientEmail = organizer.getEmail();
            } else {
                throw new ResourceNotFoundException("Organizer", "email", email);
            }
        } else if (isEmployee) {
            OrganizerEmployee employee = employeeRepository.findByEmail(email).orElse(null);
            if (employee != null) {
                firstName = employee.getFirstName();
                recipientEmail = employee.getEmail();
            } else {
                throw new ResourceNotFoundException("Employee", "email", email);
            }
        } else if (isAdmin) {
            Admin admin = adminRepository.findByEmail(email).orElse(null);
            if (admin != null) {
                firstName = admin.getFirstName();
                recipientEmail = admin.getEmail();
            } else {
                throw new ResourceNotFoundException("Admin", "email", email);
            }
        } else {
            // Default to User
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
            firstName = user.getFirstName();
            recipientEmail = user.getEmail();
        }

        String otp = String.format("%06d", secureRandom.nextInt(1_000_000));
        String expiry = LocalDateTime.now().plusMinutes(10).toString();
        otpStore.put(email, new String[] { otp, expiry });

        emailService.sendEmailVerificationCode(recipientEmail, firstName, otp);
    }

    @Override
    public boolean verifyEmailOtp(String email, String otp) {
        String[] stored = otpStore.get(email);
        if (stored == null)
            return false;

        String storedOtp = stored[0];
        LocalDateTime expiry = LocalDateTime.parse(stored[1]);

        if (LocalDateTime.now().isAfter(expiry)) {
            otpStore.remove(email);
            return false;
        }
        if (!storedOtp.equals(otp))
            return false;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        boolean isOrganizer = auth != null
                && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ORGANIZER"));
        boolean isEmployee = auth != null
                && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ORGANIZER_EMPLOYEE"));

        boolean updated = false;

        // Prioritize update by role
        if (isOrganizer) {
            Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
            if (organizer != null) {
                organizer.setEmailVerified(true);
                organizerRepository.save(organizer);
                updated = true;
            }
        } else if (isEmployee) {
            OrganizerEmployee employee = employeeRepository.findByEmail(email).orElse(null);
            if (employee != null) {
                employee.setEmailVerified(true);
                employeeRepository.save(employee);
                updated = true;
            }
        } else if (isAdmin) {
            Admin admin = adminRepository.findByEmail(email).orElse(null);
            if (admin != null) {
                admin.setEmailVerified(true);
                adminRepository.save(admin);
                updated = true;
            }
        } else {
            User user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                user.setEmailVerified(true);
                userRepository.save(user);
                updated = true;
            }
        }

        // Fallback if role-based update didn't find the record
        if (!updated) {
            User user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                user.setEmailVerified(true);
                userRepository.save(user);
                updated = true;
            }

            if (!updated) {
                Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
                if (organizer != null) {
                    organizer.setEmailVerified(true);
                    organizerRepository.save(organizer);
                    updated = true;
                }
            }

            if (!updated) {
                OrganizerEmployee employee = employeeRepository.findByEmail(email).orElse(null);
                if (employee != null) {
                    employee.setEmailVerified(true);
                    employeeRepository.save(employee);
                    updated = true;
                }
            }

            if (!updated) {
                Admin admin = adminRepository.findByEmail(email).orElse(null);
                if (admin != null) {
                    admin.setEmailVerified(true);
                    adminRepository.save(admin);
                    updated = true;
                }
            }
        }

        otpStore.remove(email);
        return true;
    }
}
