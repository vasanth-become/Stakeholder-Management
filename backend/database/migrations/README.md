# Database Migrations

PostgreSQL migrations for the Stakeholder Radar collaboration system.

## Running Migrations

```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://user:password@localhost:5432/stakeholder_radar"

# Run migrations
node backend/database/runMigrations.js
```

## Migration Files

Migrations are executed in alphabetical order. Name format: `NNN_description.sql`

- `001_collaboration_system_phase1.sql` - Comments, reactions, notifications, activity log

## What's Included in Phase 1

### Tables Created:
- `comments` - User comments on entities with threading support
- `comment_reactions` - Reactions to comments (👍 🙂 ⚠️ 🎉)
- `notifications` - In-app and email notifications
- `notification_batches` - Digest batches
- `activity_log` - Complete audit trail

### Users Table Enhanced:
- `avatar_url` - User avatar
- `display_name` - Display name for @mentions
- `timezone` - User timezone
- `notification_preferences` - JSONB notification settings
- `quiet_hours_start/end` - Quiet hours for notifications

### Functions Created:
- `get_comment_thread(UUID)` - Recursive function to fetch entire comment threads

### Triggers:
- Auto-update `updated_at` timestamp on comments

## Rollback

Migrations are wrapped in transactions. If a migration fails, it will be rolled back automatically.

To manually rollback, you'll need to create rollback migration files that reverse the changes.
