# RBAC Implementation Examples

Real-world examples showing how to apply RBAC to your Stakeholder Radar application.

## 📁 Backend Examples

### Example 1: Complete Project Routes

```javascript
// backend/routes/projects.js
const express = require('express');
const router = express.Router();
const { verifyAuth } = require('../middleware/auth');
const {
  checkPermission,
  checkResourceOwnership,
  auditAdminAction,
} = require('../middleware/rbac');
const projectController = require('../controllers/projectController');

// List all projects (all authenticated users)
router.get('/',
  verifyAuth,
  checkPermission('project:read'),
  projectController.listProjects
);

// Get single project
router.get('/:id',
  verifyAuth,
  checkPermission('project:read'),
  projectController.getProject
);

// Create project (admin, manager)
router.post('/',
  verifyAuth,
  checkPermission('project:create'),
  projectController.createProject
);

// Update project (owner can update their own, admin/manager can update all)
router.put('/:id',
  verifyAuth,
  checkResourceOwnership('project', 'project:update'),
  projectController.updateProject
);

// Delete project (admin, manager only)
router.delete('/:id',
  verifyAuth,
  checkPermission('project:delete'),
  auditAdminAction('delete_project', 'project'),
  projectController.deleteProject
);

// Archive project (admin, manager)
router.post('/:id/archive',
  verifyAuth,
  checkPermission('project:archive'),
  projectController.archiveProject
);

module.exports = router;
```

### Example 2: Settings Routes with Multiple Permission Levels

```javascript
// backend/routes/settings.js
const express = require('express');
const router = express.Router();
const { verifyAuth } = require('../middleware/auth');
const {
  checkPermission,
  requireRole,
  auditAdminAction,
  preventRoleEscalation,
} = require('../middleware/rbac');

// Workspace settings (read-only for all)
router.get('/workspace',
  verifyAuth,
  checkPermission('settings:workspace:read'),
  getWorkspaceSettings
);

// Update workspace (admin only)
router.put('/workspace',
  verifyAuth,
  checkPermission('settings:workspace:update'),
  auditAdminAction('update_workspace', 'workspace'),
  updateWorkspaceSettings
);

// List team members (admin, manager)
router.get('/team',
  verifyAuth,
  checkPermission('settings:users:read'),
  getTeamMembers
);

// Invite user (admin, manager)
router.post('/team/invite',
  verifyAuth,
  checkPermission('settings:users:invite'),
  inviteUser
);

// Update user role (admin only)
router.put('/team/:userId/role',
  verifyAuth,
  requireRole('admin'),
  preventRoleEscalation,
  auditAdminAction('update_user_role', 'user'),
  updateUserRole
);

// Remove user (admin only)
router.delete('/team/:userId',
  verifyAuth,
  requireRole('admin'),
  preventRoleEscalation,
  auditAdminAction('remove_user', 'user'),
  removeUser
);

// Billing (admin only)
router.get('/billing',
  verifyAuth,
  checkPermission('billing:read'),
  getBilling
);

router.put('/billing',
  verifyAuth,
  checkPermission('billing:update'),
  auditAdminAction('update_billing', 'billing'),
  updateBilling
);

module.exports = router;
```

### Example 3: Controller with Manual Permission Checks

```javascript
// backend/controllers/stakeholderController.js
const { hasPermission, canAccessResource } = require('../config/permissions');
const auditService = require('../services/auditService');

class StakeholderController {
  async updateStakeholder(req, res) {
    try {
      const { id } = req.params;
      const { userId, role } = req.user;
      const updates = req.body;

      // Get stakeholder
      const stakeholder = await db.query(
        'SELECT * FROM stakeholders WHERE id = $1',
        [id]
      );

      if (!stakeholder) {
        return res.status(404).json({ error: 'Stakeholder not found' });
      }

      // Check if user can access this resource
      if (!canAccessResource(role, userId, stakeholder.owner_id, 'stakeholder:update')) {
        return res.status(403).json({
          error: 'You do not have permission to update this stakeholder',
        });
      }

      // Additional check: only admin/manager can change certain fields
      const restrictedFields = ['is_vip', 'priority_score'];
      const hasRestrictedUpdate = restrictedFields.some(field => field in updates);

      if (hasRestrictedUpdate && !hasPermission(role, 'stakeholder:manage_priority')) {
        return res.status(403).json({
          error: 'Only admins and managers can update priority fields',
        });
      }

      // Perform update
      const updated = await db.query(
        'UPDATE stakeholders SET name = $1, email = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [updates.name, updates.email, id]
      );

      // Audit log for sensitive changes
      if (hasRestrictedUpdate) {
        await auditService.log(
          userId,
          'stakeholder_priority_updated',
          id,
          req.clientIP,
          { fields_updated: restrictedFields }
        );
      }

      res.json(updated);
    } catch (error) {
      console.error('Update stakeholder error:', error);
      res.status(500).json({ error: 'Failed to update stakeholder' });
    }
  }
}

module.exports = new StakeholderController();
```

### Example 4: Custom Permission Middleware

```javascript
// backend/middleware/customPermissions.js
const { hasPermission } = require('../config/permissions');

/**
 * Check if user owns the resource OR has admin permission
 */
function requireOwnershipOrAdmin(resourceType) {
  return async (req, res, next) => {
    const { userId, role } = req.user;
    const resourceId = req.params.id;

    // Admin bypasses ownership check
    if (role === 'admin') {
      return next();
    }

    // Get resource owner
    const query = `SELECT owner_id FROM ${resourceType}s WHERE id = $1`;
    const result = await db.query(query, [resourceId]);

    if (!result || result.owner_id !== userId) {
      return res.status(403).json({
        error: 'You can only modify your own resources',
      });
    }

    next();
  };
}

/**
 * Check if user is in the same workspace
 */
function requireSameWorkspace(req, res, next) {
  const { workspaceId } = req.user;
  const targetWorkspaceId = req.params.workspaceId || req.body.workspaceId;

  if (workspaceId !== targetWorkspaceId) {
    return res.status(403).json({
      error: 'Cannot access resources from other workspaces',
    });
  }

  next();
}

module.exports = {
  requireOwnershipOrAdmin,
  requireSameWorkspace,
};
```

---

## 🎨 Frontend Examples

### Example 1: Dashboard with Role-Based Widgets

```javascript
// frontend/src/pages/Dashboard.js
import React from 'react';
import { usePermission } from '../hooks/usePermission';
import { RoleGate, PermissionGate } from '../components/PermissionGate';

export default function Dashboard() {
  const { role, can } = usePermission();

  return (
    <div className="dashboard">
      <header>
        <h1>Dashboard</h1>
        <span className="role-badge">{role}</span>
      </header>

      {/* Everyone sees their own stats */}
      <section className="my-stats">
        <StatCard title="My Projects" value={12} />
        <StatCard title="My Stakeholders" value={45} />
        <StatCard title="Recent Interactions" value={8} />
      </section>

      {/* Managers and Admins see team stats */}
      <RoleGate roles={['admin', 'manager']}>
        <section className="team-stats">
          <h2>Team Overview</h2>
          <StatCard title="Team Projects" value={48} />
          <StatCard title="Team Members" value={6} />
          <StatCard title="Total Stakeholders" value={234} />
        </section>
      </RoleGate>

      {/* Admins see system health */}
      <PermissionGate permission="security:audit_logs">
        <section className="system-health">
          <h2>System Health</h2>
          <HealthIndicator />
        </section>
      </PermissionGate>

      {/* Quick actions based on permissions */}
      <section className="quick-actions">
        <h2>Quick Actions</h2>

        <PermissionGate permission="project:create">
          <QuickActionButton icon="plus" onClick={createProject}>
            New Project
          </QuickActionButton>
        </PermissionGate>

        <PermissionGate permission="stakeholder:create">
          <QuickActionButton icon="user-plus" onClick={addStakeholder}>
            Add Stakeholder
          </QuickActionButton>
        </PermissionGate>

        <PermissionGate permission="report:export">
          <QuickActionButton icon="download" onClick={exportReport}>
            Export Report
          </QuickActionButton>
        </PermissionGate>
      </section>
    </div>
  );
}
```

### Example 2: Project Card with Contextual Actions

```javascript
// frontend/src/components/ProjectCard.js
import React from 'react';
import { usePermission } from '../hooks/usePermission';
import { ProtectedActionMenu, ProtectedButton } from '../components/ProtectedButton';
import { ResourceGate } from '../components/PermissionGate';

export default function ProjectCard({ project }) {
  const { can, userId } = usePermission();
  const isOwner = project.owner_id === userId;

  const actions = [
    {
      label: 'Edit',
      permission: 'project:update',
      onClick: () => editProject(project.id),
      icon: 'edit',
    },
    {
      label: 'Share',
      permission: 'project:read',
      onClick: () => shareProject(project.id),
      icon: 'share',
    },
    {
      label: 'Archive',
      permission: 'project:archive',
      onClick: () => archiveProject(project.id),
      icon: 'archive',
    },
    {
      label: 'Delete',
      permission: 'project:delete',
      onClick: () => deleteProject(project.id),
      icon: 'trash',
    },
  ];

  return (
    <div className="project-card">
      <div className="project-header">
        <h3>{project.name}</h3>
        {isOwner && <span className="owner-badge">Owner</span>}
      </div>

      <p className="project-description">{project.description}</p>

      <div className="project-stats">
        <span>{project.stakeholder_count} stakeholders</span>
        <span>{project.interaction_count} interactions</span>
      </div>

      <div className="project-actions">
        {/* Show action menu with filtered actions */}
        <ProtectedActionMenu actions={actions} />

        {/* Owner-only actions */}
        <ResourceGate ownerId={project.owner_id}>
          <ProtectedButton
            permission="project:update"
            onClick={() => transferOwnership(project.id)}
            className="btn-sm"
          >
            Transfer Ownership
          </ProtectedButton>
        </ResourceGate>
      </div>
    </div>
  );
}
```

### Example 3: Settings Page with Tabs

```javascript
// frontend/src/pages/SettingsPage.js
import React, { useState } from 'react';
import { usePermission } from '../hooks/usePermission';
import { PermissionGate, RoleGate } from '../components/PermissionGate';

export default function SettingsPage() {
  const { can, is } = usePermission();
  const [activeTab, setActiveTab] = useState('profile');

  // Build tabs based on permissions
  const tabs = [
    { id: 'profile', label: 'Profile', show: true },
    { id: 'workspace', label: 'Workspace', show: can('settings:workspace:read') },
    { id: 'team', label: 'Team', show: is('admin', 'manager') },
    { id: 'billing', label: 'Billing', show: can('billing:read') },
    { id: 'security', label: 'Security', show: is('admin') },
  ].filter(tab => tab.show);

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'profile' && <ProfileSettings />}

        {activeTab === 'workspace' && (
          <PermissionGate permission="settings:workspace:read">
            <WorkspaceSettings />
          </PermissionGate>
        )}

        {activeTab === 'team' && (
          <RoleGate roles={['admin', 'manager']}>
            <TeamSettings />
          </RoleGate>
        )}

        {activeTab === 'billing' && (
          <PermissionGate permission="billing:read">
            <BillingSettings />
          </PermissionGate>
        )}

        {activeTab === 'security' && (
          <RoleGate roles={['admin']}>
            <SecuritySettings />
          </RoleGate>
        )}
      </div>
    </div>
  );
}
```

### Example 4: Team Management with Role Assignment

```javascript
// frontend/src/components/TeamMemberList.js
import React from 'react';
import { usePermission } from '../hooks/usePermission';
import { ProtectedButton } from '../components/ProtectedButton';
import { getRoleBadgeColor, getRoleDisplayName } from '../utils/permissions';

export default function TeamMemberList({ members }) {
  const { can, is, userId } = usePermission();

  const canManageRoles = can('settings:users:update_roles');
  const canRemoveUsers = can('settings:users:remove');

  return (
    <div className="team-member-list">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
            {canManageRoles && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {members.map(member => (
            <tr key={member.id}>
              <td>{member.name}</td>
              <td>{member.email}</td>
              <td>
                <span
                  className="role-badge"
                  style={{ background: getRoleBadgeColor(member.role) }}
                >
                  {getRoleDisplayName(member.role)}
                </span>
              </td>
              <td>{new Date(member.joined_at).toLocaleDateString()}</td>

              {canManageRoles && (
                <td className="actions">
                  {/* Can't change own role */}
                  {member.id !== userId && (
                    <>
                      <ProtectedButton
                        permission="settings:users:update_roles"
                        onClick={() => changeRole(member.id)}
                        mode="disable"
                        className="btn-sm"
                      >
                        Change Role
                      </ProtectedButton>

                      <ProtectedButton
                        permission="settings:users:remove"
                        onClick={() => removeMember(member.id)}
                        mode="hide"
                        className="btn-sm btn-danger"
                      >
                        Remove
                      </ProtectedButton>
                    </>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Example 5: Navigation with Permission Filtering

```javascript
// frontend/src/components/Sidebar.js
import React from 'react';
import { NavLink } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';
import { ROLES } from '../utils/permissions';

export default function Sidebar() {
  const { role, can, canAccessRoute } = usePermission();

  const navItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: 'home',
      show: true,
    },
    {
      path: '/projects',
      label: 'Projects',
      icon: 'folder',
      show: can('project:read'),
    },
    {
      path: '/stakeholders',
      label: 'Stakeholders',
      icon: 'users',
      show: can('stakeholder:read'),
    },
    {
      path: '/interactions',
      label: 'Interactions',
      icon: 'message-circle',
      show: can('interaction:read'),
    },
    {
      path: '/reports',
      label: 'Reports',
      icon: 'bar-chart',
      show: can('report:read'),
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: 'settings',
      show: can('settings:workspace:read'),
      children: [
        {
          path: '/settings/profile',
          label: 'Profile',
          show: true,
        },
        {
          path: '/settings/workspace',
          label: 'Workspace',
          show: can('settings:workspace:read'),
        },
        {
          path: '/settings/team',
          label: 'Team',
          show: can('settings:users:read'),
        },
        {
          path: '/settings/billing',
          label: 'Billing',
          show: can('billing:read'),
        },
        {
          path: '/settings/security',
          label: 'Security',
          show: role === ROLES.ADMIN,
        },
      ],
    },
  ];

  // Filter items based on permissions
  const visibleItems = navItems
    .filter(item => item.show && canAccessRoute(item.path))
    .map(item => ({
      ...item,
      children: item.children?.filter(child => child.show && canAccessRoute(child.path)),
    }));

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h2>Stakeholder Radar</h2>
      </div>

      <ul className="nav-items">
        {visibleItems.map(item => (
          <li key={item.path}>
            <NavLink to={item.path} className="nav-link">
              <i className={`icon-${item.icon}`} />
              <span>{item.label}</span>
            </NavLink>

            {item.children && item.children.length > 0 && (
              <ul className="sub-nav">
                {item.children.map(child => (
                  <li key={child.path}>
                    <NavLink to={child.path} className="sub-nav-link">
                      {child.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      {/* Role indicator */}
      <div className="sidebar-footer">
        <span className="current-role">
          {getRoleDisplayName(role)}
        </span>
      </div>
    </nav>
  );
}
```

### Example 6: Inline Permission Checks in Forms

```javascript
// frontend/src/components/StakeholderForm.js
import React from 'react';
import { usePermission } from '../hooks/usePermission';
import { PermissionGate } from '../components/PermissionGate';

export default function StakeholderForm({ stakeholder, onSubmit }) {
  const { can, is } = usePermission();

  const [formData, setFormData] = React.useState({
    name: stakeholder?.name || '',
    email: stakeholder?.email || '',
    engagement: stakeholder?.engagement || 'medium',
    isVIP: stakeholder?.is_vip || false,
    notes: stakeholder?.notes || '',
  });

  return (
    <form onSubmit={onSubmit}>
      {/* Basic fields - all can edit */}
      <div className="form-group">
        <label>Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label>Email *</label>
        <input
          type="email"
          value={formData.email}
          onChange={e => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      {/* Engagement level - only managers/admins can change */}
      <div className="form-group">
        <label>Engagement Level</label>
        <select
          value={formData.engagement}
          onChange={e => setFormData({ ...formData, engagement: e.target.value })}
          disabled={!is('admin', 'manager')}
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {!is('admin', 'manager') && (
          <small className="help-text">
            Only Managers and Admins can change engagement level
          </small>
        )}
      </div>

      {/* VIP checkbox - admin only */}
      <PermissionGate permission="stakeholder:manage_vip">
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={formData.isVIP}
              onChange={e => setFormData({ ...formData, isVIP: e.target.checked })}
            />
            Mark as VIP
          </label>
        </div>
      </PermissionGate>

      {/* Notes - all can edit */}
      <div className="form-group">
        <label>Notes</label>
        <textarea
          value={formData.notes}
          onChange={e => setFormData({ ...formData, notes: e.target.value })}
          rows={4}
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">
          Save Stakeholder
        </button>
      </div>
    </form>
  );
}
```

---

## 🔍 Advanced Patterns

### Pattern 1: Dynamic Permission Loading

```javascript
// Load permissions from API instead of hardcoding
function useDynamicPermissions() {
  const [permissions, setPermissions] = React.useState({});

  React.useEffect(() => {
    fetch('/api/permissions/matrix')
      .then(res => res.json())
      .then(data => setPermissions(data));
  }, []);

  return permissions;
}
```

### Pattern 2: Permission Caching

```javascript
// Cache permission checks to avoid repeated calculations
const permissionCache = new Map();

function hasPermissionCached(role, permission) {
  const key = `${role}:${permission}`;

  if (permissionCache.has(key)) {
    return permissionCache.get(key);
  }

  const result = hasPermission(role, permission);
  permissionCache.set(key, result);
  return result;
}
```

### Pattern 3: Bulk Permission Checks

```javascript
// Check multiple permissions at once
function checkBulkPermissions(role, permissions) {
  return permissions.reduce((acc, permission) => {
    acc[permission] = hasPermission(role, permission);
    return acc;
  }, {});
}

// Usage
const permissions = checkBulkPermissions('manager', [
  'project:create',
  'project:delete',
  'stakeholder:create',
]);

if (permissions['project:create']) {
  // Show create button
}
```

---

## 🎯 Best Practices

1. **Always check permissions on both frontend AND backend**
2. **Use semantic permission names** (e.g., `project:create` not `canCreateProject`)
3. **Prefer PermissionGate over inline checks** for cleaner JSX
4. **Use mode="hide"** for sensitive actions, **mode="disable"** for UX clarity
5. **Log all admin actions** for audit trail
6. **Prevent role escalation** - users can't promote themselves
7. **Use resource ownership** for user-created content
8. **Test with all roles** during development

---

## 📝 Checklist

Before deploying RBAC:

- [ ] Database schema updated with `role` and `owner_id` columns
- [ ] Backend routes protected with appropriate middleware
- [ ] Frontend components use permission hooks/gates
- [ ] Navigation filtered based on permissions
- [ ] Admin actions logged for audit
- [ ] Role escalation prevented
- [ ] All roles tested (Admin, Manager, Contributor, Viewer)
- [ ] Error pages created (403 Access Denied)
- [ ] Documentation updated with new permissions

---

## 🚀 Quick Start Checklist

To add RBAC to a new feature:

1. **Define permissions** in `backend/config/permissions.js`
2. **Protect backend routes** with `checkPermission()` middleware
3. **Wrap frontend components** with `<PermissionGate>`
4. **Use `<ProtectedButton>`** for actions
5. **Test with different roles**
