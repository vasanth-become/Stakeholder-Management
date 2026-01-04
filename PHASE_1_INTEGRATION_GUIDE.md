# Phase 1 Integration Guide
## Comments & Notifications System

This guide shows you how to integrate the comments and notifications system into your existing pages.

---

## Prerequisites

### 1. Run Database Migrations

First, run the PostgreSQL migrations:

```bash
# Set your PostgreSQL connection string
export DATABASE_URL="postgresql://username:password@localhost:5432/stakeholder_radar"

# Run migrations
node backend/database/runMigrations.js
```

### 2. Start Backend Server

Make sure your backend server is running and can connect to PostgreSQL:

```bash
cd backend
npm start
```

---

## Integration Examples

### 1. Add Comments to Stakeholder Detail Page

```javascript
// In frontend/src/pages/StakeholderDetail.js

import CommentThread from '../components/CommentThread';

function StakeholderDetail() {
  const { id } = useParams();

  return (
    <div className="stakeholder-detail">
      {/* Existing stakeholder content */}

      {/* Add Comments Section */}
      <CommentThread
        entityType="stakeholder"
        entityId={id}
        title="Team Discussion"
      />
    </div>
  );
}
```

### 2. Add Comments to Interaction Detail Page

```javascript
// In frontend/src/pages/InteractionDetail.js

import CommentThread from '../components/CommentThread';

function InteractionDetail() {
  const { id } = useParams();

  return (
    <div className="interaction-detail">
      {/* Existing interaction content */}

      {/* Add Comments Section */}
      <CommentThread
        entityType="interaction"
        entityId={id}
        title="Follow-up Discussion"
      />
    </div>
  );
}
```

### 3. Add Notification Bell to Navigation

```javascript
// In frontend/src/components/Navigation.js or Header.js

import NotificationBell from '../components/NotificationBell';

function Navigation() {
  return (
    <nav className="navigation">
      <div className="nav-left">
        {/* Logo, menu items, etc. */}
      </div>

      <div className="nav-right">
        {/* Add Notification Bell */}
        <NotificationBell />

        {/* User menu, etc. */}
      </div>
    </nav>
  );
}
```

### 4. Add Comments to Project Overview

```javascript
// In frontend/src/pages/ProjectOverview.js

import CommentThread from '../components/CommentThread';

function ProjectOverview() {
  const { projectId } = useParams();

  return (
    <div className="project-overview">
      {/* Existing project content */}

      {/* Add Comments Section */}
      <CommentThread
        entityType="project"
        entityId={projectId}
        title="Project Discussion"
      />
    </div>
  );
}
```

---

## Component API Reference

### CommentThread

**Props:**
- `entityType` (required): Type of entity - "stakeholder", "interaction", "project", "task"
- `entityId` (required): ID of the entity (number or string)
- `currentUserId` (optional): Current user's UUID (defaults to mock ID)
- `title` (optional): Section title (defaults to "Comments")

**Example:**
```javascript
<CommentThread
  entityType="stakeholder"
  entityId={123}
  currentUserId={user.id}
  title="Team Discussion"
/>
```

### NotificationBell

**Props:** None - component is self-contained

**Features:**
- Displays unread notification count
- Auto-refreshes every 30 seconds
- Dropdown with recent notifications
- Click notification to navigate to related entity
- Mark all as read functionality

**Example:**
```javascript
<NotificationBell />
```

### CommentCard

**Props:**
- `comment` (required): Comment object from API
- `onReply` (optional): Callback when replying
- `onUpdate` (optional): Callback when comment updated
- `onDelete` (optional): Callback when comment deleted
- `currentUserId` (required): Current user's UUID
- `depth` (optional): Nesting depth (0-3)

**Note:** Usually you don't use this directly - use `CommentThread` instead.

---

## Styling Integration

The components use their own CSS files, but they respect your design system:

**Colors used:**
- Primary: `#3b82f6` (blue)
- Background: `#f9fafb` (light gray)
- Border: `#e5e7eb` (gray)
- Text: `#111827` (dark)
- Muted: `#6b7280` (medium gray)

If you want to override, add CSS in your global styles:

```css
/* In your App.css or index.css */
.comment-thread {
  --primary-color: #your-brand-color;
}

.notification-bell-button {
  /* Your overrides */
}
```

---

## Authentication Integration

Currently, components use a mock user ID. To integrate with your auth system:

### Option 1: Pass currentUserId prop

```javascript
import { useAuth } from '../contexts/AuthContext'; // Your auth context

function MyPage() {
  const { user } = useAuth();

  return (
    <CommentThread
      entityType="stakeholder"
      entityId={123}
      currentUserId={user.id} // Pass real user ID
    />
  );
}
```

### Option 2: Update default in components

Edit `CommentThread.js` and `CommentCard.js` to use your auth context:

```javascript
import { useAuth } from '../contexts/AuthContext';

function CommentThread({ entityType, entityId }) {
  const { user } = useAuth();
  const currentUserId = user?.id || 'default-id';

  // Rest of component...
}
```

---

## API Endpoints Used

The components make requests to these endpoints:

**Comments:**
- `GET /api/comments?entity_type=X&entity_id=Y`
- `POST /api/comments`
- `PUT /api/comments/:id`
- `DELETE /api/comments/:id`
- `POST /api/comments/:id/reactions`
- `DELETE /api/comments/:id/reactions/:type`

**Notifications:**
- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `PUT /api/notifications/:id/read`
- `PUT /api/notifications/read-all`

Make sure your backend is running and these routes are accessible!

---

## Testing

### 1. Test Comments

1. Navigate to a stakeholder or interaction page
2. Click "+ Add Comment"
3. Type a comment and click "Comment"
4. Try replying to your comment
5. Try editing your comment
6. Try adding reactions (👍 🙂 ⚠️ 🎉)

### 2. Test Notifications

1. Have two browser windows (or incognito) with different users
2. User A creates a comment and @mentions User B
3. User B should see notification count increase
4. User B clicks bell to see notification
5. Clicking notification navigates to the entity

### 3. Test Threading

1. Create a root comment
2. Reply to it
3. Reply to the reply
4. Verify indentation shows thread structure

---

## Troubleshooting

### "Cannot connect to backend"

- Check `DATABASE_URL` environment variable
- Verify PostgreSQL is running
- Check backend server logs

### "Comments not loading"

- Open browser dev console (F12)
- Check Network tab for API errors
- Verify entity_type and entity_id are correct

### "Notifications not appearing"

- Check PostgreSQL connection
- Verify notification service is creating notifications
- Check browser console for errors

### "Styling looks wrong"

- Ensure CSS files are imported
- Check for CSS conflicts with existing styles
- Verify CSS class names aren't being overridden

---

## Next Steps

After integrating Phase 1, you can:

1. **Customize styling** to match your brand
2. **Add @mention autocomplete** (requires user search API)
3. **Integrate email notifications** (requires email service)
4. **Add Slack notifications** (requires Slack integration)
5. **Move to Phase 2** (Tasks system)

---

## Support

If you encounter issues:

1. Check backend logs for errors
2. Check browser console for frontend errors
3. Verify database migrations ran successfully
4. Ensure PostgreSQL connection is working

Refer to `COLLABORATION_SYSTEM_PLAN.md` for complete architecture details.
