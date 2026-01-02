/**
 * RBAC Middleware
 *
 * Role-Based Access Control for API endpoints
 */

const { hasPermission, canAccessResource, requiresAuditLog, ROLES } = require('../config/permissions');
const auditService = require('../services/auditService');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Check if user has required permission
 *
 * Usage:
 *   app.get('/api/projects', checkPermission('project:read'), handler)
 *   app.post('/api/projects', checkPermission('project:create'), handler)
 */
function checkPermission(permission) {
  return async (req, res, next) => {
    try {
      // User must be authenticated
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
      }

      const { role } = req.user;

      // Check if user has permission
      if (!hasPermission(role, permission)) {
        // Log permission denial for security monitoring
        if (role === ROLES.ADMIN || role === ROLES.MANAGER) {
          await auditService.log(
            req.user.userId,
            'permission_denied',
            null,
            req.clientIP,
            {
              permission,
              role,
              endpoint: req.path,
              method: req.method,
            }
          );
        }

        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
          required: permission,
          current_role: role,
        });
      }

      // Log if this action requires auditing
      if (requiresAuditLog(permission, role)) {
        req.requiresAudit = true;
      }

      next();
    } catch (error) {
      console.error('[RBAC] Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Check if user has ANY of the required permissions
 *
 * Usage:
 *   app.get('/api/data', checkAnyPermission(['project:read', 'stakeholder:read']), handler)
 */
function checkAnyPermission(permissions) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { role } = req.user;
      const hasAnyPermission = permissions.some(perm => hasPermission(role, perm));

      if (!hasAnyPermission) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
          required_any: permissions,
          current_role: role,
        });
      }

      next();
    } catch (error) {
      console.error('[RBAC] Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Check resource ownership
 * Validates that user can access a specific resource
 *
 * Usage:
 *   app.patch('/api/stakeholders/:id',
 *     checkResourceOwnership('stakeholder', 'stakeholder:update'),
 *     handler
 *   )
 */
function checkResourceOwnership(resourceType, permission) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { userId, role } = req.user;
      const resourceId = req.params.id;

      // Admin has access to everything
      if (role === ROLES.ADMIN) {
        return next();
      }

      // Get resource owner
      const ownerId = await getResourceOwner(resourceType, resourceId);

      if (!ownerId) {
        return res.status(404).json({
          error: `${resourceType} not found`,
          code: 'NOT_FOUND',
        });
      }

      // Check if user can access this resource
      if (!canAccessResource(role, userId, ownerId, permission)) {
        return res.status(403).json({
          error: 'You do not have permission to access this resource',
          code: 'FORBIDDEN',
          resource_type: resourceType,
        });
      }

      // Attach ownership info to request
      req.resourceOwner = ownerId;
      req.isResourceOwner = userId === ownerId;

      next();
    } catch (error) {
      console.error('[RBAC] Ownership check error:', error);
      res.status(500).json({ error: 'Ownership check failed' });
    }
  };
}

/**
 * Require specific role(s)
 *
 * Usage:
 *   app.get('/api/admin/users', requireRole('admin'), handler)
 *   app.post('/api/invite', requireRole('admin', 'manager'), handler)
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { role } = req.user;

      if (!allowedRoles.includes(role)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
          required_roles: allowedRoles,
          current_role: role,
        });
      }

      next();
    } catch (error) {
      console.error('[RBAC] Role check error:', error);
      res.status(500).json({ error: 'Role check failed' });
    }
  };
}

/**
 * Audit logger middleware
 * Log admin actions automatically
 */
function auditAdminAction(action, resourceType = null) {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);

    res.json = function(data) {
      // Only log if request was successful (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Log in background (don't block response)
        setImmediate(async () => {
          try {
            await auditService.log(
              req.user.userId,
              action,
              resourceType,
              req.clientIP,
              {
                role: req.user.role,
                endpoint: req.path,
                method: req.method,
                params: req.params,
                resource_id: req.params.id,
              }
            );
          } catch (error) {
            console.error('[RBAC] Audit logging failed:', error);
          }
        });
      }

      // Call original json method
      return originalJson(data);
    };

    next();
  };
}

/**
 * Get resource owner from database
 */
async function getResourceOwner(resourceType, resourceId) {
  try {
    let query;
    let tableName;
    let ownerField = 'owner_id';

    switch (resourceType) {
      case 'project':
        tableName = 'projects';
        ownerField = 'owner_id';
        break;

      case 'stakeholder':
        tableName = 'stakeholders';
        ownerField = 'owner_id';
        break;

      case 'interaction':
        tableName = 'interactions';
        ownerField = 'user_id';
        break;

      default:
        console.warn(`[RBAC] Unknown resource type: ${resourceType}`);
        return null;
    }

    query = `SELECT ${ownerField} as owner_id FROM ${tableName} WHERE id = $1`;
    const result = await pool.query(query, [resourceId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].owner_id;
  } catch (error) {
    console.error('[RBAC] Error getting resource owner:', error);
    throw error;
  }
}

/**
 * Check workspace membership
 * Ensures user belongs to the workspace
 */
async function checkWorkspaceMembership(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { userId } = req.user;
    const workspaceId = req.params.workspaceId || req.body.workspace_id;

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID required' });
    }

    // Check if user is member of workspace
    const query = `
      SELECT role FROM workspace_members
      WHERE user_id = $1 AND workspace_id = $2
    `;

    const result = await pool.query(query, [userId, workspaceId]);

    if (result.rows.length === 0) {
      return res.status(403).json({
        error: 'You are not a member of this workspace',
        code: 'NOT_WORKSPACE_MEMBER',
      });
    }

    // Attach workspace role to request
    req.workspaceRole = result.rows[0].role;

    next();
  } catch (error) {
    console.error('[RBAC] Workspace membership check error:', error);
    res.status(500).json({ error: 'Workspace check failed' });
  }
}

/**
 * Prevent role escalation
 * Admin can't change their own role or demote themselves
 */
function preventRoleEscalation(req, res, next) {
  const { userId: requestorId, role: requestorRole } = req.user;
  const targetUserId = req.params.userId;
  const newRole = req.body.role;

  // Can't change your own role
  if (requestorId === targetUserId) {
    return res.status(400).json({
      error: 'You cannot change your own role',
      code: 'SELF_ROLE_CHANGE_FORBIDDEN',
    });
  }

  // Only admin can change roles
  if (requestorRole !== ROLES.ADMIN) {
    return res.status(403).json({
      error: 'Only admins can change user roles',
      code: 'FORBIDDEN',
    });
  }

  // Validate new role
  if (!Object.values(ROLES).includes(newRole)) {
    return res.status(400).json({
      error: 'Invalid role',
      code: 'INVALID_ROLE',
      allowed_roles: Object.values(ROLES),
    });
  }

  next();
}

module.exports = {
  checkPermission,
  checkAnyPermission,
  checkResourceOwnership,
  requireRole,
  auditAdminAction,
  checkWorkspaceMembership,
  preventRoleEscalation,
};
