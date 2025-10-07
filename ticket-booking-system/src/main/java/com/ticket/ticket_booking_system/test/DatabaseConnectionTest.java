package com.ticket.ticket_booking_system.test;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DatabaseConnectionTest implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseConnectionTest.class);
    private final DataSource dataSource;

    public DatabaseConnectionTest(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) throws Exception {
        logger.info("Checking PostgreSQL connection...");

        try (Connection connection = dataSource.getConnection()) {
            if (connection.isValid(5)) { // waits 5 seconds
                logger.info("Connected successfully to PostgreSQL!");
                logger.info("Database: {}", connection.getCatalog());
                logger.info("User: {}", connection.getMetaData().getUserName());

                // Print all table names in the current schema
                logger.info("Listing all tables:");
                DatabaseMetaData metaData = connection.getMetaData();
                try (ResultSet tables = metaData.getTables(null, "public", "%", new String[]{"TABLE"})) {
                    while (tables.next()) {
                        if (logger.isInfoEnabled()) {
                            logger.info("   • {}", tables.getString("TABLE_NAME"));
                        }
                    }
                }
            } else {
                logger.error("Connection is not valid.");
            }
        } catch (Exception e) {
            logger.error("Database connection failed: {}", e.getMessage());
            Throwable rootCause = getRootCause(e);
            logger.error("Root cause: {}: {}", rootCause.getClass().getName(), rootCause.getMessage());
            if (logger.isDebugEnabled()) {
                logger.debug("Exception details: {}", e.getClass().getName());
            }
        }
    }
    
    // Helper method to get the root cause of an exception
    private Throwable getRootCause(Throwable throwable) {
        Throwable cause = throwable.getCause();
        if (cause == null) {
            return throwable;
        }
        return getRootCause(cause);
    }
}
