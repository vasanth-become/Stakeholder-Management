/**
 * RBAC Permissions Configuration
 *
 * Central definition of all permissions and role mappings
 */

// Role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY = {
  viewer: 1,
  contributor: 2,
  manager: 3,
  admin: 4,
};

// All available roles
const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CONTRIBUTOR: 'contributor',
  VIEWER: 'viewer',
};

// Permission definitions
// Format: 'resource:action': ['allowed', 'roles']
const PERMISSIONS = {
  // ========================================================================
  // PROJECTS
  // ========================================================================
  'project:create': ['admin', 'manager'],
  'project:read': ['admin', 'manager', 'contributor', 'viewer'],
  'project:read:own': ['admin', 'manager', 'contributor', 'viewer'],
  'project:read:all': ['admin', 'manager'],
  'project:update': ['admin', 'manager'],
  'project:delete': ['admin', 'manager'],
  'project:archive': ['admin', 'manager'],

  // ========================================================================
  // STAKEHOLDERS
  // ========================================================================
  'stakeholder:create': ['admin', 'manager', 'contributor'],
  'stakeholder:read': ['admin', 'manager', 'contributor', 'viewer'],
  'stakeholder:update': ['admin', 'manager', 'contributor'],
  'stakeholder:update:own': ['admin', 'manager', 'contributor'],
  'stakeholder:update:all': ['admin', 'manager'],
  'stakeholder:delete': ['admin', 'manager'],

  // ========================================================================
  // INTERACTIONS
  // ========================================================================
  'interaction:create': ['admin', 'manager', 'contributor'],
  'interaction:read': ['admin', 'manager', 'contributor', 'viewer'],
  'interaction:update': ['admin', 'manager', 'contributor'],
  'interaction:update:own': ['admin', 'manager', 'contributor'],
  'interaction:update:all': ['admin', 'manager'],
  'interaction:delete': ['admin', 'manager'],

  // ========================================================================
  // REPORTS
  // ========================================================================
  'report:read': ['admin', 'manager', 'contributor', 'viewer'],
  'report:export': ['admin', 'manager', 'contributor'],
  'report:export:csv': ['admin', 'manager', 'contributor'],
  'report:export:pdf': ['admin', 'manager', 'contributor'],

  // ========================================================================
  // SETTINGS - WORKSPACE
  // ========================================================================
  'settings:workspace:read': ['admin', 'manager', 'contributor', 'viewer'],
  'settings:workspace:update': ['admin'],
  'settings:workspace:delete': ['admin'],

  // ========================================================================
  // SETTINGS - USERS
  // ========================================================================
  'settings:users:read': ['admin', 'manager'],
  'settings:users:invite': ['admin', 'manager'],
  'settings:users:update_roles': ['admin'],
  'settings:users:remove': ['admin'],

  // ========================================================================
  // BILLING
  // ========================================================================
  'billing:read': ['admin'],
  'billing:update': ['admin'],
  'billing:manage_payment': ['admin'],

  // ========================================================================
  // SECURITY
  // ========================================================================
  'security:audit_logs': ['admin'],
  'security:settings': ['admin'],
  'security:api_keys': ['admin', 'manager'],

  // ========================================================================
  // INTEGRATIONS
  // ========================================================================
  'integration:read': ['admin', 'manager', 'contributor', 'viewer'],
  'integration:connect': ['admin', 'manager'],
  'integration:disconnect': ['admin', 'manager'],
  'integration:configure': ['admin'],

  // ========================================================================
  // AI FEATURES
  // ========================================================================
  'ai:generate_insights': ['admin', 'manager', 'contributor'],
  'ai:view_insights': ['admin', 'manager', 'contributor', 'viewer'],

  // ========================================================================
  // ANALYTICS
  // ========================================================================
  'analytics:view': ['admin', 'manager', 'contributor', 'viewer'],
  'analytics:export': ['admin', 'manager'],

  // ========================================================================
  // NOTIFICATIONS
  // ========================================================================
  'notification:read': ['admin', 'manager', 'contributor', 'viewer'],
  'notification:configure': ['admin', 'manager', 'contributor', 'viewer'],
};

/**
 * Check if a role has a specific permission
 */
function hasPermission(role, permission) {
  if (!role || !permission) return false;

  const allowedRoles = PERMISSIONS[permission];

  if (!allowedRoles) {
    console.warn(`[RBAC] Unknown permission: ${permission}`);
    return false;
  }

  return allowedRoles.includes(role);
}

/**
 * Check if user can access resource based on ownership
 */
function canAccessResource(userRole, userId, resourceOwnerId, permission) {
  // Admin can access everything
  if (userRole === ROLES.ADMIN) return true;

  // Check if user owns the resource
  const isOwner = userId === resourceOwnerId;

  // Check permission with ownership modifier
  if (isOwner && hasPermission(userRole, `${permission}:own`)) {
    return true;
  }

  // Check permission for all resources
  if (hasPermission(userRole, `${permission}:all`)) {
    return true;
  }

  // Check basic permission
  return hasPermission(userRole, permission);
}

/**
 * Get all permissions for a role
 */
function getRolePermissions(role) {
  const permissions = [];

  for (const [permission, allowedRoles] of Object.entries(PERMISSIONS)) {
    if (allowedRoles.includes(role)) {
      permissions.push(permission);
    }
  }

  return permissions;
}

/**
 * Check if a role is higher than another
 */
function isRoleHigher(role1, role2) {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
}

/**
 * Validate role
 */
function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

/**
 * Get role display name
 */
function getRoleDisplayName(role) {
  const displayNames = {
    admin: 'Admin',
    manager: 'Manager',
    contributor: 'Contributor',
    viewer: 'Viewer',
  };

  return displayNames[role] || role;
}

/**
 * Get role description
 */
function getRoleDescription(role) {
  const descriptions = {
    admin: 'Full system access including billing and security settings',
    manager: 'Can manage projects, stakeholders, and invite team members',
    contributor: 'Can add and edit stakeholders and log interactions',
    viewer: 'Read-only access to view projects and reports',
  };

  return descriptions[role] || '';
}

/**
 * Get actions that require audit logging
 */
function requiresAuditLog(permission, role) {
  // Always log admin actions on sensitive resources
  const adminSensitiveActions = [
    'settings:users:update_roles',
    'settings:users:remove',
    'settings:workspace:update',
    'settings:workspace:delete',
    'billing:update',
    'security:settings',
  ];

  if (role === ROLES.ADMIN && adminSensitiveActions.includes(permission)) {
    return true;
  }

  // Log significant manager actions
  const managerSignificantActions = [
    'project:delete',
    'settings:users:invite',
    'stakeholder:delete',
  ];

  if (role === ROLES.MANAGER && managerSignificantActions.includes(permission)) {
    return true;
  }

  return false;
}

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  PERMISSIONS,
  hasPermission,
  canAccessResource,
  getRolePermissions,
  isRoleHigher,
  isValidRole,
  getRoleDisplayName,
  getRoleDescription,
  requiresAuditLog,
};
