-- ============================================
-- Collaboration System - Phase 1: Comments
-- Migration: 001_collaboration_system_phase1
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. USERS TABLE ENHANCEMENTS
-- ============================================

-- Extend existing users table with collaboration fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email": true,
  "in_app": true,
  "slack": false,
  "digest": "daily",
  "quiet_hours_enabled": false
}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_hours_start TIME;
ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_hours_end TIME;

-- Add display_name index for @mention autocomplete
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);
CREATE INDEX IF NOT EXISTS idx_users_email_search ON users(email);

-- ============================================
-- 2. COMMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,

  -- Polymorphic reference to commentable entities
  entity_type TEXT NOT NULL CHECK(entity_type IN ('stakeholder', 'interaction', 'insight', 'project', 'task')),
  entity_id TEXT NOT NULL, -- Can be integer or UUID depending on entity

  -- Content
  content TEXT NOT NULL,
  formatted_content TEXT, -- Markdown rendered HTML (optional)

  -- Metadata
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visibility TEXT NOT NULL DEFAULT 'internal' CHECK(visibility IN ('internal', 'client_visible')),
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP WITH TIME ZONE,

  -- Mentions (array of user IDs)
  mentioned_users UUID[],

  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_comments_mentions ON comments USING GIN(mentioned_users) WHERE is_deleted = FALSE;

-- Comment on table
COMMENT ON TABLE comments IS 'User comments on entities (stakeholders, interactions, projects, etc.)';
COMMENT ON COLUMN comments.entity_type IS 'Type of entity being commented on';
COMMENT ON COLUMN comments.entity_id IS 'ID of entity (can be integer or UUID string)';
COMMENT ON COLUMN comments.visibility IS 'Who can see this comment - internal team only or client-visible';
COMMENT ON COLUMN comments.mentioned_users IS 'Array of user IDs who were @mentioned in this comment';

-- ============================================
-- 3. COMMENT REACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK(reaction_type IN ('thumbs_up', 'smile', 'warning', 'celebrate')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one reaction per user per comment per type
  UNIQUE(comment_id, user_id, reaction_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reactions_comment ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON comment_reactions(user_id);

COMMENT ON TABLE comment_reactions IS 'User reactions to comments (👍 🙂 ⚠️ 🎉)';

-- ============================================
-- 4. NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Notification details
  type TEXT NOT NULL CHECK(type IN (
    'mention',
    'comment_reply',
    'task_assigned',
    'task_due_soon',
    'task_overdue',
    'task_completed',
    'permission_changed',
    'reaction_added'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Linkage to related entity
  related_entity_type TEXT,
  related_entity_id TEXT, -- Can be UUID or integer string
  action_url TEXT, -- Deep link to the notification target

  -- State
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,

  -- Delivery tracking
  sent_email BOOLEAN DEFAULT FALSE,
  sent_slack BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  slack_sent_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint: related_entity_type and related_entity_id must both be set or both be null
  CHECK ((related_entity_type IS NULL AND related_entity_id IS NULL) OR
         (related_entity_type IS NOT NULL AND related_entity_id IS NOT NULL))
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

COMMENT ON TABLE notifications IS 'In-app and email notifications for user actions';
COMMENT ON COLUMN notifications.type IS 'Type of notification trigger';
COMMENT ON COLUMN notifications.action_url IS 'Frontend route to navigate to when clicking notification';

-- ============================================
-- 5. NOTIFICATION BATCHES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notification_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_ids UUID[] NOT NULL,
  batch_type TEXT NOT NULL CHECK(batch_type IN ('hourly_digest', 'daily_digest', 'weekly_digest')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Metadata
  total_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_batches_user ON notification_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_batches_sent ON notification_batches(sent_at DESC);

COMMENT ON TABLE notification_batches IS 'Batched notification digests sent to users';

-- ============================================
-- 6. ACTIVITY LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,

  -- What
  action_type TEXT NOT NULL, -- e.g., 'comment_created', 'comment_edited', 'reaction_added'
  entity_type TEXT NOT NULL, -- e.g., 'comment', 'stakeholder', 'interaction'
  entity_id TEXT NOT NULL, -- UUID or integer string

  -- Details
  description TEXT NOT NULL, -- Human-readable description
  changes JSONB, -- Before/after values for edits
  metadata JSONB DEFAULT '{}'::jsonb,

  -- When/Where
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);

-- Partition by month for performance (optional, can be added later)
-- CREATE TABLE activity_log_2024_01 PARTITION OF activity_log FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

COMMENT ON TABLE activity_log IS 'Comprehensive audit trail of all user actions';
COMMENT ON COLUMN activity_log.changes IS 'JSON object with before/after values for edit actions';

-- ============================================
-- 7. TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. FUNCTIONS
-- ============================================

-- Function to get comment thread (recursive)
CREATE OR REPLACE FUNCTION get_comment_thread(root_comment_id UUID)
RETURNS TABLE (
  id UUID,
  parent_id UUID,
  entity_type TEXT,
  entity_id TEXT,
  content TEXT,
  author_id UUID,
  author_name TEXT,
  author_email TEXT,
  visibility TEXT,
  is_edited BOOLEAN,
  edited_at TIMESTAMP WITH TIME ZONE,
  mentioned_users UUID[],
  created_at TIMESTAMP WITH TIME ZONE,
  depth INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE thread AS (
    -- Base case: root comment
    SELECT
      c.id,
      c.parent_id,
      c.entity_type,
      c.entity_id,
      c.content,
      c.author_id,
      u.first_name || ' ' || u.last_name AS author_name,
      u.email AS author_email,
      c.visibility,
      c.is_edited,
      c.edited_at,
      c.mentioned_users,
      c.created_at,
      0 AS depth
    FROM comments c
    JOIN users u ON c.author_id = u.id
    WHERE c.id = root_comment_id AND c.is_deleted = FALSE

    UNION ALL

    -- Recursive case: replies
    SELECT
      c.id,
      c.parent_id,
      c.entity_type,
      c.entity_id,
      c.content,
      c.author_id,
      u.first_name || ' ' || u.last_name AS author_name,
      u.email AS author_email,
      c.visibility,
      c.is_edited,
      c.edited_at,
      c.mentioned_users,
      c.created_at,
      t.depth + 1
    FROM comments c
    JOIN users u ON c.author_id = u.id
    JOIN thread t ON c.parent_id = t.id
    WHERE c.is_deleted = FALSE
  )
  SELECT * FROM thread
  ORDER BY depth, created_at;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_comment_thread IS 'Recursively retrieves all comments in a thread starting from root';

-- ============================================
-- 9. INITIAL DATA (Optional)
-- ============================================

-- You can insert test data here if needed
-- Example: Insert a system user for automated notifications
-- INSERT INTO users (email, first_name, last_name, role, password_hash)
-- VALUES ('system@stakeholderradar.com', 'System', 'Bot', 'admin', 'not_used')
-- ON CONFLICT (email) DO NOTHING;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 001_collaboration_system_phase1 completed successfully';
  RAISE NOTICE 'Created tables: comments, comment_reactions, notifications, notification_batches, activity_log';
  RAISE NOTICE 'Enhanced users table with collaboration fields';
END $$;
