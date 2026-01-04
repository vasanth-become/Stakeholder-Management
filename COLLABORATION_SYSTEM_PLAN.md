# Collaboration System - Implementation Plan
## Stakeholder Radar

---

## Executive Summary

This document outlines the complete implementation plan for adding a calm, minimal, human-centered collaboration system to Stakeholder Radar. The system will enable teams to comment, assign tasks, manage permissions, and track activity without the noise of traditional chat applications.

---

## System Architecture

### Database Strategy

**Current State:**
- PostgreSQL: Authentication (users, login_attempts, password_reset_tokens, audit_log)
- SQLite: Core data (projects, stakeholders, interactions, enrichments)

**Proposed Approach:**
- **PostgreSQL**: Collaboration features (comments, tasks, permissions, notifications, activity)
- **SQLite**: Continue using for core stakeholder management data
- **Rationale**: Keeps collaboration features separate, leverages existing auth infrastructure

---

## Database Schema Design

### 1. Users Table Enhancement (PostgreSQL)

```sql
-- Extend existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_hours_start TIME;
ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_hours_end TIME;
```

### 2. Comments System (PostgreSQL)

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For threading

  -- Polymorphic reference to commentable entities
  entity_type TEXT NOT NULL CHECK(entity_type IN ('stakeholder', 'interaction', 'insight', 'project', 'task')),
  entity_id INTEGER NOT NULL,

  -- Content
  content TEXT NOT NULL,
  formatted_content TEXT, -- Markdown rendered HTML

  -- Metadata
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visibility TEXT NOT NULL DEFAULT 'internal' CHECK(visibility IN ('internal', 'client_visible')),
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP,

  -- Mentions (array of user IDs)
  mentioned_users UUID[],

  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Composite index for efficient queries
  INDEX idx_comments_entity (entity_type, entity_id),
  INDEX idx_comments_author (author_id),
  INDEX idx_comments_parent (parent_id),
  INDEX idx_comments_created (created_at DESC)
);

CREATE TABLE comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK(reaction_type IN ('thumbs_up', 'smile', 'warning', 'celebrate')),
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(comment_id, user_id, reaction_type)
);
```

### 3. Tasks System (PostgreSQL)

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Task details
  title TEXT NOT NULL,
  description TEXT,

  -- Assignment
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  owner UUID REFERENCES users(id), -- Accountable person

  -- Priority & status
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),

  -- Dates
  due_date TIMESTAMP,
  completed_at TIMESTAMP,

  -- Linkage to entities
  linked_entity_type TEXT CHECK(linked_entity_type IN ('stakeholder', 'interaction', 'insight', 'project')),
  linked_entity_id INTEGER,

  -- Metadata
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  tags TEXT[],

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_tasks_assigned (assigned_to),
  INDEX idx_tasks_owner (owner),
  INDEX idx_tasks_status (status),
  INDEX idx_tasks_due_date (due_date),
  INDEX idx_tasks_linked (linked_entity_type, linked_entity_id)
);

CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Permissions System (PostgreSQL)

```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'contributor', 'viewer')),

  -- Project access (NULL = all projects)
  project_ids INTEGER[], -- Array of project IDs from SQLite

  -- Feature permissions
  can_edit_projects BOOLEAN DEFAULT TRUE,
  can_delete_projects BOOLEAN DEFAULT FALSE,
  can_manage_team BOOLEAN DEFAULT FALSE,
  can_view_private_notes BOOLEAN DEFAULT TRUE,
  can_export_data BOOLEAN DEFAULT FALSE,

  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP DEFAULT NOW(),
  joined_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Pre-defined role templates
CREATE TABLE role_templates (
  role TEXT PRIMARY KEY,
  permissions JSONB NOT NULL,
  description TEXT
);

-- Insert default roles
INSERT INTO role_templates (role, permissions, description) VALUES
('admin', '{"can_edit_projects": true, "can_delete_projects": true, "can_manage_team": true, "can_view_private_notes": true, "can_export_data": true}'::jsonb, 'Full access to all features'),
('manager', '{"can_edit_projects": true, "can_delete_projects": false, "can_manage_team": true, "can_view_private_notes": true, "can_export_data": true}'::jsonb, 'Team-level access'),
('contributor', '{"can_edit_projects": true, "can_delete_projects": false, "can_manage_team": false, "can_view_private_notes": true, "can_export_data": false}'::jsonb, 'Assigned projects only'),
('viewer', '{"can_edit_projects": false, "can_delete_projects": false, "can_manage_team": false, "can_view_private_notes": false, "can_export_data": false}'::jsonb, 'Read-only access');
```

### 5. Notifications System (PostgreSQL)

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Notification details
  type TEXT NOT NULL CHECK(type IN ('mention', 'task_assigned', 'comment_reply', 'task_due_soon', 'task_overdue', 'permission_changed')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Linkage
  related_entity_type TEXT,
  related_entity_id TEXT, -- Can be UUID or INTEGER
  action_url TEXT,

  -- State
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,

  -- Delivery channels
  sent_email BOOLEAN DEFAULT FALSE,
  sent_slack BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP,
  slack_sent_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_unread (user_id, is_read),
  INDEX idx_notifications_created (created_at DESC)
);

CREATE TABLE notification_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_ids UUID[] NOT NULL,
  batch_type TEXT NOT NULL CHECK(batch_type IN ('hourly_digest', 'daily_digest')),
  sent_at TIMESTAMP DEFAULT NOW()
);
```

### 6. Activity Log (PostgreSQL)

```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who
  user_id UUID NOT NULL REFERENCES users(id),
  user_email TEXT NOT NULL,
  user_name TEXT,

  -- What
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL, -- Can be UUID or INTEGER

  -- Details
  description TEXT NOT NULL,
  changes JSONB, -- Before/after values
  metadata JSONB,

  -- When/Where
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_activity_user (user_id),
  INDEX idx_activity_entity (entity_type, entity_id),
  INDEX idx_activity_type (action_type),
  INDEX idx_activity_created (created_at DESC)
);
```

---

## Backend Services

### 1. Comment Service (`backend/services/commentService.js`)

**Responsibilities:**
- Create, read, update, delete comments
- Thread management
- Mention extraction and notification
- Reaction handling
- Visibility control (internal vs client-visible)

**Key Methods:**
```javascript
- createComment(entityType, entityId, content, authorId, visibility, parentId)
- getComments(entityType, entityId, includeThreads)
- updateComment(commentId, content, userId)
- deleteComment(commentId, userId) // Soft delete
- addReaction(commentId, userId, reactionType)
- removeReaction(commentId, userId, reactionType)
- extractMentions(content) // Parse @mentions
```

### 2. Task Service (`backend/services/taskService.js`)

**Responsibilities:**
- Task CRUD operations
- Assignment and ownership management
- Due date tracking
- Status transitions
- Task linkage to entities

**Key Methods:**
```javascript
- createTask(data, createdBy)
- updateTask(taskId, updates, userId)
- assignTask(taskId, assignedTo, assignedBy)
- changeStatus(taskId, newStatus, userId)
- getTasks(filters) // Filter by assignee, status, due date, etc.
- getOverdueTasks()
- getDueSoonTasks(days)
- linkToEntity(taskId, entityType, entityId)
```

### 3. Permission Service (`backend/services/permissionService.js`)

**Responsibilities:**
- Role-based access control
- Project-level permissions
- Feature access checks
- Team member management

**Key Methods:**
```javascript
- checkPermission(userId, permission)
- canAccessProject(userId, projectId)
- canEditEntity(userId, entityType, entityId)
- getRolePermissions(role)
- updateUserRole(userId, newRole, updatedBy)
- addTeamMember(email, role, invitedBy)
- removeTeamMember(userId, removedBy)
```

### 4. Notification Service (`backend/services/notificationService.js`)

**Responsibilities:**
- Create notifications
- Batch notifications
- Email/Slack delivery
- User preferences
- Quiet hours

**Key Methods:**
```javascript
- createNotification(userId, type, title, message, relatedEntity)
- sendNotification(notificationId)
- batchNotifications(userId, type)
- markAsRead(notificationId, userId)
- getUserNotifications(userId, filters)
- scheduleDigest(userId, digestType)
- respectQuietHours(userId, scheduledTime)
```

### 5. Activity Service (`backend/services/activityService.js`)

**Responsibilities:**
- Log all user actions
- Track entity changes
- Provide audit trail
- Generate activity feeds

**Key Methods:**
```javascript
- logActivity(userId, actionType, entityType, entityId, description, changes, metadata)
- getActivityFeed(filters)
- getEntityActivity(entityType, entityId)
- getUserActivity(userId)
- getProjectActivity(projectId)
```

---

## Backend API Routes

### Comments API (`backend/routes/comments.js`)

```javascript
POST   /api/comments              // Create comment
GET    /api/comments              // Get comments (query: entity_type, entity_id)
GET    /api/comments/:id          // Get single comment
PUT    /api/comments/:id          // Update comment
DELETE /api/comments/:id          // Delete comment (soft)
POST   /api/comments/:id/reactions // Add reaction
DELETE /api/comments/:id/reactions/:type // Remove reaction
```

### Tasks API (`backend/routes/tasks.js`)

```javascript
POST   /api/tasks                 // Create task
GET    /api/tasks                 // Get tasks (filters: assignee, status, project, etc.)
GET    /api/tasks/:id             // Get single task
PUT    /api/tasks/:id             // Update task
DELETE /api/tasks/:id             // Delete task
POST   /api/tasks/:id/assign      // Assign task
PUT    /api/tasks/:id/status      // Update status
GET    /api/tasks/overdue         // Get overdue tasks
GET    /api/tasks/due-soon        // Get tasks due soon
```

### Permissions API (`backend/routes/permissions.js`)

```javascript
GET    /api/permissions/check     // Check permission (query: permission)
GET    /api/team                  // Get team members
POST   /api/team/invite           // Invite team member
PUT    /api/team/:userId/role     // Update role
DELETE /api/team/:userId          // Remove team member
GET    /api/permissions/roles     // Get available roles
```

### Notifications API (`backend/routes/notifications.js`)

```javascript
GET    /api/notifications         // Get user notifications
PUT    /api/notifications/:id/read // Mark as read
PUT    /api/notifications/read-all // Mark all as read
DELETE /api/notifications/:id     // Delete notification
GET    /api/notifications/unread-count // Get unread count
PUT    /api/notifications/preferences // Update preferences
```

### Activity API (`backend/routes/activity.js`)

```javascript
GET    /api/activity              // Get activity feed (filters: entity, user, date range)
GET    /api/activity/entity       // Get entity activity (query: type, id)
GET    /api/activity/user/:userId // Get user activity
GET    /api/activity/project/:projectId // Get project activity
```

---

## Frontend Components

### 1. Comment Components

**CommentThread.js**
- Display threaded comments
- Reply functionality
- Reaction UI
- Edit/delete actions
- @mention autocomplete

**CommentInput.js**
- Rich text input (light formatting)
- @mention autocomplete
- Visibility toggle (internal/client)
- Character count
- Submit/cancel actions

**CommentCard.js**
- Individual comment display
- Author info + avatar
- Timestamp
- Edit indicator
- Reaction buttons
- Thread replies (nested)

### 2. Task Components

**TaskList.js**
- Filterable task list
- Group by: status, assignee, due date
- Search and sort
- Bulk actions

**TaskCard.js**
- Task details display
- Status badge
- Priority indicator
- Due date with visual urgency
- Assignee avatar
- Quick actions

**TaskModal.js**
- Create/edit task form
- Assignment selection
- Due date picker
- Priority selection
- Entity linkage
- Description editor

**TaskBoard.js** (Kanban view)
- Columns by status
- Drag-and-drop
- Task cards
- Quick filters

### 3. Permission Components

**TeamManagement.js**
- Team member list
- Role indicators
- Invite modal
- Remove/edit actions

**RoleBadge.js**
- Visual role indicator
- Tooltip with permissions

**PermissionGate.js** (Utility component)
- Conditional rendering based on permissions
- Graceful degradation

### 4. Notification Components

**NotificationBell.js**
- Unread count badge
- Dropdown with recent notifications
- Mark all as read
- View all link

**NotificationList.js**
- Grouped by date
- Unread highlighting
- Action links
- Mark as read on click

**NotificationPreferences.js**
- Channel toggles (email, Slack, in-app)
- Quiet hours setting
- Digest preferences
- Notification types

### 5. Activity Components

**ActivityTimeline.js**
- Chronological feed
- Activity cards
- Filters (user, action, date)
- Load more pagination

**ActivityCard.js**
- Action icon
- User info
- Description
- Timestamp
- Entity link

---

## AI Integration

### AI Collaboration Assistant

**Features:**
- Thread summarization
- Blocker detection
- Follow-up recommendations
- Risk flagging
- Sentiment analysis

**Implementation:**
```javascript
// backend/services/ai/collaborationAssistant.js

summarizeThread(comments) {
  // Analyze comment thread
  // Return concise summary
}

detectBlockers(comments, tasks) {
  // Identify unresolved issues
  // Flag blockers
}

suggestFollowUps(interaction, comments) {
  // Recommend next actions
  // Return task suggestions
}

analyzeTeamSentiment(activityLog) {
  // Detect team morale
  // Flag concerns
}
```

---

## UX Design Guidelines

### Visual Style

**Cards:**
- Soft backgrounds (#f9fafb, #ffffff)
- Subtle borders (1px #e5e7eb)
- Rounded corners (8px)
- Gentle shadows (0 1px 3px rgba(0,0,0,0.06))

**Typography:**
- Headers: 600 weight
- Body: 400 weight
- Muted text: #6b7280
- Active text: #111827

**Colors:**
- Primary: #3b82f6 (blue)
- Success: #10b981 (green)
- Warning: #f59e0b (amber)
- Danger: #ef4444 (red)
- Neutral: #6b7280 (gray)

**Spacing:**
- Tight: 8px
- Normal: 16px
- Relaxed: 24px
- Loose: 32px

### Interaction Patterns

**Comments:**
- No chat bubbles
- Clean cards with author info
- Subtle threading indentation
- Gentle hover states

**Tasks:**
- Clear visual hierarchy
- Status-based color coding
- Urgency indicators (not alarmist)
- Calm due date display

**Notifications:**
- Batched when possible
- Gentle badge colors
- Clear, actionable messages
- Respectful timing

---

## Privacy & Security

### Rules

1. **Private Notes:**
   - Default: internal visibility
   - Require explicit opt-in for client-visible
   - Clear visual indicators

2. **Audit Trail:**
   - Log all critical actions
   - Store edit history
   - Allow audit review
   - Deletion leaves reference

3. **Data Protection:**
   - Encrypt sensitive fields
   - Sanitize user input
   - Validate permissions on every request
   - Rate limit API calls

4. **Access Control:**
   - Enforce role-based permissions
   - Project-level isolation
   - Feature-level gates
   - Graceful permission denials

---

## Analytics Events

### Tracking

```javascript
// Comments
comment_created
comment_edited
comment_deleted
comment_replied
mention_added
reaction_added

// Tasks
task_created
task_assigned
task_status_changed
task_completed
task_overdue

// Permissions
team_member_invited
role_changed
permission_denied

// Notifications
notification_sent
notification_read
digest_sent

// Activity
activity_viewed
timeline_filtered
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- ✅ Database schema design
- ✅ Migration scripts
- Backend service scaffolding
- Basic API routes

### Phase 2: Comments System (Week 1-2)
- Comment service implementation
- Threading logic
- @mention extraction
- Frontend components
- API integration

### Phase 3: Tasks System (Week 2)
- Task service implementation
- Assignment logic
- Status management
- Frontend components
- Kanban board

### Phase 4: Permissions (Week 3)
- Permission service
- Role templates
- Team management
- Access control middleware
- Frontend permission gates

### Phase 5: Notifications (Week 3)
- Notification service
- Email integration
- Slack integration (optional)
- Batching logic
- Quiet hours
- Frontend notification UI

### Phase 6: Activity Log (Week 4)
- Activity service
- Logging middleware
- Timeline component
- Filters and search

### Phase 7: AI Integration (Week 4)
- Thread summarization
- Blocker detection
- Follow-up suggestions
- Risk analysis

### Phase 8: Polish & Testing (Week 5)
- Edge case handling
- Performance optimization
- Security audit
- User testing
- Documentation

---

## Edge Cases & Considerations

### Threading
- Max depth limit (prevent infinite nesting)
- Collapsed threads for performance
- Load more for large threads

### Mentions
- Autocomplete debouncing
- User search optimization
- Invalid user handling

### Permissions
- Project deletion (cascade tasks/comments)
- Role changes (active task reassignment)
- User removal (orphaned content)

### Notifications
- Rate limiting (prevent spam)
- Batching threshold
- Failed delivery retry
- Quiet hour scheduling

### Tasks
- Overdue handling
- Recurring tasks (future enhancement)
- Task dependencies (future enhancement)
- Time tracking accuracy

---

## Success Metrics

### Adoption
- % of users adding comments weekly
- Avg comments per stakeholder/interaction
- @ mention usage rate

### Engagement
- Task completion rate
- Avg time to complete tasks
- Activity log views

### Collaboration Quality
- Thread depth (indicates discussion)
- Reply rate
- Reaction usage

### System Health
- Notification delivery success rate
- Permission check latency
- Activity log query performance

---

## Next Steps

1. **User Approval**: Review and approve architecture
2. **Database Setup**: Run migrations for new tables
3. **Backend Implementation**: Build services and routes
4. **Frontend Development**: Create components and integrate
5. **Testing**: Comprehensive testing of all features
6. **Deployment**: Staged rollout with monitoring

---

*This plan provides a complete blueprint for implementing a premium, calm, human-centered collaboration system for Stakeholder Radar.*
