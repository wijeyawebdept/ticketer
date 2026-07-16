package com.ticket.ticket_booking_system.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DatabaseFixConfig {
    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void fixCheckConstraints() {
        try {
            // 1. Drop the outdated constraint
            jdbcTemplate.execute("ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;");
            log.info("Successfully dropped old events_status_check constraint");
            
            // 2. Add the updated constraint that includes all enum values
            jdbcTemplate.execute("ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status::text IN ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED', 'POSTPONED', 'PENDING_APPROVAL', 'REJECTED'));");
            log.info("Successfully added updated events_status_check constraint");
            // 3. Add like_count and parent_comment_id to blog_comments if they don't exist
            jdbcTemplate.execute("ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;");
            jdbcTemplate.execute("ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS parent_comment_id uuid;");
            
            // 4. Add foreign key for parent_comment_id if it doesn't exist
            jdbcTemplate.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_blog_comments_parent') THEN ALTER TABLE blog_comments ADD CONSTRAINT fk_blog_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES blog_comments (comment_id); END IF; END; $$;");

            // 5. Create blog_comment_likes table
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS blog_comment_likes (" +
                    "like_id uuid PRIMARY KEY, " +
                    "comment_id uuid NOT NULL REFERENCES blog_comments(comment_id), " +
                    "user_id uuid NOT NULL, " +
                    "created_at timestamp without time zone NOT NULL" +
                    ");");
            
            // 6. Add author_avatar to blog_posts
            jdbcTemplate.execute("ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS author_avatar varchar(255);");
            
            log.info("Successfully applied all database schema fixes");
        } catch (Exception e) {
            log.error("Failed to update database schema", e);
        }
    }
}
