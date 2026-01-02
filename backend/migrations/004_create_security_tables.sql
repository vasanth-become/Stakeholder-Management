/**
 * Security Settings Migration
 *
 * Tables for user security settings and activity tracking
 */

-- User Security Settings Table
CREATE TABLE IF NOT EXISTS user_security_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Alert preferences
  email_alerts BOOLEAN DEFAULT true,
  login_alerts BOOLEAN DEFAULT true,
  unusual_activity_alerts BOOLEAN DEFAULT true,

  -- 2FA settings
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret TEXT,
  backup_codes TEXT[],

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Create index
CREATE INDEX idx_user_security_settings_user ON user_security_settings(user_id);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_security_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER security_settings_updated_at
  BEFORE UPDATE ON user_security_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_security_settings_updated_at();

-- Insert default settings for existing users
INSERT INTO user_security_settings (user_id, email_alerts, login_alerts, unusual_activity_alerts)
SELECT id, true, true, true
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_security_settings WHERE user_id = users.id
);
