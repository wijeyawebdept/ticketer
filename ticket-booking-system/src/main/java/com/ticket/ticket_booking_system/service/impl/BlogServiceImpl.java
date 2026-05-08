package com.ticket.ticket_booking_system.service.impl;

import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.ticket.ticket_booking_system.dto.blog.BlogDTOs.BlogCommentRequest;
import com.ticket.ticket_booking_system.dto.blog.BlogDTOs.BlogCommentResponse;
import com.ticket.ticket_booking_system.dto.blog.BlogDTOs.BlogImageResponse;
import com.ticket.ticket_booking_system.dto.blog.BlogDTOs.BlogPostCreateRequest;
import com.ticket.ticket_booking_system.dto.blog.BlogDTOs.BlogPostDetailResponse;
import com.ticket.ticket_booking_system.dto.blog.BlogDTOs.BlogPostSummaryResponse;
import com.ticket.ticket_booking_system.entity.BlogComment;
import com.ticket.ticket_booking_system.entity.BlogLike;
import com.ticket.ticket_booking_system.entity.BlogPost;
import com.ticket.ticket_booking_system.entity.BlogPostImage;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.repository.BlogCommentRepository;
import com.ticket.ticket_booking_system.repository.BlogLikeRepository;
import com.ticket.ticket_booking_system.repository.BlogPostImageRepository;
import com.ticket.ticket_booking_system.repository.BlogPostRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.service.BlogService;
import com.ticket.ticket_booking_system.service.EmailService;
import com.ticket.ticket_booking_system.service.RecycleBinService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class BlogServiceImpl implements BlogService {

    private final BlogPostRepository postRepo;
    private final BlogCommentRepository commentRepo;
    private final BlogLikeRepository likeRepo;
    private final BlogPostImageRepository imageRepo;
    private final UserRepository userRepo;
    private final com.ticket.ticket_booking_system.repository.AdminRepository adminRepo;
    private final EmailService emailService;
    private final RecycleBinService recycleBinService;

    // ---- Admin Operations ----

    @Override
    @Transactional
    public BlogPostDetailResponse createPost(BlogPostCreateRequest request, List<MultipartFile> images) {
        BlogPost post = BlogPost.builder()
                .title(request.title())
                .summary(request.summary())
                .content(request.content())
                .published(false)
                .build();
        post = postRepo.save(post);

        if (images != null) {
            int order = 0;
            for (MultipartFile file : images) {
                if (!file.isEmpty()) {
                    try {
                        BlogPostImage img = BlogPostImage.builder()
                                .post(post)
                                .imageData(file.getBytes())
                                .imageFileName(file.getOriginalFilename())
                                .imageContentType(file.getContentType())
                                .imageSize(file.getSize())
                                .displayOrder(order++)
                                .build();
                        imageRepo.save(img);
                    } catch (Exception e) {
                        log.error("Failed to save image: {}", e.getMessage());
                    }
                }
            }
        }
        return getPostDetail(post.getPostId(), null);
    }

    @Override
    @Transactional
    public BlogPostDetailResponse updatePost(UUID postId, BlogPostCreateRequest request, List<MultipartFile> newImages) {
        BlogPost post = postRepo.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found: " + postId));

        post.setTitle(request.title());
        post.setSummary(request.summary());
        post.setContent(request.content());
        postRepo.save(post);

        if (newImages != null) {
            int existingCount = imageRepo.findByPost_PostIdOrderByDisplayOrderAsc(postId).size();
            int order = existingCount;
            for (MultipartFile file : newImages) {
                if (!file.isEmpty()) {
                    try {
                        BlogPostImage img = BlogPostImage.builder()
                                .post(post)
                                .imageData(file.getBytes())
                                .imageFileName(file.getOriginalFilename())
                                .imageContentType(file.getContentType())
                                .imageSize(file.getSize())
                                .displayOrder(order++)
                                .build();
                        imageRepo.save(img);
                    } catch (Exception e) {
                        log.error("Failed to save image: {}", e.getMessage());
                    }
                }
            }
        }
        return getPostDetail(postId, null);
    }

    @Override
    @Transactional
    public BlogPostDetailResponse togglePublish(UUID postId) {
        BlogPost post = postRepo.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found: " + postId));
        post.setPublished(!post.isPublished());
        postRepo.save(post);
        return getPostDetail(postId, null);
    }

    @Override
    @Transactional
    public void deletePost(UUID postId) {
        BlogPost post = postRepo.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found: " + postId));
                
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User deletedBy = null;
        if (authentication != null && authentication.getName() != null) {
            String email = authentication.getName();
            deletedBy = userRepo.findByEmail(email).orElse(null);
            
            if (deletedBy == null) {
                com.ticket.ticket_booking_system.entity.Admin admin = adminRepo.findByEmail(email).orElse(null);
                if (admin != null) {
                    deletedBy = new User();
                    deletedBy.setId(admin.getAdminId());
                    deletedBy.setEmail(admin.getEmail());
                    deletedBy.setFirstName(admin.getFirstName());
                    deletedBy.setLastName(admin.getLastName());
                }
            }
        }
        
        if (deletedBy == null) {
            throw new RuntimeException("Could not identify current user for deletion");
        }

        // Move to recycle bin
        recycleBinService.moveToRecycleBin(
            "BLOG",
            post.getPostId(),
            post.getTitle(),
            post,
            deletedBy,
            "Blog post soft deleted by " + deletedBy.getEmail()
        );

        post.setPublished(false);
        post.setIsDeleted(true);
        postRepo.save(post);
    }

    @Override
    @Transactional
    public void deleteComment(UUID commentId) {
        BlogComment comment = commentRepo.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));
        BlogPost post = comment.getPost();
        post.setCommentCount(Math.max(0, post.getCommentCount() - 1));
        postRepo.save(post);
        commentRepo.deleteById(commentId);
    }

    @Override
    @Transactional
    public void deleteImage(UUID imageId) {
        imageRepo.deleteById(imageId);
    }

    @Override
    @Transactional
    public void updateImageOrder(List<UUID> imageIds) {
        if (imageIds == null || imageIds.isEmpty()) return;
        for (int i = 0; i < imageIds.size(); i++) {
            UUID imageId = imageIds.get(i);
            var imgOpt = imageRepo.findById(imageId);
            if (imgOpt.isPresent()) {
                BlogPostImage img = imgOpt.get();
                img.setDisplayOrder(i);
                imageRepo.save(img);
            }
        }
    }

    @Override
    public Page<BlogPostSummaryResponse> getAllPostsForAdmin(Pageable pageable) {
        return postRepo.findByIsDeletedFalse(pageable).map(this::toSummary);
    }

    // ---- Public Operations ----

    @Override
    public Page<BlogPostSummaryResponse> getPublishedPosts(Pageable pageable) {
        return postRepo.findByPublishedTrueAndIsDeletedFalse(pageable).map(this::toSummary);
    }

    @Override
    @Transactional(readOnly = true)
    public BlogPostDetailResponse getPostDetail(UUID postId, UUID currentUserId) {
        BlogPost post = postRepo.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found: " + postId));

        List<BlogImageResponse> images = imageRepo.findByPost_PostIdOrderByDisplayOrderAsc(postId)
                .stream().map(this::toImageResponse).collect(Collectors.toList());

        List<BlogCommentResponse> comments = commentRepo.findByPost_PostIdOrderByCreatedAtAsc(postId)
                .stream().map(this::toCommentResponse).collect(Collectors.toList());

        boolean liked = currentUserId != null && likeRepo.existsByPost_PostIdAndUserId(postId, currentUserId);

        return new BlogPostDetailResponse(
                post.getPostId().toString(),
                post.getTitle(),
                post.getSummary(),
                post.getContent(),
                post.isPublished(),
                post.getLikeCount(),
                post.getCommentCount(),
                liked,
                images,
                comments,
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }


    @Override
    @Transactional
    public BlogCommentResponse addComment(UUID postId, UUID userId, String userName, BlogCommentRequest request) {
        BlogPost post = postRepo.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        BlogComment comment = BlogComment.builder()
                .post(post)
                .userId(userId)
                .userName(userName)
                .content(request.content())
                .build();
        comment = commentRepo.save(comment);
        post.setCommentCount(post.getCommentCount() + 1);
        postRepo.save(post);
        return toCommentResponse(comment);
    }

    @Override
    @Transactional
    public boolean toggleLike(UUID postId, UUID userId) {
        BlogPost post = postRepo.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        var existing = likeRepo.findByPost_PostIdAndUserId(postId, userId);
        if (existing.isPresent()) {
            likeRepo.delete(existing.get());
            post.setLikeCount(Math.max(0, post.getLikeCount() - 1));
            postRepo.save(post);
            return false;
        } else {
            BlogLike like = BlogLike.builder().post(post).userId(userId).build();
            likeRepo.save(like);
            post.setLikeCount(post.getLikeCount() + 1);
            postRepo.save(post);
            return true;
        }
    }

    // ---- Email Digest ----

    @Override
    @Transactional
    public void sendBlogDigestEmail(String subject, String customMessage) {
        List<BlogPost> unsentPosts = postRepo.findByPublishedTrueAndIsDeletedFalseAndDigestSentFalse();
        if (unsentPosts.isEmpty()) {
            log.info("No new blog posts to include in digest.");
            return;
        }

        List<User> subscribers = userRepo.findByEmailNotificationsEnabledTrueAndActive(1);
        if (subscribers.isEmpty()) {
            log.info("No subscribers for blog digest.");
            return;
        }

        String effectiveSubject = (subject != null && !subject.isBlank()) ? subject : "📰 Ticketer.lk — Latest Blog Updates";

        for (User user : subscribers) {
            try {
                String html = buildDigestHtml(user.getFirstName(), unsentPosts, customMessage);
                emailService.sendHtml(user.getEmail(), effectiveSubject, html);
            } catch (Exception e) {
                log.error("Failed to send digest to {}: {}", user.getEmail(), e.getMessage());
            }
        }

        // Mark as sent
        for (BlogPost post : unsentPosts) {
            post.setDigestSent(true);
        }
        postRepo.saveAll(unsentPosts);
        log.info("Blog digest sent to {} subscribers for {} posts.", subscribers.size(), unsentPosts.size());
    }

    // ---- Mappers ----

    private BlogPostSummaryResponse toSummary(BlogPost post) {
        List<BlogPostImage> images = imageRepo.findByPost_PostIdOrderByDisplayOrderAsc(post.getPostId());
        String coverBase64 = null;
        String coverContentType = null;
        if (!images.isEmpty()) {
            coverBase64 = "data:" + images.get(0).getImageContentType() + ";base64,"
                    + Base64.getEncoder().encodeToString(images.get(0).getImageData());
            coverContentType = images.get(0).getImageContentType();
        }
        return new BlogPostSummaryResponse(
                post.getPostId().toString(),
                post.getTitle(),
                post.getSummary(),
                post.isPublished(),
                post.getLikeCount(),
                post.getCommentCount(),
                coverBase64,
                coverContentType,
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }

    private BlogImageResponse toImageResponse(BlogPostImage img) {
        String base64 = "data:" + img.getImageContentType() + ";base64,"
                + Base64.getEncoder().encodeToString(img.getImageData());
        return new BlogImageResponse(
                img.getImageId().toString(),
                base64,
                img.getImageContentType(),
                img.getDisplayOrder()
        );
    }

    private BlogCommentResponse toCommentResponse(BlogComment c) {
        return new BlogCommentResponse(
                c.getCommentId().toString(),
                c.getUserId().toString(),
                c.getUserName(),
                c.getContent(),
                c.getCreatedAt()
        );
    }

    private String buildDigestHtml(String firstName, List<BlogPost> posts, String customMessage) {
        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html><body style='font-family:Raleway,sans-serif;background:#0d0d0d;color:#fff;padding:24px;'>");
        sb.append("<div style='max-width:600px;margin:0 auto;'>");
        sb.append("<h1 style='color:#ff1955;'>Ticketer<span style='color:#fcd0a5;'>.lk</span> Blog</h1>");
        sb.append("<p style='color:#aaa;'>Hi ").append(firstName != null ? firstName : "there").append(",</p>");
        if (customMessage != null && !customMessage.isBlank()) {
            sb.append("<p style='color:#ddd;'>").append(customMessage).append("</p>");
        }
        sb.append("<p style='color:#aaa;'>Here are the latest articles and updates from the Ticketer.lk blog:</p>");
        sb.append("<hr style='border-color:#333;margin:16px 0;'/>");
        for (BlogPost post : posts) {
            sb.append("<div style='background:#1a1a1a;border-radius:8px;padding:16px;margin-bottom:16px;border-left:3px solid #ff1955;'>");
            sb.append("<h2 style='margin:8px 0;color:#fff;font-size:18px;'>").append(post.getTitle()).append("</h2>");
            if (post.getSummary() != null) {
                sb.append("<p style='color:#bbb;font-size:14px;margin:0 0 12px;'>").append(post.getSummary()).append("</p>");
            }
            sb.append("<a href='http://localhost:3000/blog/").append(post.getPostId()).append("' ")
              .append("style='background:#ff1955;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px;'>")
              .append("Read More →</a>");
            sb.append("</div>");
        }
        sb.append("<hr style='border-color:#333;margin:24px 0;'/>");
        sb.append("<p style='color:#555;font-size:12px;text-align:center;'>You received this because you opted in to email notifications. <br/>Ticketer.lk — Your Event Partner</p>");
        sb.append("</div></body></html>");
        return sb.toString();
    }
}
