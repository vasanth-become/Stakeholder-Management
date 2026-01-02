-- Authentication System Database Schema
-- Run this migration to set up all auth-related tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),

    -- Security fields
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,

    -- Tracking fields
    last_login_at TIMESTAMP,
    password_changed_at TIMESTAMP,

    -- Google OAuth fields (optional)
    google_id VARCHAR(255) UNIQUE,
    google_picture_url TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX idx_users_is_active ON users(is_active);

-- ============================================================================
-- REFRESH TOKENS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,

    -- Device & location info
    device_info TEXT,
    ip_address VARCHAR(45), -- IPv6 compatible
    user_agent TEXT,

    -- Security
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,
    revoked_reason VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked ON refresh_tokens(revoked) WHERE revoked = FALSE;

-- ============================================================================
-- LOGIN ATTEMPTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255),
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,

    -- Result
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(255),

    -- Timestamps
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for brute force protection queries
CREATE INDEX idx_login_attempts_ip_time ON login_attempts(ip_address, attempted_at);
CREATE INDEX idx_login_attempts_email_time ON login_attempts(email, attempted_at);
CREATE INDEX idx_login_attempts_success ON login_attempts(success);

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,

    -- Context
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),

    -- Request info
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Additional data (JSON)
    metadata JSONB,

    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ============================================================================
-- PASSWORD RESET TOKENS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,

    -- Security
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,

    -- Tracking
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- ============================================================================
-- EMAIL VERIFICATION TOKENS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,

    -- Security
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_tokens_token_hash ON email_verification_tokens(token_hash);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CLEANUP JOBS (Run these periodically via cron or pg_cron)
-- ============================================================================

-- Delete expired refresh tokens (run daily)
-- DELETE FROM refresh_tokens WHERE expires_at < NOW() AND revoked = FALSE;

-- Delete old login attempts (run weekly, keep last 30 days)
-- DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '30 days';

-- Delete old audit logs (run monthly, keep last 90 days)
-- DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete used/expired password reset tokens (run daily)
-- DELETE FROM password_reset_tokens WHERE (used = TRUE OR expires_at < NOW()) AND created_at < NOW() - INTERVAL '7 days';

-- Delete used/expired email verification tokens (run daily)
-- DELETE FROM email_verification_tokens WHERE (used = TRUE OR expires_at < NOW()) AND created_at < NOW() - INTERVAL '7 days';

-- ============================================================================
-- INITIAL DATA (Optional)
-- ============================================================================

-- Create default admin user (change password immediately!)
-- Password: AdminPassword123! (hashed with bcrypt)
-- INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified, is_active)
-- VALUES (
--     'admin@stakeholderradar.com',
--     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5S0XYuL4XO2YO',  -- Change this!
--     'Admin',
--     'User',
--     'admin',
--     TRUE,
--     TRUE
-- );

-- ============================================================================
-- GRANT PERMISSIONS (adjust as needed)
-- ============================================================================

-- Example: Grant access to application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON users TO stakeholder_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON refresh_tokens TO stakeholder_app;
-- GRANT SELECT, INSERT ON login_attempts TO stakeholder_app;
-- GRANT SELECT, INSERT ON audit_logs TO stakeholder_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON password_reset_tokens TO stakeholder_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON email_verification_tokens TO stakeholder_app;

-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO stakeholder_app;

COMMENT ON TABLE users IS 'User accounts with authentication credentials';
COMMENT ON TABLE refresh_tokens IS 'Refresh tokens for JWT authentication with rotation';
COMMENT ON TABLE login_attempts IS 'Login attempt history for brute force protection';
COMMENT ON TABLE audit_logs IS 'Security audit trail for compliance';
COMMENT ON TABLE password_reset_tokens IS 'Secure password reset tokens with expiry';
COMMENT ON TABLE email_verification_tokens IS 'Email verification tokens for new signups';
