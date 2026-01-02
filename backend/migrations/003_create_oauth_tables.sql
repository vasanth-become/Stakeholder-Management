/**
 * OAuth Token Storage Migration
 *
 * Secure storage for OAuth tokens from Slack, Google, and Jira
 */

-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- OAuth Providers Table
CREATE TABLE oauth_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL, -- 'slack', 'google', 'jira'
  display_name VARCHAR(100) NOT NULL,
  auth_url TEXT NOT NULL,
  token_url TEXT NOT NULL,
  revoke_url TEXT,
  scopes TEXT[], -- Array of required scopes
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- OAuth Connections Table (encrypted tokens)
CREATE TABLE oauth_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES oauth_providers(id) ON DELETE CASCADE,

  -- Encrypted tokens (using pgcrypto)
  access_token_encrypted BYTEA NOT NULL,
  refresh_token_encrypted BYTEA,

  -- Token metadata (NOT encrypted)
  token_type VARCHAR(50) DEFAULT 'Bearer',
  expires_at TIMESTAMP,
  scopes TEXT[],

  -- Provider-specific data
  provider_user_id VARCHAR(255), -- External user ID
  provider_user_email VARCHAR(255),
  provider_workspace_id VARCHAR(255), -- Slack workspace, Google workspace, etc.
  provider_metadata JSONB, -- Additional provider-specific data

  -- Status and tracking
  status VARCHAR(50) DEFAULT 'active', -- active, revoked, expired, error
  last_used_at TIMESTAMP,
  last_refresh_at TIMESTAMP,
  refresh_attempts INTEGER DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMP,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES users(id),
  revoke_reason TEXT,

  -- Constraints
  UNIQUE(user_id, provider_id, provider_workspace_id)
);

-- OAuth Token Rotation Log (audit trail)
CREATE TABLE oauth_token_rotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES oauth_connections(id) ON DELETE CASCADE,

  -- What happened
  action VARCHAR(50) NOT NULL, -- 'refresh', 'revoke', 'error'
  success BOOLEAN NOT NULL,
  error_message TEXT,

  -- Context
  triggered_by VARCHAR(50), -- 'user', 'system', 'scheduled'
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Timing
  created_at TIMESTAMP DEFAULT NOW()
);

-- OAuth Encryption Keys (stored separately from tokens)
CREATE TABLE oauth_encryption_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_version INTEGER UNIQUE NOT NULL,
  key_hash BYTEA NOT NULL, -- Hash of the encryption key
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  retired_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_oauth_connections_user ON oauth_connections(user_id);
CREATE INDEX idx_oauth_connections_provider ON oauth_connections(provider_id);
CREATE INDEX idx_oauth_connections_workspace ON oauth_connections(workspace_id);
CREATE INDEX idx_oauth_connections_status ON oauth_connections(status);
CREATE INDEX idx_oauth_connections_expires ON oauth_connections(expires_at);
CREATE INDEX idx_oauth_token_rotations_connection ON oauth_token_rotations(connection_id);
CREATE INDEX idx_oauth_token_rotations_created ON oauth_token_rotations(created_at);

-- Insert default providers
INSERT INTO oauth_providers (name, display_name, auth_url, token_url, revoke_url, scopes) VALUES
(
  'slack',
  'Slack',
  'https://slack.com/oauth/v2/authorize',
  'https://slack.com/api/oauth.v2.access',
  'https://slack.com/api/auth.revoke',
  ARRAY['channels:read', 'channels:write', 'chat:write', 'users:read']
),
(
  'google',
  'Google',
  'https://accounts.google.com/o/oauth2/v2/auth',
  'https://oauth2.googleapis.com/token',
  'https://oauth2.googleapis.com/revoke',
  ARRAY['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile']
),
(
  'jira',
  'Jira',
  'https://auth.atlassian.com/authorize',
  'https://auth.atlassian.com/oauth/token',
  NULL,
  ARRAY['read:jira-user', 'read:jira-work', 'write:jira-work']
);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_oauth_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER oauth_connections_updated_at
  BEFORE UPDATE ON oauth_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_oauth_connections_updated_at();

-- Function to log token rotations
CREATE OR REPLACE FUNCTION log_oauth_rotation()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND (
    OLD.access_token_encrypted IS DISTINCT FROM NEW.access_token_encrypted OR
    OLD.refresh_token_encrypted IS DISTINCT FROM NEW.refresh_token_encrypted
  )) THEN
    INSERT INTO oauth_token_rotations (
      connection_id,
      action,
      success,
      triggered_by
    ) VALUES (
      NEW.id,
      'refresh',
      true,
      'system'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER oauth_rotation_logger
  AFTER UPDATE ON oauth_connections
  FOR EACH ROW
  EXECUTE FUNCTION log_oauth_rotation();

-- View for safe token data (excludes encrypted tokens)
CREATE VIEW oauth_connections_safe AS
SELECT
  id,
  user_id,
  workspace_id,
  provider_id,
  token_type,
  expires_at,
  scopes,
  provider_user_id,
  provider_user_email,
  provider_workspace_id,
  provider_metadata,
  status,
  last_used_at,
  last_refresh_at,
  refresh_attempts,
  last_error,
  last_error_at,
  created_at,
  updated_at,
  revoked_at,
  revoked_by,
  revoke_reason
FROM oauth_connections;

-- Grant permissions (adjust based on your database user)
-- GRANT SELECT, INSERT, UPDATE ON oauth_connections_safe TO app_user;
-- GRANT SELECT ON oauth_providers TO app_user;
