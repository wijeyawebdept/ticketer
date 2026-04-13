package com.ticket.ticket_booking_system.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.ticket.ticket_booking_system.entity.CookiePolicy;
import com.ticket.ticket_booking_system.entity.FAQ;
import com.ticket.ticket_booking_system.entity.PrivacyPolicy;
import com.ticket.ticket_booking_system.entity.TermsAndConditions;
import com.ticket.ticket_booking_system.repository.CookiePolicyRepository;
import com.ticket.ticket_booking_system.repository.FAQRepository;
import com.ticket.ticket_booking_system.repository.PrivacyPolicyRepository;
import com.ticket.ticket_booking_system.repository.TermsAndConditionsRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Initializes default page content on application startup
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final PrivacyPolicyRepository privacyPolicyRepository;
    private final TermsAndConditionsRepository termsAndConditionsRepository;
    private final CookiePolicyRepository cookiePolicyRepository;
    private final FAQRepository faqRepository;

    @Override
    public void run(String... args) throws Exception {
        try {
            initializeDefaultContent();
        } catch (Exception e) {
            log.error("Error initializing default page content", e);
        }
    }

    private void initializeDefaultContent() {
        // Initialize Privacy Policy
        if (privacyPolicyRepository.findAll().isEmpty()) {
            PrivacyPolicy privacyPolicy = PrivacyPolicy.builder()
                    .title("Privacy Policy")
                    .content("<h1>Privacy Policy</h1>\n" +
                            "<p>This is the default privacy policy. Please update this content from the Admin Panel > Page Content Manager.</p>\n" +
                            "<h2>Information We Collect</h2>\n" +
                            "<p>We collect information you provide directly to us, such as when you create an account, make a booking, or contact us.</p>\n" +
                            "<h2>How We Use Your Information</h2>\n" +
                            "<p>We use the information we collect to provide, maintain, and improve our services, process transactions, and send updates.</p>\n" +
                            "<h2>Data Protection</h2>\n" +
                            "<p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized access and processing.</p>\n" +
                            "<h2>Contact Us</h2>\n" +
                            "<p>If you have any questions about this privacy policy, please contact us at our support email.</p>")
                    .updatedBy("SYSTEM")
                    .build();
            privacyPolicyRepository.save(privacyPolicy);
            log.info("Privacy Policy initialized with default content");
        }

        // Initialize Terms and Conditions
        if (termsAndConditionsRepository.findAll().isEmpty()) {
            TermsAndConditions termsAndConditions = TermsAndConditions.builder()
                    .title("Terms and Conditions")
                    .content("<h1>Terms and Conditions</h1>\n" +
                            "<p>This is the default terms and conditions. Please update this content from the Admin Panel > Page Content Manager.</p>\n" +
                            "<h2>Acceptance of Terms</h2>\n" +
                            "<p>By accessing and using this platform, you accept and agree to be bound by the terms and provision of this agreement.</p>\n" +
                            "<h2>Use License</h2>\n" +
                            "<p>Permission is granted to temporarily download one copy of the materials (information or software) on our platform for personal, non-commercial transitory viewing only.</p>\n" +
                            "<h2>Disclaimer</h2>\n" +
                            "<p>The materials on our platform are provided 'as is'. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>\n" +
                            "<h2>Limitations</h2>\n" +
                            "<p>In no event shall our company or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on our platform.</p>\n" +
                            "<h2>Governing Law</h2>\n" +
                            "<p>These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction where our company is located.</p>")
                    .updatedBy("SYSTEM")
                    .build();
            termsAndConditionsRepository.save(termsAndConditions);
            log.info("Terms and Conditions initialized with default content");
        }

        // Initialize Cookie Policy
        if (cookiePolicyRepository.findAll().isEmpty()) {
            CookiePolicy cookiePolicy = CookiePolicy.builder()
                    .title("Cookie Policy")
                    .content("<h1>Cookie Policy</h1>\n" +
                            "<p>This is the default cookie policy. Please update this content from the Admin Panel > Page Content Manager.</p>\n" +
                            "<h2>What Are Cookies?</h2>\n" +
                            "<p>Cookies are small files of letters and numbers that are placed on your browser or the hard drive of your computer when you visit our website.</p>\n" +
                            "<h2>Types of Cookies We Use</h2>\n" +
                            "<ul>\n" +
                            "<li><strong>Essential Cookies:</strong> These are necessary for the website to function properly.</li>\n" +
                            "<li><strong>Analytical Cookies:</strong> These help us understand how visitors use our website.</li>\n" +
                            "<li><strong>Preference Cookies:</strong> These remember your preferences and settings.</li>\n" +
                            "<li><strong>Marketing Cookies:</strong> These track your browsing habits to show you relevant ads.</li>\n" +
                            "</ul>\n" +
                            "<h2>Managing Your Cookies</h2>\n" +
                            "<p>You can control and/or delete cookies as you wish. Most web browsers allow you to control cookies through your browser settings.</p>\n" +
                            "<h2>Third-Party Cookies</h2>\n" +
                            "<p>We may allow third parties to serve cookies on this website for analytics and other purposes.</p>")
                    .updatedBy("SYSTEM")
                    .build();
            cookiePolicyRepository.save(cookiePolicy);
            log.info("Cookie Policy initialized with default content");
        }

        // Initialize FAQ
        if (faqRepository.findAll().isEmpty()) {
            FAQ faq = FAQ.builder()
                    .title("Frequently Asked Questions")
                    .content("<h1>Frequently Asked Questions</h1>\n" +
                            "<p>This is the default FAQ. Please update this content from the Admin Panel > Page Content Manager.</p>\n" +
                            "<h2>General Questions</h2>\n" +
                            "<h3>What is this platform?</h3>\n" +
                            "<p>This platform allows you to browse, book, and manage event tickets online.</p>\n" +
                            "<h3>How do I create an account?</h3>\n" +
                            "<p>Click on the 'Register' button on the login page and fill in your details.</p>\n" +
                            "<h2>Bookings & Payments</h2>\n" +
                            "<h3>How do I book tickets?</h3>\n" +
                            "<p>Browse available events, select your preferred seats, and complete the payment process.</p>\n" +
                            "<h3>What payment methods do you accept?</h3>\n" +
                            "<p>We accept all major credit cards, debit cards, and digital payment methods.</p>\n" +
                            "<h3>Can I cancel my booking?</h3>\n" +
                            "<p>Yes, you can cancel your booking within the specified cancellation period for a refund.</p>\n" +
                            "<h2>Technical Support</h2>\n" +
                            "<h3>What should I do if I encounter an error?</h3>\n" +
                            "<p>Please clear your browser cache and try again. If the issue persists, contact our support team.</p>\n" +
                            "<h3>Is the website mobile-friendly?</h3>\n" +
                            "<p>Yes, our platform is fully responsive and works on all devices.</p>")
                    .updatedBy("SYSTEM")
                    .build();
            faqRepository.save(faq);
            log.info("FAQ initialized with default content");
        }
    }
}
