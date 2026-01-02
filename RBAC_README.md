# RBAC (Role-Based Access Control) - Complete Implementation

Production-ready Role-Based Access Control system for Stakeholder Radar.

## 🎯 Overview

This RBAC implementation provides:
- **4 Roles**: Admin, Manager, Contributor, Viewer
- **50+ Permissions**: Granular control over all features
- **Resource Ownership**: Users can manage their own resources
- **Audit Logging**: Track all admin actions
- **Frontend & Backend**: Complete protection at all layers

## 📦 What's Included

### Documentation (4 files)
- **RBAC_DESIGN.md** - Complete design specification with permissions matrix
- **RBAC_INTEGRATION_GUIDE.md** - Step-by-step integration guide
- **RBAC_EXAMPLES.md** - Real-world usage examples
- **RBAC_README.md** - This file (quick reference)

### Backend (3 files)
- **backend/config/permissions.js** - Permission definitions and helper functions
- **backend/middleware/rbac.js** - Express middleware for route protection
- **backend/middleware/auth.js** - Authentication middleware (already exists)

### Frontend (5 files)
- **frontend/src/hooks/usePermission.js** - React hooks for permission checks
- **frontend/src/components/PermissionGate.js** - Conditional rendering components
- **frontend/src/components/ProtectedButton.js** - Permission-aware UI components
- **frontend/src/components/ProtectedRoute.js** - Route protection components
- **frontend/src/pages/AccessDenied.js** - 403 error page
- **frontend/src/utils/permissions.js** - Permission utilities (already exists)

---

## 🚀 Quick Start

### 1. Update Database

```sql
-- Add role column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'viewer';

-- Add owner columns to resources
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);
ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);

-- Create indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_projects_owner ON projects(owner_id);
```

### 2. Protect Backend Routes

```javascript
// routes/projects.js
const { verifyAuth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

router.post('/projects',
  verifyAuth,
  checkPermission('project:create'),
  createProject
);
```

### 3. Protect Frontend Components

```javascript
// components/ProjectList.js
import { PermissionGate } from '../components/PermissionGate';

function ProjectList() {
  return (
    <div>
      <PermissionGate permission="project:create">
        <button>Create Project</button>
      </PermissionGate>
    </div>
  );
}
```

---

## 👥 Roles & Permissions

### Admin
**Full system access**
- Manage all projects, stakeholders, and users
- Access billing and security settings
- View audit logs
- Assign roles to users

### Manager
**Team management**
- Create and manage projects
- Manage stakeholders and interactions
- Invite and manage team members
- View team reports

### Contributor
**Content creation**
- Add and edit stakeholders
- Create interactions
- View projects and reports
- Cannot manage users or settings

### Viewer
**Read-only access**
- View projects and stakeholders
- View reports
- Cannot create, edit, or delete anything

---

## 📚 Documentation

| File | Purpose | Audience |
|------|---------|----------|
| [RBAC_DESIGN.md](./RBAC_DESIGN.md) | Architecture & design decisions | Developers |
| [RBAC_INTEGRATION_GUIDE.md](./RBAC_INTEGRATION_GUIDE.md) | How to integrate RBAC | Developers |
| [RBAC_EXAMPLES.md](./RBAC_EXAMPLES.md) | Real-world code examples | Developers |
| RBAC_README.md | Quick reference (this file) | Everyone |

---

## 🔑 Common Permissions

### Projects
- `project:create` - Create new projects (Admin, Manager)
- `project:read` - View projects (All roles)
- `project:update` - Edit projects (Admin, Manager, Owner)
- `project:delete` - Delete projects (Admin, Manager)
- `project:archive` - Archive projects (Admin, Manager)

### Stakeholders
- `stakeholder:create` - Add stakeholders (Admin, Manager, Contributor)
- `stakeholder:read` - View stakeholders (All roles)
- `stakeholder:update` - Edit stakeholders (Admin, Manager, Contributor, Owner)
- `stakeholder:delete` - Delete stakeholders (Admin, Manager)

### Settings
- `settings:workspace:update` - Update workspace (Admin)
- `settings:users:invite` - Invite users (Admin, Manager)
- `settings:users:update_roles` - Change user roles (Admin)
- `settings:users:remove` - Remove users (Admin)

### Billing
- `billing:read` - View billing (Admin)
- `billing:update` - Update billing (Admin)

**See [RBAC_DESIGN.md](./RBAC_DESIGN.md) for complete permissions matrix**

---

## 💻 Usage Examples

### Backend

```javascript
// Protect route with permission
router.post('/projects',
  verifyAuth,
  checkPermission('project:create'),
  createProject
);

// Check resource ownership
router.put('/projects/:id',
  verifyAuth,
  checkResourceOwnership('project', 'project:update'),
  updateProject
);

// Require specific role
router.get('/admin',
  verifyAuth,
  requireRole('admin'),
  adminDashboard
);

// Audit admin actions
router.delete('/users/:id',
  verifyAuth,
  requireRole('admin'),
  auditAdminAction('delete_user', 'user'),
  deleteUser
);
```

### Frontend Hooks

```javascript
import { usePermission } from '../hooks/usePermission';

function MyComponent() {
  const { can, is, role } = usePermission();

  if (can('project:create')) {
    return <CreateButton />;
  }

  if (is('admin', 'manager')) {
    return <AdminPanel />;
  }

  return <ViewerContent />;
}
```

### Frontend Components

```javascript
import { PermissionGate } from '../components/PermissionGate';
import { ProtectedButton } from '../components/ProtectedButton';

function ProjectCard({ project }) {
  return (
    <div>
      <h3>{project.name}</h3>

      {/* Show only if permitted */}
      <PermissionGate permission="project:update">
        <button>Edit</button>
      </PermissionGate>

      {/* Disable if not permitted */}
      <ProtectedButton
        permission="project:delete"
        onClick={handleDelete}
        mode="disable"
      >
        Delete
      </ProtectedButton>
    </div>
  );
}
```

### Route Protection

```javascript
import { PermissionRoute } from '../components/ProtectedRoute';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/settings" element={
        <PermissionRoute permission="settings:workspace:read">
          <Settings />
        </PermissionRoute>
      } />

      <Route path="/admin" element={
        <RoleRoute roles={['admin']}>
          <AdminPanel />
        </RoleRoute>
      } />
    </Routes>
  );
}
```

---

## 🔒 Security Features

✅ **Multi-Layer Protection**
- Backend route protection
- Frontend UI hiding
- Resource ownership validation

✅ **Audit Logging**
- Track all admin actions
- Record permission violations
- Security event monitoring

✅ **Role Escalation Prevention**
- Users cannot promote themselves
- Strict role hierarchy enforcement
- Admin-only role management

✅ **Resource Ownership**
- Users can manage their own resources
- Admins/Managers can manage all
- Contributors have limited access

---

## 🧪 Testing

### Test with Different Roles

```bash
# Create test users with different roles
INSERT INTO users (email, role) VALUES
  ('admin@test.com', 'admin'),
  ('manager@test.com', 'manager'),
  ('contributor@test.com', 'contributor'),
  ('viewer@test.com', 'viewer');
```

### Backend Tests

```javascript
describe('RBAC', () => {
  it('should allow admin to create project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', adminCookie)
      .send({ name: 'Test' });

    expect(res.status).toBe(201);
  });

  it('should deny viewer from creating project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', viewerCookie)
      .send({ name: 'Test' });

    expect(res.status).toBe(403);
  });
});
```

### Frontend Tests

```javascript
it('should show create button for managers', () => {
  render(
    <AuthProvider value={{ user: { role: 'manager' } }}>
      <ProjectList />
    </AuthProvider>
  );

  expect(screen.getByText('Create Project')).toBeInTheDocument();
});
```

---

## 🛠️ Configuration

### Add Custom Permission

1. **Define in backend/config/permissions.js**:
```javascript
const PERMISSIONS = {
  // ... existing permissions
  'custom:action': ['admin', 'manager'],
};
```

2. **Use in middleware**:
```javascript
router.post('/custom',
  verifyAuth,
  checkPermission('custom:action'),
  customHandler
);
```

3. **Use in frontend**:
```javascript
<PermissionGate permission="custom:action">
  <CustomButton />
</PermissionGate>
```

### Add Custom Role

1. **Update ROLE_HIERARCHY in backend/config/permissions.js**:
```javascript
const ROLE_HIERARCHY = {
  viewer: 1,
  contributor: 2,
  manager: 3,
  admin: 4,
  superadmin: 5, // New role
};
```

2. **Add role to ROLES constant**:
```javascript
const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CONTRIBUTOR: 'contributor',
  VIEWER: 'viewer',
  SUPERADMIN: 'superadmin', // New role
};
```

3. **Update permissions to include new role**:
```javascript
const PERMISSIONS = {
  'project:create': ['admin', 'manager', 'superadmin'],
  // ...
};
```

---

## 📖 API Reference

### Backend Middleware

| Function | Purpose | Example |
|----------|---------|---------|
| `checkPermission(permission)` | Check single permission | `checkPermission('project:create')` |
| `checkAnyPermission(permissions)` | Check ANY permission | `checkAnyPermission(['read', 'write'])` |
| `checkResourceOwnership(type, permission)` | Check ownership | `checkResourceOwnership('project', 'project:update')` |
| `requireRole(...roles)` | Require specific role | `requireRole('admin')` |
| `auditAdminAction(action, resource)` | Log admin action | `auditAdminAction('delete', 'user')` |
| `preventRoleEscalation` | Prevent self-promotion | `preventRoleEscalation` |

### Frontend Hooks

| Hook | Purpose | Returns |
|------|---------|---------|
| `usePermission()` | Full permission API | `{ can, canAny, is, role, ... }` |
| `useHasPermission(permission)` | Check permission | `boolean` |
| `useHasRole(...roles)` | Check role | `boolean` |
| `useRequirePermission(permission)` | Require permission (redirect) | `boolean` |

### Frontend Components

| Component | Purpose | Props |
|-----------|---------|-------|
| `<PermissionGate>` | Conditional render | `permission, children, fallback` |
| `<ProtectedButton>` | Protected button | `permission, mode, onClick` |
| `<ProtectedRoute>` | Protected route | `children, redirectTo` |
| `<PermissionRoute>` | Permission-based route | `permission, children` |
| `<RoleGate>` | Role-based render | `roles, children` |

---

## 🔍 Troubleshooting

### Permission denied despite correct role

**Check:**
1. User role is set correctly in database
2. Permission name matches exactly (case-sensitive)
3. Backend route has correct middleware order
4. Frontend user context is populated

### Frontend shows button but backend rejects

**Solution:** Always verify on backend. Frontend checks are for UX only.

### Can't change own role

**Expected:** This is security feature. Only other admins can change roles.

### Audit logs not appearing

**Check:**
1. `auditAdminAction` middleware is used
2. Database has `audit_logs` table
3. `auditService` is configured correctly

---

## 📋 Migration Checklist

- [ ] Database schema updated (`role`, `owner_id` columns)
- [ ] Existing users assigned default roles
- [ ] Backend routes protected with middleware
- [ ] Frontend components use permission checks
- [ ] Navigation filtered by permissions
- [ ] Settings page restricted by role
- [ ] Admin actions logged
- [ ] All roles tested
- [ ] Documentation updated
- [ ] Team trained on new permissions

---

## 🎓 Learning Resources

1. **Start here**: [RBAC_INTEGRATION_GUIDE.md](./RBAC_INTEGRATION_GUIDE.md)
2. **See examples**: [RBAC_EXAMPLES.md](./RBAC_EXAMPLES.md)
3. **Understand design**: [RBAC_DESIGN.md](./RBAC_DESIGN.md)
4. **Quick reference**: This file

---

## 🤝 Support

**Common Questions:**
- *"How do I add a new permission?"* → See [Configuration](#configuration)
- *"How do I test with different roles?"* → See [Testing](#testing)
- *"What permissions does Manager have?"* → See [RBAC_DESIGN.md](./RBAC_DESIGN.md)

**Need Help?**
- Check the documentation files
- Review code examples
- Test with different user roles

---

## ✅ Next Steps

1. **Review** [RBAC_DESIGN.md](./RBAC_DESIGN.md) for complete architecture
2. **Follow** [RBAC_INTEGRATION_GUIDE.md](./RBAC_INTEGRATION_GUIDE.md) to integrate
3. **Reference** [RBAC_EXAMPLES.md](./RBAC_EXAMPLES.md) for implementation patterns
4. **Test** with all 4 roles
5. **Deploy** with confidence

---

## 🎯 Summary

✅ **Complete RBAC system ready to use**
- 4 roles with clear hierarchy
- 50+ granular permissions
- Backend route protection
- Frontend UI components
- Audit logging
- Security features

✅ **Production-ready**
- Well-documented
- Tested patterns
- Security best practices
- Easy to extend

✅ **Developer-friendly**
- Simple API
- Clear examples
- Type-safe
- Maintainable

**You're ready to implement RBAC in Stakeholder Radar!** 🚀
