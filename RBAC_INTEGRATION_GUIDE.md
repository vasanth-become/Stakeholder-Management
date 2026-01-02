# RBAC Integration Guide

Complete guide for integrating Role-Based Access Control into your Stakeholder Radar application.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Backend Integration](#backend-integration)
3. [Frontend Integration](#frontend-integration)
4. [Common Use Cases](#common-use-cases)
5. [Testing](#testing)
6. [Migration Guide](#migration-guide)

---

## 🚀 Quick Start

### 1. Update Database Schema

Add `role` column to users table if not exists:

```sql
-- Add role column
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'viewer';

-- Add owner_id to resources
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);
ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_owner ON stakeholders(owner_id);
CREATE INDEX IF NOT EXISTS idx_interactions_owner ON interactions(owner_id);
```

### 2. Backend Setup

Update your Express routes to use RBAC middleware:

```javascript
// server.js or app.js
const { verifyAuth } = require('./middleware/auth');
const { checkPermission, checkResourceOwnership } = require('./middleware/rbac');

// Example: Protect routes with permissions
app.get('/api/projects', verifyAuth, checkPermission('project:read'), getProjects);
app.post('/api/projects', verifyAuth, checkPermission('project:create'), createProject);
app.put('/api/projects/:id', verifyAuth, checkResourceOwnership('project', 'project:update'), updateProject);
app.delete('/api/projects/:id', verifyAuth, checkPermission('project:delete'), deleteProject);
```

### 3. Frontend Setup

Wrap your app with AuthContext (if not already):

```javascript
// src/index.js or src/App.js
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <YourApp />
    </AuthProvider>
  );
}
```

---

## 🔧 Backend Integration

### Protecting Routes

#### Basic Permission Check

```javascript
const { checkPermission } = require('./middleware/rbac');

// Only admins and managers can create projects
router.post('/projects',
  verifyAuth,
  checkPermission('project:create'),
  createProject
);
```

#### Resource Ownership Check

```javascript
const { checkResourceOwnership } = require('./middleware/rbac');

// Users can update their own stakeholders, admins/managers can update all
router.put('/stakeholders/:id',
  verifyAuth,
  checkResourceOwnership('stakeholder', 'stakeholder:update'),
  updateStakeholder
);
```

#### Role-Based Access

```javascript
const { requireRole } = require('./middleware/rbac');

// Only admins can access billing
router.get('/billing',
  verifyAuth,
  requireRole('admin'),
  getBilling
);
```

#### Multiple Permission Check (ANY)

```javascript
const { checkAnyPermission } = require('./middleware/rbac');

// Users need EITHER read OR update permission
router.get('/reports',
  verifyAuth,
  checkAnyPermission(['report:read', 'report:export']),
  getReports
);
```

#### Admin Action with Auto-Logging

```javascript
const { auditAdminAction } = require('./middleware/rbac');

// Auto-log when admin changes user roles
router.put('/users/:userId/role',
  verifyAuth,
  requireRole('admin'),
  auditAdminAction('update_user_role', 'user'),
  updateUserRole
);
```

#### Prevent Role Escalation

```javascript
const { preventRoleEscalation } = require('./middleware/rbac');

// Prevent users from changing their own role
router.put('/users/:userId/role',
  verifyAuth,
  requireRole('admin'),
  preventRoleEscalation,
  updateUserRole
);
```

### Manual Permission Checks in Controllers

```javascript
const { hasPermission, canAccessResource } = require('../config/permissions');

async function getProject(req, res) {
  const { id } = req.params;
  const { userId, role } = req.user;

  const project = await db.query('SELECT * FROM projects WHERE id = $1', [id]);

  // Check if user can access this resource
  if (!canAccessResource(role, userId, project.owner_id, 'project:read')) {
    return res.status(403).json({ error: 'Cannot access this project' });
  }

  res.json(project);
}
```

---

## 🎨 Frontend Integration

### 1. Using Hooks

#### Check Permissions

```javascript
import { usePermission } from '../hooks/usePermission';

function ProjectActions() {
  const { can, is, role } = usePermission();

  return (
    <div>
      {can('project:create') && (
        <button onClick={createProject}>Create Project</button>
      )}

      {is('admin', 'manager') && (
        <button onClick={deleteProject}>Delete Project</button>
      )}

      <p>Your role: {role}</p>
    </div>
  );
}
```

#### Require Permission

```javascript
import { useRequirePermission } from '../hooks/usePermission';

function SettingsPage() {
  // Auto-redirect to /403 if user lacks permission
  useRequirePermission('settings:workspace:update');

  return <SettingsForm />;
}
```

### 2. Using Components

#### PermissionGate

```javascript
import { PermissionGate } from '../components/PermissionGate';

function ProjectCard({ project }) {
  return (
    <div className="project-card">
      <h3>{project.name}</h3>

      <PermissionGate permission="project:update">
        <button onClick={() => editProject(project.id)}>Edit</button>
      </PermissionGate>

      <PermissionGate
        permission="project:delete"
        fallback={<span className="text-muted">Delete unavailable</span>}
      >
        <button onClick={() => deleteProject(project.id)}>Delete</button>
      </PermissionGate>
    </div>
  );
}
```

#### ProtectedButton

```javascript
import { ProtectedButton } from '../components/ProtectedButton';

function StakeholderActions({ stakeholder }) {
  return (
    <div className="actions">
      <ProtectedButton
        permission="stakeholder:update"
        onClick={() => editStakeholder(stakeholder.id)}
        mode="disable"
      >
        Edit
      </ProtectedButton>

      <ProtectedButton
        permission="stakeholder:delete"
        onClick={() => deleteStakeholder(stakeholder.id)}
        mode="hide"
        className="btn-danger"
      >
        Delete
      </ProtectedButton>
    </div>
  );
}
```

#### ProtectedRoute

```javascript
import { PermissionRoute } from '../components/ProtectedRoute';

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes - require auth */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />

      {/* Permission-based routes */}
      <Route path="/projects/new" element={
        <PermissionRoute permission="project:create">
          <CreateProject />
        </PermissionRoute>
      } />

      {/* Role-based routes */}
      <Route path="/admin" element={
        <RoleRoute roles={['admin']}>
          <AdminPanel />
        </RoleRoute>
      } />

      {/* Access denied */}
      <Route path="/403" element={<AccessDenied />} />
    </Routes>
  );
}
```

#### RoleGate

```javascript
import { RoleGate } from '../components/PermissionGate';

function Navigation() {
  return (
    <nav>
      <a href="/dashboard">Dashboard</a>
      <a href="/projects">Projects</a>

      <RoleGate roles={['admin', 'manager']}>
        <a href="/settings/team">Team Management</a>
      </RoleGate>

      <RoleGate roles={['admin']}>
        <a href="/settings/billing">Billing</a>
      </RoleGate>
    </nav>
  );
}
```

#### ProtectedActionMenu

```javascript
import { ProtectedActionMenu } from '../components/ProtectedButton';

function ProjectMenu({ project }) {
  const actions = [
    {
      label: 'Edit',
      permission: 'project:update',
      onClick: () => editProject(project.id),
      icon: 'edit',
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

  return <ProtectedActionMenu actions={actions} />;
}
```

---

## 💡 Common Use Cases

### Use Case 1: Project CRUD with Permissions

**Backend:**

```javascript
// routes/projects.js
const { verifyAuth } = require('../middleware/auth');
const { checkPermission, checkResourceOwnership } = require('../middleware/rbac');

// List projects (all roles)
router.get('/', verifyAuth, checkPermission('project:read'), listProjects);

// Create project (admin, manager)
router.post('/', verifyAuth, checkPermission('project:create'), createProject);

// Update project (owner, admin, manager)
router.put('/:id', verifyAuth, checkResourceOwnership('project', 'project:update'), updateProject);

// Delete project (admin, manager)
router.delete('/:id', verifyAuth, checkPermission('project:delete'), deleteProject);
```

**Frontend:**

```javascript
function ProjectList() {
  const { can } = usePermission();

  return (
    <div>
      <PermissionGate permission="project:create">
        <button onClick={openCreateDialog}>Create Project</button>
      </PermissionGate>

      {projects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}

function ProjectCard({ project }) {
  return (
    <div className="card">
      <h3>{project.name}</h3>

      <ProtectedActionMenu
        actions={[
          { label: 'Edit', permission: 'project:update', onClick: () => edit(project.id) },
          { label: 'Delete', permission: 'project:delete', onClick: () => del(project.id) },
        ]}
      />
    </div>
  );
}
```

### Use Case 2: Settings Page with Role Sections

**Frontend:**

```javascript
function SettingsPage() {
  const { can, is } = usePermission();

  return (
    <div className="settings">
      {/* All authenticated users */}
      <section>
        <h2>Profile Settings</h2>
        <ProfileForm />
      </section>

      {/* Admins and Managers */}
      <RoleGate roles={['admin', 'manager']}>
        <section>
          <h2>Team Management</h2>
          <TeamSettings />
        </section>
      </RoleGate>

      {/* Admins only */}
      <PermissionGate permission="settings:workspace:update">
        <section>
          <h2>Workspace Settings</h2>
          <WorkspaceSettings />
        </section>
      </PermissionGate>

      <PermissionGate permission="billing:read">
        <section>
          <h2>Billing</h2>
          <BillingSettings />
        </section>
      </PermissionGate>
    </div>
  );
}
```

### Use Case 3: Conditional Form Fields

```javascript
function StakeholderForm({ stakeholder }) {
  const { can, is } = usePermission();

  return (
    <form>
      <input name="name" defaultValue={stakeholder.name} />
      <input name="email" defaultValue={stakeholder.email} />

      {/* Only managers and admins can change engagement level */}
      {is('admin', 'manager') && (
        <select name="engagement">
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      )}

      {/* Only admins can mark as VIP */}
      <PermissionGate permission="stakeholder:manage_vip">
        <label>
          <input type="checkbox" name="isVIP" />
          Mark as VIP
        </label>
      </PermissionGate>

      <button type="submit">Save</button>
    </form>
  );
}
```

### Use Case 4: Navigation Filtering

```javascript
import { ROLES } from '../utils/permissions';

function Sidebar() {
  const { role, can, canAccessRoute } = usePermission();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'home' },
    { path: '/projects', label: 'Projects', icon: 'folder' },
    { path: '/stakeholders', label: 'Stakeholders', icon: 'users' },
    { path: '/reports', label: 'Reports', icon: 'chart' },
    { path: '/settings', label: 'Settings', icon: 'settings', requiredRole: [ROLES.ADMIN, ROLES.MANAGER] },
  ];

  const allowedItems = navItems.filter(item => {
    if (item.requiredRole && !item.requiredRole.includes(role)) {
      return false;
    }
    return canAccessRoute(item.path);
  });

  return (
    <nav>
      {allowedItems.map(item => (
        <NavLink key={item.path} to={item.path}>
          <i className={`icon-${item.icon}`} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

---

## 🧪 Testing

### Backend Tests

```javascript
const request = require('supertest');
const app = require('../app');

describe('RBAC Middleware', () => {
  describe('Project Creation', () => {
    it('should allow admin to create project', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Cookie', adminCookie)
        .send({ name: 'New Project' });

      expect(response.status).toBe(201);
    });

    it('should allow manager to create project', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Cookie', managerCookie)
        .send({ name: 'New Project' });

      expect(response.status).toBe(201);
    });

    it('should deny contributor from creating project', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Cookie', contributorCookie)
        .send({ name: 'New Project' });

      expect(response.status).toBe(403);
    });
  });
});
```

### Frontend Tests

```javascript
import { render, screen } from '@testing-library/react';
import { AuthContext } from '../contexts/AuthContext';
import ProjectActions from './ProjectActions';

describe('ProjectActions', () => {
  it('should show create button for managers', () => {
    const mockUser = { role: 'manager' };

    render(
      <AuthContext.Provider value={{ user: mockUser }}>
        <ProjectActions />
      </AuthContext.Provider>
    );

    expect(screen.getByText('Create Project')).toBeInTheDocument();
  });

  it('should hide create button for viewers', () => {
    const mockUser = { role: 'viewer' };

    render(
      <AuthContext.Provider value={{ user: mockUser }}>
        <ProjectActions />
      </AuthContext.Provider>
    );

    expect(screen.queryByText('Create Project')).not.toBeInTheDocument();
  });
});
```

---

## 🔄 Migration Guide

### For Existing Users

If you have existing users in your database:

```sql
-- Set default role for all existing users
UPDATE users SET role = 'viewer' WHERE role IS NULL;

-- Promote first user to admin
UPDATE users SET role = 'admin' WHERE id = (SELECT id FROM users ORDER BY created_at LIMIT 1);

-- Set owner_id for existing resources
UPDATE projects SET owner_id = created_by WHERE owner_id IS NULL;
UPDATE stakeholders SET owner_id = created_by WHERE owner_id IS NULL;
```

### Gradual Rollout

1. **Phase 1**: Add RBAC middleware but don't enforce (log only)
2. **Phase 2**: Enforce on new features first
3. **Phase 3**: Enforce on all routes
4. **Phase 4**: Remove old permission checks

---

## 📚 Reference

### All Available Permissions

See [RBAC_DESIGN.md](./RBAC_DESIGN.md) for complete permissions matrix.

### Quick Permission Lookup

- **Projects**: `project:create`, `project:read`, `project:update`, `project:delete`, `project:archive`
- **Stakeholders**: `stakeholder:create`, `stakeholder:read`, `stakeholder:update`, `stakeholder:delete`
- **Reports**: `report:read`, `report:export`
- **Settings**: `settings:workspace:update`, `settings:users:invite`, `settings:users:update_roles`
- **Billing**: `billing:read`, `billing:update`

### Role Capabilities

- **Admin**: Full access to everything
- **Manager**: Manage projects, stakeholders, invite users
- **Contributor**: Add/edit stakeholders and interactions
- **Viewer**: Read-only access

---

## ❓ FAQ

**Q: Can a user have multiple roles?**
A: No, each user has one role. Use permissions for fine-grained control.

**Q: How do I create custom permissions?**
A: Add them to `backend/config/permissions.js` in the PERMISSIONS object.

**Q: What happens if I check for a non-existent permission?**
A: It will return `false` and log a warning in development mode.

**Q: Can I check permissions on the frontend without backend verification?**
A: Frontend checks are for UI only. ALWAYS validate on the backend.

**Q: How do I test RBAC locally?**
A: Create test users with different roles and switch between them.

---

## 🔒 Security Reminders

- ✅ Always verify permissions on the backend
- ✅ Frontend permission checks are for UX only
- ✅ Never trust client-side role/permission data
- ✅ Log all admin actions for audit trail
- ✅ Prevent role escalation (users can't promote themselves)
- ✅ Use resource ownership checks for user-created content

---

## 🚀 Next Steps

1. Test RBAC with different user roles
2. Add custom permissions for your features
3. Implement team/workspace-level permissions
4. Add permission presets for quick role assignment
5. Create admin UI for role management
