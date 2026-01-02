/**
 * Frontend Permission Utilities
 *
 * Client-side permission checking for UI rendering
 * Note: Always validate on backend - this is for UI only!
 */

// Roles
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CONTRIBUTOR: 'contributor',
  VIEWER: 'viewer',
};

// Role hierarchy
const ROLE_HIERARCHY = {
  viewer: 1,
  contributor: 2,
  manager: 3,
  admin: 4,
};

// Permission matrix (must match backend)
const PERMISSIONS = {
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
  'security:api_keys': ['admin', 'manager'],

  // Integrations
  'integration:read': ['admin', 'manager', 'contributor', 'viewer'],
  'integration:manage': ['admin', 'manager'],

  // AI
  'ai:generate_insights': ['admin', 'manager', 'contributor'],
  'ai:view_insights': ['admin', 'manager', 'contributor', 'viewer'],
};

/**
 * Check if user has permission
 */
export function hasPermission(userRole, permission) {
  if (!userRole || !permission) return false;

  const allowedRoles = PERMISSIONS[permission];

  if (!allowedRoles) {
    console.warn(`[Permissions] Unknown permission: ${permission}`);
    return false;
  }

  return allowedRoles.includes(userRole);
}

/**
 * Check if user has ANY of the permissions
 */
export function hasAnyPermission(userRole, permissions) {
  return permissions.some(perm => hasPermission(userRole, perm));
}

/**
 * Check if user has ALL permissions
 */
export function hasAllPermissions(userRole, permissions) {
  return permissions.every(perm => hasPermission(userRole, perm));
}

/**
 * Check if user can access resource based on ownership
 */
export function canAccessResource(userRole, userId, resourceOwnerId) {
  // Admin can access everything
  if (userRole === ROLES.ADMIN) return true;

  // User can access their own resources
  if (userId === resourceOwnerId) return true;

  // Manager can access team resources
  if (userRole === ROLES.MANAGER) return true;

  return false;
}

/**
 * Check if user has specific role
 */
export function hasRole(userRole, ...allowedRoles) {
  return allowedRoles.includes(userRole);
}

/**
 * Check if role is higher than another
 */
export function isRoleHigher(role1, role2) {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role) {
  const displayNames = {
    admin: 'Admin',
    manager: 'Manager',
    contributor: 'Contributor',
    viewer: 'Viewer',
  };

  return displayNames[role] || role;
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role) {
  const colors = {
    admin: '#DC2626', // Red
    manager: '#4F46E5', // Indigo
    contributor: '#059669', // Green
    viewer: '#6B7280', // Gray
  };

  return colors[role] || '#6B7280';
}

/**
 * Get role description
 */
export function getRoleDescription(role) {
  const descriptions = {
    admin: 'Full system access including billing and security',
    manager: 'Can manage projects, stakeholders, and team members',
    contributor: 'Can add and edit stakeholders and interactions',
    viewer: 'Read-only access to view projects and reports',
  };

  return descriptions[role] || '';
}

/**
 * Get all available roles
 */
export function getAllRoles() {
  return [
    { value: ROLES.ADMIN, label: 'Admin', description: getRoleDescription(ROLES.ADMIN) },
    { value: ROLES.MANAGER, label: 'Manager', description: getRoleDescription(ROLES.MANAGER) },
    { value: ROLES.CONTRIBUTOR, label: 'Contributor', description: getRoleDescription(ROLES.CONTRIBUTOR) },
    { value: ROLES.VIEWER, label: 'Viewer', description: getRoleDescription(ROLES.VIEWER) },
  ];
}

/**
 * Get permissions for a role
 */
export function getRolePermissions(role) {
  const permissions = [];

  for (const [permission, allowedRoles] of Object.entries(PERMISSIONS)) {
    if (allowedRoles.includes(role)) {
      permissions.push(permission);
    }
  }

  return permissions;
}

/**
 * Check if route is accessible
 */
export function canAccessRoute(userRole, routePath) {
  const routePermissions = {
    '/dashboard': ['admin', 'manager', 'contributor', 'viewer'],
    '/projects': ['admin', 'manager', 'contributor', 'viewer'],
    '/projects/new': ['admin', 'manager'],
    '/stakeholders': ['admin', 'manager', 'contributor', 'viewer'],
    '/reports': ['admin', 'manager', 'contributor', 'viewer'],
    '/settings': ['admin', 'manager', 'contributor', 'viewer'],
    '/settings/team': ['admin', 'manager'],
    '/settings/billing': ['admin'],
    '/settings/security': ['admin'],
  };

  const allowedRoles = routePermissions[routePath];

  if (!allowedRoles) {
    // If route not in map, default to requiring authentication
    return true;
  }

  return allowedRoles.includes(userRole);
}

/**
 * Get forbidden reason message
 */
export function getForbiddenMessage(permission, userRole) {
  const messages = {
    'project:create': 'Only Admins and Managers can create projects',
    'project:delete': 'Only Admins and Managers can delete projects',
    'stakeholder:delete': 'Only Admins and Managers can delete stakeholders',
    'settings:users:invite': 'Only Admins and Managers can invite users',
    'settings:users:remove': 'Only Admins can remove users',
    'settings:workspace:update': 'Only Admins can update workspace settings',
    'billing:read': 'Only Admins can access billing information',
  };

  return messages[permission] || `Your role (${getRoleDisplayName(userRole)}) does not have permission for this action`;
}

/**
 * Format permissions for display
 */
export function formatPermission(permission) {
  const [resource, action] = permission.split(':');
  return {
    resource: resource.charAt(0).toUpperCase() + resource.slice(1),
    action: action.replace(/_/g, ' ').charAt(0).toUpperCase() + action.replace(/_/g, ' ').slice(1),
  };
}
