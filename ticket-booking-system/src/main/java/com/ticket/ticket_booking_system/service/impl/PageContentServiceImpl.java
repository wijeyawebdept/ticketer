package com.ticket.ticket_booking_system.service.impl;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;

import com.ticket.ticket_booking_system.dto.request.PageContentUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.PageContentResponse;
import com.ticket.ticket_booking_system.entity.CookiePolicy;
import com.ticket.ticket_booking_system.entity.FAQ;
import com.ticket.ticket_booking_system.entity.PageType;
import com.ticket.ticket_booking_system.entity.PaymentTerms;
import com.ticket.ticket_booking_system.entity.PrivacyPolicy;
import com.ticket.ticket_booking_system.entity.RefundPolicy;
import com.ticket.ticket_booking_system.entity.TermsAndConditions;
import com.ticket.ticket_booking_system.repository.CookiePolicyRepository;
import com.ticket.ticket_booking_system.repository.FAQRepository;
import com.ticket.ticket_booking_system.repository.PaymentTermsRepository;
import com.ticket.ticket_booking_system.repository.PrivacyPolicyRepository;
import com.ticket.ticket_booking_system.repository.RefundPolicyRepository;
import com.ticket.ticket_booking_system.repository.TermsAndConditionsRepository;
import com.ticket.ticket_booking_system.service.PageContentService;
import com.ticket.ticket_booking_system.service.AdminAuditService;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Organizer;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class PageContentServiceImpl implements PageContentService {

    private final PrivacyPolicyRepository privacyPolicyRepository;
    private final TermsAndConditionsRepository termsAndConditionsRepository;
    private final PaymentTermsRepository paymentTermsRepository;
    private final CookiePolicyRepository cookiePolicyRepository;
    private final FAQRepository faqRepository;
    private final RefundPolicyRepository refundPolicyRepository;
    private final AdminAuditService auditService;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final OrganizerRepository organizerRepository;

    @Override
    public PageContentResponse getPageContent(String pageType) {
        try {
            return switch (pageType.toUpperCase()) {
                case "PRIVACY_POLICY" -> {
                    PrivacyPolicy content = privacyPolicyRepository.findAll().stream()
                            .findFirst()
                            .orElse(PrivacyPolicy.builder().title("Privacy Policy").content("").build());
                    yield convertToResponse(content, "PRIVACY_POLICY");
                }
                case "TERMS_AND_CONDITIONS" -> {
                    TermsAndConditions content = termsAndConditionsRepository.findAll().stream()
                            .findFirst()
                            .orElse(TermsAndConditions.builder().title("Terms and Conditions").content("").build());
                    yield convertToResponse(content, "TERMS_AND_CONDITIONS");
                }
                case "COOKIE_POLICY" -> {
                    CookiePolicy content = cookiePolicyRepository.findAll().stream()
                            .findFirst()
                            .orElse(CookiePolicy.builder().title("Cookie Policy").content("").build());
                    yield convertToResponse(content, "COOKIE_POLICY");
                }
                case "FAQ" -> {
                    FAQ content = faqRepository.findAll().stream()
                            .findFirst()
                            .orElse(FAQ.builder().title("FAQ").content("").build());
                    yield convertToResponse(content, "FAQ");
                }
                case "REFUND_POLICY" -> {
                    RefundPolicy content = refundPolicyRepository.findAll().stream()
                            .findFirst()
                            .orElse(RefundPolicy.builder().title("Refund Policy").content("").build());
                    yield convertToResponse(content, "REFUND_POLICY");
                }
                case "PAYMENT_TERMS", "PAYMENT_TERMS_AND_CONDITIONS" -> {
                    PaymentTerms content = paymentTermsRepository.findAll().stream()
                            .findFirst()
                            .orElse(PaymentTerms.builder().title("Payment Terms and Conditions").content("").build());
                    yield convertToResponse(content, "PAYMENT_TERMS");
                }
                default -> throw new RuntimeException("Invalid page type: " + pageType);
            };
        } catch (Exception e) {
            log.error("Error retrieving page content for type: {}", pageType, e);
            throw new RuntimeException("Failed to retrieve page content: " + e.getMessage());
        }
    }

    @Override
    public PageContentResponse updatePageContent(String pageType, PageContentUpdateRequest request, String updatedBy) {
        try {
            return switch (pageType.toUpperCase()) {
                case "PRIVACY_POLICY" -> {
                    PrivacyPolicy content = privacyPolicyRepository.findAll().stream()
                            .findFirst()
                            .orElse(PrivacyPolicy.builder().build());
                    content.setTitle(request.getTitle());
                    content.setContent(request.getContent());
                    content.setUpdatedBy(updatedBy);
                    content.setUpdatedAt(LocalDateTime.now());
                    content = privacyPolicyRepository.save(content);
                    log.info("Privacy Policy updated");
                    auditService.logAction(getCurrentUserId(), "UPDATE_PAGE_CONTENT", "PAGE_CONTENT", content.getId(), "Updated Privacy Policy content");
                    yield convertToResponse(content, "PRIVACY_POLICY");
                }
                case "TERMS_AND_CONDITIONS" -> {
                    TermsAndConditions content = termsAndConditionsRepository.findAll().stream()
                            .findFirst()
                            .orElse(TermsAndConditions.builder().build());
                    content.setTitle(request.getTitle());
                    content.setContent(request.getContent());
                    content.setUpdatedBy(updatedBy);
                    content.setUpdatedAt(LocalDateTime.now());
                    content = termsAndConditionsRepository.save(content);
                    log.info("Terms and Conditions updated");
                    auditService.logAction(getCurrentUserId(), "UPDATE_PAGE_CONTENT", "PAGE_CONTENT", content.getId(), "Updated Terms and Conditions content");
                    yield convertToResponse(content, "TERMS_AND_CONDITIONS");
                }
                case "COOKIE_POLICY" -> {
                    CookiePolicy content = cookiePolicyRepository.findAll().stream()
                            .findFirst()
                            .orElse(CookiePolicy.builder().build());
                    content.setTitle(request.getTitle());
                    content.setContent(request.getContent());
                    content.setUpdatedBy(updatedBy);
                    content.setUpdatedAt(LocalDateTime.now());
                    content = cookiePolicyRepository.save(content);
                    log.info("Cookie Policy updated");
                    auditService.logAction(getCurrentUserId(), "UPDATE_PAGE_CONTENT", "PAGE_CONTENT", content.getId(), "Updated Cookie Policy content");
                    yield convertToResponse(content, "COOKIE_POLICY");
                }
                case "FAQ" -> {
                    FAQ content = faqRepository.findAll().stream()
                            .findFirst()
                            .orElse(FAQ.builder().build());
                    content.setTitle(request.getTitle());
                    content.setContent(request.getContent());
                    content.setUpdatedBy(updatedBy);
                    content.setUpdatedAt(LocalDateTime.now());
                    content = faqRepository.save(content);
                    log.info("FAQ updated");
                    auditService.logAction(getCurrentUserId(), "UPDATE_FAQ", "FAQ", content.getId(), "Updated FAQ content");
                    yield convertToResponse(content, "FAQ");
                }
                case "REFUND_POLICY" -> {
                    RefundPolicy content = refundPolicyRepository.findAll().stream()
                            .findFirst()
                            .orElse(RefundPolicy.builder().build());
                    content.setTitle(request.getTitle());
                    content.setContent(request.getContent());
                    content.setUpdatedBy(updatedBy);
                    content.setUpdatedAt(LocalDateTime.now());
                    content = refundPolicyRepository.save(content);
                    log.info("Refund Policy updated");
                    auditService.logAction(getCurrentUserId(), "UPDATE_PAGE_CONTENT", "PAGE_CONTENT", content.getId(), "Updated Refund Policy content");
                    yield convertToResponse(content, "REFUND_POLICY");
                }
                case "PAYMENT_TERMS", "PAYMENT_TERMS_AND_CONDITIONS" -> {
                    PaymentTerms content = paymentTermsRepository.findAll().stream()
                            .findFirst()
                            .orElse(PaymentTerms.builder().build());
                    content.setTitle(request.getTitle());
                    content.setContent(request.getContent());
                    content.setUpdatedBy(updatedBy);
                    content.setUpdatedAt(LocalDateTime.now());
                    content = paymentTermsRepository.save(content);
                    log.info("Payment Terms updated");
                    auditService.logAction(getCurrentUserId(), "UPDATE_PAGE_CONTENT", "PAGE_CONTENT", content.getId(), "Updated Payment Terms and Conditions content");
                    yield convertToResponse(content, "PAYMENT_TERMS");
                }
                default -> throw new RuntimeException("Invalid page type: " + pageType);
            };
        } catch (Exception e) {
            log.error("Error updating page content for type: {}", pageType, e);
            throw new RuntimeException("Failed to update page content: " + e.getMessage());
        }
    }

    @Override
    public PageContentResponse getPageContentById(java.util.UUID contentId) {
        try {
            // Search through all repositories
            var privacyPolicy = privacyPolicyRepository.findById(contentId);
            if (privacyPolicy.isPresent()) {
                return convertToResponse(privacyPolicy.get(), "PRIVACY_POLICY");
            }

            var termsAndConditions = termsAndConditionsRepository.findById(contentId);
            if (termsAndConditions.isPresent()) {
                return convertToResponse(termsAndConditions.get(), "TERMS_AND_CONDITIONS");
            }

            var cookiePolicy = cookiePolicyRepository.findById(contentId);
            if (cookiePolicy.isPresent()) {
                return convertToResponse(cookiePolicy.get(), "COOKIE_POLICY");
            }

            var faq = faqRepository.findById(contentId);
            if (faq.isPresent()) {
                return convertToResponse(faq.get(), "FAQ");
            }

            var refundPolicy = refundPolicyRepository.findById(contentId);
            if (refundPolicy.isPresent()) {
                return convertToResponse(refundPolicy.get(), "REFUND_POLICY");
            }

            var paymentTerms = paymentTermsRepository.findById(contentId);
            if (paymentTerms.isPresent()) {
                return convertToResponse(paymentTerms.get(), "PAYMENT_TERMS");
            }

            throw new RuntimeException("Page content not found with ID: " + contentId);
        } catch (Exception e) {
            log.error("Error retrieving page content by ID: {}", contentId, e);
            throw new RuntimeException("Failed to retrieve page content: " + e.getMessage());
        }
    }

    private PageContentResponse convertToResponse(Object content, String pageType) {
        if (content instanceof PrivacyPolicy p) {
            return PageContentResponse.builder()
                    .contentId(p.getId())
                    .pageType(PageType.PRIVACY_POLICY)
                    .title(p.getTitle())
                    .content(p.getContent())
                    .createdAt(p.getCreatedAt())
                    .updatedAt(p.getUpdatedAt())
                    .updatedBy(p.getUpdatedBy())
                    .build();
        } else if (content instanceof TermsAndConditions t) {
            return PageContentResponse.builder()
                    .contentId(t.getId())
                    .pageType(PageType.TERMS_AND_CONDITIONS)
                    .title(t.getTitle())
                    .content(t.getContent())
                    .createdAt(t.getCreatedAt())
                    .updatedAt(t.getUpdatedAt())
                    .updatedBy(t.getUpdatedBy())
                    .build();
        } else if (content instanceof CookiePolicy c) {
            return PageContentResponse.builder()
                    .contentId(c.getId())
                    .pageType(PageType.COOKIE_POLICY)
                    .title(c.getTitle())
                    .content(c.getContent())
                    .createdAt(c.getCreatedAt())
                    .updatedAt(c.getUpdatedAt())
                    .updatedBy(c.getUpdatedBy())
                    .build();
        } else if (content instanceof FAQ f) {
            return PageContentResponse.builder()
                    .contentId(f.getId())
                    .pageType(PageType.FAQ)
                    .title(f.getTitle())
                    .content(f.getContent())
                    .createdAt(f.getCreatedAt())
                    .updatedAt(f.getUpdatedAt())
                    .updatedBy(f.getUpdatedBy())
                    .build();
        } else if (content instanceof RefundPolicy r) {
            return PageContentResponse.builder()
                    .contentId(r.getId())
                    .pageType(PageType.REFUND_POLICY)
                    .title(r.getTitle())
                    .content(r.getContent())
                    .createdAt(r.getCreatedAt())
                    .updatedAt(r.getUpdatedAt())
                    .updatedBy(r.getUpdatedBy())
                    .build();
        } else if (content instanceof PaymentTerms pt) {
            return PageContentResponse.builder()
                    .contentId(pt.getId())
                    .pageType(PageType.PAYMENT_TERMS)
                    .title(pt.getTitle())
                    .content(pt.getContent())
                    .createdAt(pt.getCreatedAt())
                    .updatedAt(pt.getUpdatedAt())
                    .updatedBy(pt.getUpdatedBy())
                    .build();
        }
        throw new RuntimeException("Unknown content type");
    }

    private UUID getCurrentUserId() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()) {
                String email = authentication.getName();
                
                User user = userRepository.findByEmail(email).orElse(null);
                if (user != null) return user.getUserId();
                
                Admin admin = adminRepository.findByEmail(email).orElse(null);
                if (admin != null) return admin.getAdminId();
                
                Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
                if (organizer != null) return organizer.getOrganizerId();
            }
        } catch (Exception e) {
            // Ignore
        }
        return null;
    }
}
