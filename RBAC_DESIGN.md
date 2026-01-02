# Role-Based Access Control (RBAC) Design

## 🎭 Roles Overview

### Admin (Full Control)
- Complete system access
- User management
- Workspace settings
- Billing & subscription
- Security settings
- All resource permissions

### Manager (Project Leadership)
- Create & manage projects
- Full stakeholder access
- View all reports
- Team collaboration
- No system settings access

### Contributor (Active Participation)
- View projects
- Add/edit stakeholders
- Log interactions
- View reports
- No project creation/deletion

### Viewer (Read-Only)
- View projects
- View stakeholders
- View reports
- No modifications allowed

## 📋 Permissions Matrix

| Resource | Action | Admin | Manager | Contributor | Viewer |
|----------|--------|-------|---------|-------------|--------|
| **PROJECTS** |
| Create | ✅ | ✅ | ❌ | ❌ |
| View Own | ✅ | ✅ | ✅ | ✅ |
| View All | ✅ | ✅ | ✅ | ✅ |
| Edit | ✅ | ✅ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ |
| Archive | ✅ | ✅ | ❌ | ❌ |
| **STAKEHOLDERS** |
| Create | ✅ | ✅ | ✅ | ❌ |
| View | ✅ | ✅ | ✅ | ✅ |
| Edit | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ |
| Change Risk Score | ✅ | ✅ | ✅ | ❌ |
| **INTERACTIONS** |
| Create | ✅ | ✅ | ✅ | ❌ |
| View | ✅ | ✅ | ✅ | ✅ |
| Edit Own | ✅ | ✅ | ✅ | ❌ |
| Edit All | ✅ | ✅ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ |
| **REPORTS** |
| View | ✅ | ✅ | ✅ | ✅ |
| Export CSV | ✅ | ✅ | ✅ | ❌ |
| Export PDF | ✅ | ✅ | ✅ | ❌ |
| View Analytics | ✅ | ✅ | ✅ | ✅ |
| **SETTINGS** |
| View Workspace | ✅ | ✅ | ✅ | ✅ |
| Edit Workspace | ✅ | ❌ | ❌ | ❌ |
| View Users | ✅ | ✅ | ❌ | ❌ |
| Invite Users | ✅ | ✅ | ❌ | ❌ |
| Edit User Roles | ✅ | ❌ | ❌ | ❌ |
| Remove Users | ✅ | ❌ | ❌ | ❌ |
| **BILLING** |
| View Billing | ✅ | ❌ | ❌ | ❌ |
| Update Plan | ✅ | ❌ | ❌ | ❌ |
| Manage Payment | ✅ | ❌ | ❌ | ❌ |
| **SECURITY** |
| Audit Logs | ✅ | ❌ | ❌ | ❌ |
| Security Settings | ✅ | ❌ | ❌ | ❌ |
| API Keys | ✅ | ✅ | ❌ | ❌ |
| **INTEGRATIONS** |
| View | ✅ | ✅ | ✅ | ✅ |
| Connect | ✅ | ✅ | ❌ | ❌ |
| Disconnect | ✅ | ✅ | ❌ | ❌ |

## 🔑 Permission Codes

```javascript
{
  // Projects
  'project:create': ['admin', 'manager'],
  'project:read': ['admin', 'manager', 'contributor', 'viewer'],
  'project:update': ['admin', 'manager'],
  'project:delete': ['admin', 'manager'],
  'project:archive': ['admin', 'manager'],

  // Stakeholders
  'stakeholder:create': ['admin', 'manager', 'contributor'],
  'stakeholder:read': ['admin', 'manager', 'contributor', 'viewer'],
  'stakeholder:update': ['admin', 'manager', 'contributor'],
  'stakeholder:delete': ['admin', 'manager'],

  // Interactions
  'interaction:create': ['admin', 'manager', 'contributor'],
  'interaction:read': ['admin', 'manager', 'contributor', 'viewer'],
  'interaction:update': ['admin', 'manager', 'contributor'],
  'interaction:delete': ['admin', 'manager'],

  // Reports
  'report:read': ['admin', 'manager', 'contributor', 'viewer'],
  'report:export': ['admin', 'manager', 'contributor'],

  // Settings
  'settings:workspace:read': ['admin', 'manager', 'contributor', 'viewer'],
  'settings:workspace:update': ['admin'],
  'settings:users:read': ['admin', 'manager'],
  'settings:users:invite': ['admin', 'manager'],
  'settings:users:update_roles': ['admin'],
  'settings:users:remove': ['admin'],

  // Billing
  'billing:read': ['admin'],
  'billing:update': ['admin'],

  // Security
  'security:audit_logs': ['admin'],
  'security:settings': ['admin'],

  // Integrations
  'integration:read': ['admin', 'manager', 'contributor', 'viewer'],
  'integration:manage': ['admin', 'manager'],
}
```

## 🏗️ Permission Architecture

```
User Request
    ↓
JWT Token (includes role)
    ↓
Extract Role from Token
    ↓
Check Permission (resource:action)
    ↓
Permission Granted? → Allow/Deny
    ↓
Log if Admin Action
```

## 🛡️ Resource Ownership

### Ownership Rules
- **Projects**: Created by = Owner
- **Stakeholders**: Project owner = Owner
- **Interactions**: Logged by = Owner

### Permission Modifiers
1. **Own**: Can only access resources they created
2. **Team**: Can access resources in their projects
3. **All**: Can access all resources (Admin only)

Example:
- Contributor can edit **own** stakeholders
- Manager can edit **team** stakeholders
- Admin can edit **all** stakeholders

## 📊 Permission Hierarchy

```
Admin (4)
  ↓
Manager (3)
  ↓
Contributor (2)
  ↓
Viewer (1)
```

Higher roles inherit permissions from lower roles.

## 🔒 Special Permissions

### Admin-Only Actions (Always Logged)
- Change user roles
- Delete users
- Update workspace settings
- View audit logs
- Access billing
- Change security settings
- Delete projects with stakeholders
- Bulk operations

### Manager Privileges
- Invite team members
- Archive projects
- Generate API keys
- Export all reports
- Manage integrations

### Contributor Limits
- Can't delete anything
- Can't change project settings
- Can't invite users
- Can only edit own content

### Viewer Restrictions
- Read-only access
- No modifications
- No exports (optional)
- No team management

## 🎨 UI Visibility Rules

### Navigation
```javascript
{
  '/dashboard': ['admin', 'manager', 'contributor', 'viewer'],
  '/projects': ['admin', 'manager', 'contributor', 'viewer'],
  '/reports': ['admin', 'manager', 'contributor', 'viewer'],
  '/settings': ['admin', 'manager', 'contributor', 'viewer'],
  '/settings/team': ['admin', 'manager'],
  '/settings/billing': ['admin'],
  '/settings/security': ['admin'],
}
```

### Buttons/Actions
```javascript
{
  '+ New Project': ['admin', 'manager'],
  '+ Add Stakeholder': ['admin', 'manager', 'contributor'],
  'Edit': ['admin', 'manager', 'contributor'], // context-dependent
  'Delete': ['admin', 'manager'],
  'Export PDF': ['admin', 'manager', 'contributor'],
  'Invite User': ['admin', 'manager'],
}
```

## 📝 Audit Logging

### Actions to Log
```javascript
{
  // Admin actions (always log)
  'admin:user_role_changed',
  'admin:user_deleted',
  'admin:workspace_settings_changed',
  'admin:security_settings_changed',
  'admin:billing_updated',

  // Manager actions (log when significant)
  'manager:project_deleted',
  'manager:user_invited',
  'manager:project_archived',

  // All users (log critical actions)
  'user:stakeholder_deleted',
  'user:project_created',
  'user:export_generated',
}
```

### Audit Log Entry
```javascript
{
  id: 'uuid',
  user_id: 'uuid',
  user_role: 'admin',
  action: 'admin:user_role_changed',
  resource_type: 'user',
  resource_id: 'uuid',
  changes: {
    old_role: 'viewer',
    new_role: 'manager',
  },
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0...',
  timestamp: '2024-01-01T00:00:00Z',
}
```

## 🔄 Role Change Workflow

```
1. Admin initiates role change
   ↓
2. Validate new role (admin can't demote themselves)
   ↓
3. Check if target user has critical resources
   ↓
4. Confirm role change
   ↓
5. Update user role in database
   ↓
6. Revoke all refresh tokens (force re-login)
   ↓
7. Log audit event
   ↓
8. Send email notification to user
```

## 🚫 Access Denied Responses

### Backend (API)
```javascript
{
  "error": "Insufficient permissions",
  "code": "FORBIDDEN",
  "required": "project:delete",
  "current_role": "contributor",
  "allowed_roles": ["admin", "manager"]
}
```

### Frontend (UI)
- Hide buttons/links user can't access
- Show disabled state with tooltip
- Redirect to 403 page if direct access attempted
- Display friendly error message

## 📚 Implementation Checklist

### Backend
- [x] Permission definitions
- [x] RBAC middleware
- [x] Role validation
- [x] Resource ownership checks
- [x] Audit logging for admin actions
- [ ] Role change API endpoint
- [ ] Permission check helper functions

### Frontend
- [ ] Permission hook (usePermission)
- [ ] Permission component wrapper
- [ ] Role-based navigation
- [ ] Conditional rendering
- [ ] Button state management
- [ ] Access denied page

### Database
- [ ] Add role column to users table
- [ ] Create user_roles table (for multi-role)
- [ ] Add owner_id to resources
- [ ] Create permissions table (optional)

### Testing
- [ ] Permission matrix tests
- [ ] RBAC middleware tests
- [ ] Role escalation prevention
- [ ] Ownership validation tests
- [ ] UI visibility tests

## 🔐 Security Considerations

### Anti-Patterns to Avoid
❌ Checking permissions in frontend only (always validate on backend)
❌ Hardcoding role names in multiple places
❌ Allowing horizontal privilege escalation
❌ Not logging admin actions
❌ No ownership validation

### Best Practices
✅ Always check permissions on backend
✅ Use centralized permission definitions
✅ Validate resource ownership
✅ Log all admin actions
✅ Use principle of least privilege
✅ Regular permission audits

## 🎯 Example Scenarios

### Scenario 1: Contributor tries to delete project
```
Request: DELETE /api/projects/123
User Role: contributor
Required: project:delete
Result: 403 Forbidden
Logged: No (expected behavior)
```

### Scenario 2: Manager invites new user
```
Request: POST /api/users/invite
User Role: manager
Required: settings:users:invite
Result: 200 OK
Logged: Yes (manager action)
```

### Scenario 3: Admin changes user role
```
Request: PATCH /api/users/456/role
User Role: admin
Required: settings:users:update_roles
Result: 200 OK
Logged: Yes (admin action)
Notification: Email sent to user
```

### Scenario 4: Viewer tries to edit stakeholder
```
Request: PATCH /api/stakeholders/789
User Role: viewer
Required: stakeholder:update
Result: 403 Forbidden
Logged: No (expected behavior)
```

## 📈 Monitoring & Analytics

### Metrics to Track
- Permission denials by role
- Most frequently denied permissions
- Admin actions frequency
- Role distribution in workspace
- Feature usage by role

### Alerts
- 🚨 Multiple permission denials from same user
- 🚨 Admin role changes
- 🚨 Unusual admin activity
- 🚨 Bulk deletions by admin
