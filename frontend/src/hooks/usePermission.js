/**
 * usePermission Hook
 *
 * React hook for checking permissions in components
 */

import { useAuth } from '../contexts/AuthContext';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  canAccessRoute,
  canAccessResource,
  getRolePermissions,
} from '../utils/permissions';

/**
 * Permission hook for React components
 *
 * @returns {Object} Permission checking functions
 *
 * @example
 * function MyComponent() {
 *   const { can, canAny, canAll, is, canAccess } = usePermission();
 *
 *   if (can('project:create')) {
 *     return <CreateProjectButton />;
 *   }
 *
 *   if (is('admin', 'manager')) {
 *     return <AdminPanel />;
 *   }
 * }
 */
export function usePermission() {
  const { user } = useAuth();

  // Get user role and ID
  const userRole = user?.role || 'viewer';
  const userId = user?.id;

  return {
    /**
     * Check if user has a specific permission
     * @param {string} permission - Permission to check
     * @returns {boolean}
     */
    can: (permission) => hasPermission(userRole, permission),

    /**
     * Check if user has ANY of the permissions
     * @param {Array<string>} permissions - Permissions to check
     * @returns {boolean}
     */
    canAny: (permissions) => hasAnyPermission(userRole, permissions),

    /**
     * Check if user has ALL permissions
     * @param {Array<string>} permissions - Permissions to check
     * @returns {boolean}
     */
    canAll: (permissions) => hasAllPermissions(userRole, permissions),

    /**
     * Check if user has specific role(s)
     * @param {...string} roles - Roles to check
     * @returns {boolean}
     */
    is: (...roles) => hasRole(userRole, ...roles),

    /**
     * Check if user can access a route
     * @param {string} routePath - Route path to check
     * @returns {boolean}
     */
    canAccessRoute: (routePath) => canAccessRoute(userRole, routePath),

    /**
     * Check if user can access a resource
     * @param {string} resourceOwnerId - Owner ID of the resource
     * @returns {boolean}
     */
    canAccess: (resourceOwnerId) => canAccessResource(userRole, userId, resourceOwnerId),

    /**
     * Get all permissions for current user's role
     * @returns {Array<string>}
     */
    permissions: getRolePermissions(userRole),

    /**
     * Current user's role
     */
    role: userRole,

    /**
     * Current user ID
     */
    userId: userId,

    /**
     * Is user authenticated
     */
    isAuthenticated: !!user,
  };
}

/**
 * Hook to check a specific permission
 * Useful for conditional rendering
 *
 * @param {string} permission - Permission to check
 * @returns {boolean}
 *
 * @example
 * function CreateButton() {
 *   const canCreate = useHasPermission('project:create');
 *   if (!canCreate) return null;
 *   return <button>Create Project</button>;
 * }
 */
export function useHasPermission(permission) {
  const { can } = usePermission();
  return can(permission);
}

/**
 * Hook to check if user has specific role
 *
 * @param {...string} roles - Roles to check
 * @returns {boolean}
 *
 * @example
 * function AdminPanel() {
 *   const isAdmin = useHasRole('admin');
 *   if (!isAdmin) return <AccessDenied />;
 *   return <AdminDashboard />;
 * }
 */
export function useHasRole(...roles) {
  const { is } = usePermission();
  return is(...roles);
}

/**
 * Hook to require authentication
 * Redirects to login if not authenticated
 *
 * @example
 * function ProtectedPage() {
 *   useRequireAuth();
 *   return <div>Protected Content</div>;
 * }
 */
export function useRequireAuth() {
  const { isAuthenticated } = usePermission();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return isAuthenticated;
}

/**
 * Hook to require specific permission
 * Shows access denied if permission not granted
 *
 * @param {string} permission - Required permission
 * @param {string} redirectTo - Where to redirect if denied (default: /403)
 *
 * @example
 * function AdminSettings() {
 *   useRequirePermission('settings:workspace:update');
 *   return <SettingsForm />;
 * }
 */
export function useRequirePermission(permission, redirectTo = '/403') {
  const { can, isAuthenticated } = usePermission();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (!can(permission)) {
      navigate(redirectTo, { replace: true });
    }
  }, [can, permission, isAuthenticated, navigate, redirectTo]);

  return can(permission);
}
