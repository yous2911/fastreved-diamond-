-- RevEd Kids Database Initialization Script
-- This script sets up the initial database structure and configuration

-- Set character set and collation for proper UTF-8 support
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS reved_kids 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Use the database
USE reved_kids;

-- Set timezone
SET time_zone = '+00:00';

-- Enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Create user if it doesn't exist (for Docker setup)
CREATE USER IF NOT EXISTS 'reved_user'@'%' IDENTIFIED BY 'reved_password';
GRANT ALL PRIVILEGES ON reved_kids.* TO 'reved_user'@'%';

-- Grant privileges for localhost connections
CREATE USER IF NOT EXISTS 'reved_user'@'localhost' IDENTIFIED BY 'reved_password';
GRANT ALL PRIVILEGES ON reved_kids.* TO 'reved_user'@'localhost';

-- Flush privileges to ensure they take effect
FLUSH PRIVILEGES;

-- Set MySQL configuration for better performance
SET GLOBAL innodb_buffer_pool_size = 1024*1024*1024; -- 1GB (adjust based on available memory)
SET GLOBAL innodb_log_file_size = 256*1024*1024; -- 256MB
SET GLOBAL innodb_flush_log_at_trx_commit = 2; -- Better performance for non-critical data
SET GLOBAL query_cache_type = 1;
SET GLOBAL query_cache_size = 64*1024*1024; -- 64MB

-- Create initial tables structure (basic setup - Drizzle will handle the rest)
-- Note: Drizzle migrations will create the actual schema

-- Create a basic health check table for monitoring
CREATE TABLE IF NOT EXISTS health_check (
    id INT AUTO_INCREMENT PRIMARY KEY,
    status VARCHAR(20) NOT NULL DEFAULT 'healthy',
    last_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial health check record
INSERT INTO health_check (status) VALUES ('healthy')
ON DUPLICATE KEY UPDATE last_check = CURRENT_TIMESTAMP;

-- Create indexes for better performance
-- Note: Drizzle will create specific indexes based on schema

-- Set up initial configuration
CREATE TABLE IF NOT EXISTS app_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial configuration
INSERT INTO app_config (config_key, config_value, description) VALUES
('app_version', '2.0.0', 'Current application version'),
('maintenance_mode', 'false', 'Application maintenance mode status'),
('max_login_attempts', '5', 'Maximum login attempts before lockout'),
('session_timeout', '86400', 'Session timeout in seconds (24 hours)'),
('cache_ttl', '900', 'Default cache TTL in seconds (15 minutes)')
ON DUPLICATE KEY UPDATE 
    config_value = VALUES(config_value),
    updated_at = CURRENT_TIMESTAMP;

-- Create audit log table for tracking important changes
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    operation ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    record_id VARCHAR(100),
    old_values JSON,
    new_values JSON,
    user_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_table_operation (table_name, operation),
    INDEX idx_created_at (created_at),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create session management table
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INT NOT NULL,
    user_type ENUM('student', 'teacher', 'admin') NOT NULL DEFAULT 'student',
    ip_address VARCHAR(45),
    user_agent TEXT,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_last_activity (last_activity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
    id VARCHAR(128) PRIMARY KEY,
    identifier VARCHAR(100) NOT NULL, -- IP address or user ID
    endpoint VARCHAR(200) NOT NULL,
    requests_count INT NOT NULL DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_identifier_endpoint (identifier, endpoint),
    INDEX idx_window_start (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clean up old sessions and rate limits (add to cron job)
-- DELETE FROM user_sessions WHERE expires_at < NOW();
-- DELETE FROM rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL 1 HOUR);

-- Optimize tables
OPTIMIZE TABLE health_check, app_config, audit_log, user_sessions, rate_limits;

-- Final status message
SELECT 'Database initialization completed successfully!' AS status;

-- Show created tables
SHOW TABLES; 