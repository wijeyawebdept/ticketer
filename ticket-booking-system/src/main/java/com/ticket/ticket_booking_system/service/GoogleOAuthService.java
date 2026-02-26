package com.ticket.ticket_booking_system.service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

import jakarta.annotation.PostConstruct;

@Service
public class GoogleOAuthService {

    private static final Logger logger = LoggerFactory.getLogger(GoogleOAuthService.class);

    @Value("${google.oauth.client-id}")
    private String googleClientId;

    @PostConstruct
    public void logClientId() {
    logger.info("Google OAuth client id (audience) = {}", googleClientId);
    }

    /**
     * Verify Google OAuth token and extract user information
     * @param idTokenString The Google OAuth token from the frontend
     * @return GoogleIdToken.Payload containing user information
     * @throws GeneralSecurityException if token verification fails
     * @throws IOException if there's an error communicating with Google
     */
    public GoogleIdToken.Payload verifyGoogleToken(String idTokenString) 
            throws GeneralSecurityException, IOException {
        
        logger.info("Attempting to verify Google token");
        
        // Create a GoogleIdTokenVerifier
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), 
                GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(googleClientId))
                .build();

        // Verify the token
        GoogleIdToken idToken = verifier.verify(idTokenString);
        
        if (idToken != null) {
            GoogleIdToken.Payload payload = idToken.getPayload();
            
            // Log user information (for debugging)
            logger.info("Google token verified successfully");
            logger.info("User ID: {}", payload.getSubject());
            logger.info("Email: {}", payload.getEmail());
            logger.info("Email verified: {}", payload.getEmailVerified());
            
            if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
                logger.warn("Email is not verified: {}", payload.getEmail());
                throw new SecurityException("Email address is not verified by Google");
            }
            
            return payload;
        } else {
            logger.error("Invalid Google ID token");
            throw new SecurityException("Invalid Google ID token");
        }
    }

    /**
     * Get user information from Google using access token
     * @param accessToken The Google OAuth access token from the frontend
     * @return GoogleUserInfo containing user information
     * @throws IOException if there's an error communicating with Google
     */
    public GoogleUserInfo getUserInfoFromAccessToken(String accessToken) throws IOException {
        logger.info("Attempting to get user info from Google access token");
        
        RestTemplate restTemplate = new RestTemplate();
        String url = "https://www.googleapis.com/oauth2/v2/userinfo";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<String> entity = new HttpEntity<>(headers);
        
        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                url, 
                HttpMethod.GET, 
                entity, 
                JsonNode.class
            );
            
            JsonNode userInfo = response.getBody();
            if (userInfo == null) {
                throw new SecurityException("Failed to retrieve user information from Google");
            }
            
            logger.info("Successfully retrieved user info from Google");
            logger.info("Email: {}", userInfo.get("email").asText());
            
            return new GoogleUserInfo(
                userInfo.get("id").asText(),
                userInfo.get("email").asText(),
                userInfo.has("given_name") ? userInfo.get("given_name").asText() : "",
                userInfo.has("family_name") ? userInfo.get("family_name").asText() : "",
                userInfo.has("picture") ? userInfo.get("picture").asText() : "",
                userInfo.has("verified_email") && userInfo.get("verified_email").asBoolean()
            );
        } catch (Exception e) {
            logger.error("Error getting user info from Google: {}", e.getMessage());
            throw new SecurityException("Failed to validate Google access token: " + e.getMessage());
        }
    }

    /**
     * Extract user information from Google token payload
     */
    public static class GoogleUserInfo {
        private final String googleId;
        private final String email;
        private final String firstName;
        private final String lastName;
        private final String pictureUrl;
        private final boolean emailVerified;

        public GoogleUserInfo(GoogleIdToken.Payload payload) {
            this.googleId = payload.getSubject();
            this.email = payload.getEmail();
            this.firstName = (String) payload.get("given_name");
            this.lastName = (String) payload.get("family_name");
            this.pictureUrl = (String) payload.get("picture");
            this.emailVerified = Boolean.TRUE.equals(payload.getEmailVerified());
        }

        public GoogleUserInfo(String googleId, String email, String firstName, 
                             String lastName, String pictureUrl, boolean emailVerified) {
            this.googleId = googleId;
            this.email = email;
            this.firstName = firstName;
            this.lastName = lastName;
            this.pictureUrl = pictureUrl;
            this.emailVerified = emailVerified;
        }

        // Getters
        public String getGoogleId() { return googleId; }
        public String getEmail() { return email; }
        public String getFirstName() { return firstName; }
        public String getLastName() { return lastName; }
        public String getPictureUrl() { return pictureUrl; }
        public boolean isEmailVerified() { return emailVerified; }
    }
}
