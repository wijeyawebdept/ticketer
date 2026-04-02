package com.ticket.ticket_booking_system.service.impl;

import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import com.ticket.ticket_booking_system.dto.request.PageContentUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.PageContentResponse;
import com.ticket.ticket_booking_system.entity.*;
import com.ticket.ticket_booking_system.repository.*;
import com.ticket.ticket_booking_system.service.PageContentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class PageContentServiceImpl implements PageContentService {

    private final PrivacyPolicyRepository privacyPolicyRepository;
    private final TermsAndConditionsRepository termsAndConditionsRepository;
    private final CookiePolicyRepository cookiePolicyRepository;
    private final FAQRepository faqRepository;

    @Override
    public PageContentResponse getPageContent(String pageType) {
        try {
            return switch (pageType.toUpperCase()) {
                case "PRIVACY_POLICY" -> {
                    PrivacyPolicy content = privacyPolicyRepository.findAll().stream()
                            .findFirst()
                            .orElseThrow(() -> new RuntimeException("Privacy Policy not found"));
                    yield convertToResponse(content, "PRIVACY_POLICY");
                }
                case "TERMS_AND_CONDITIONS" -> {
                    TermsAndConditions content = termsAndConditionsRepository.findAll().stream()
                            .findFirst()
                            .orElseThrow(() -> new RuntimeException("Terms and Conditions not found"));
                    yield convertToResponse(content, "TERMS_AND_CONDITIONS");
                }
                case "COOKIE_POLICY" -> {
                    CookiePolicy content = cookiePolicyRepository.findAll().stream()
                            .findFirst()
                            .orElseThrow(() -> new RuntimeException("Cookie Policy not found"));
                    yield convertToResponse(content, "COOKIE_POLICY");
                }
                case "FAQ" -> {
                    FAQ content = faqRepository.findAll().stream()
                            .findFirst()
                            .orElseThrow(() -> new RuntimeException("FAQ not found"));
                    yield convertToResponse(content, "FAQ");
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
                    yield convertToResponse(content, "FAQ");
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

            throw new RuntimeException("Page content not found with ID: " + contentId);
        } catch (Exception e) {
            log.error("Error retrieving page content by ID: {}", contentId, e);
            throw new RuntimeException("Failed to retrieve page content: " + e.getMessage());
        }
    }

    private PageContentResponse convertToResponse(Object content, String pageType) {
        if (content instanceof PrivacyPolicy p) {
            return PageContentResponse.builder()
                    .title(p.getTitle())
                    .content(p.getContent())
                    .updatedAt(p.getUpdatedAt())
                    .updatedBy(p.getUpdatedBy())
                    .build();
        } else if (content instanceof TermsAndConditions t) {
            return PageContentResponse.builder()
                    .title(t.getTitle())
                    .content(t.getContent())
                    .updatedAt(t.getUpdatedAt())
                    .updatedBy(t.getUpdatedBy())
                    .build();
        } else if (content instanceof CookiePolicy c) {
            return PageContentResponse.builder()
                    .title(c.getTitle())
                    .content(c.getContent())
                    .updatedAt(c.getUpdatedAt())
                    .updatedBy(c.getUpdatedBy())
                    .build();
        } else if (content instanceof FAQ f) {
            return PageContentResponse.builder()
                    .title(f.getTitle())
                    .content(f.getContent())
                    .updatedAt(f.getUpdatedAt())
                    .updatedBy(f.getUpdatedBy())
                    .build();
        }
        throw new RuntimeException("Unknown content type");
    }
}
