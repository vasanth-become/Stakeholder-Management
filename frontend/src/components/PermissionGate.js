/**
 * PermissionGate Component
 *
 * Conditionally renders children based on user permissions
 */

import React from 'react';
import PropTypes from 'prop-types';
import { usePermission } from '../hooks/usePermission';
import { getForbiddenMessage } from '../utils/permissions';

/**
 * Permission Gate - Renders children only if user has permission
 *
 * @param {string} permission - Required permission
 * @param {React.ReactNode} children - Content to render if permitted
 * @param {React.ReactNode} fallback - Content to render if not permitted (default: null)
 * @param {boolean} showMessage - Show permission denied message (default: false)
 *
 * @example
 * <PermissionGate permission="project:create">
 *   <CreateProjectButton />
 * </PermissionGate>
 *
 * @example
 * <PermissionGate
 *   permission="project:delete"
 *   fallback={<span>You cannot delete this project</span>}
 * >
 *   <DeleteButton />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  children,
  fallback = null,
  showMessage = false,
}) {
  const { can, role } = usePermission();

  if (!can(permission)) {
    if (showMessage) {
      return (
        <div className="permission-denied-message">
          {getForbiddenMessage(permission, role)}
        </div>
      );
    }
    return fallback;
  }

  return <>{children}</>;
}

PermissionGate.propTypes = {
  permission: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
  showMessage: PropTypes.bool,
};

/**
 * Renders children only if user has ANY of the permissions
 *
 * @example
 * <AnyPermissionGate permissions={['project:update', 'project:delete']}>
 *   <ProjectActions />
 * </AnyPermissionGate>
 */
export function AnyPermissionGate({ permissions, children, fallback = null }) {
  const { canAny } = usePermission();

  if (!canAny(permissions)) {
    return fallback;
  }

  return <>{children}</>;
}

AnyPermissionGate.propTypes = {
  permissions: PropTypes.arrayOf(PropTypes.string).isRequired,
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
};

/**
 * Renders children only if user has ALL permissions
 *
 * @example
 * <AllPermissionsGate permissions={['project:read', 'stakeholder:read']}>
 *   <ProjectDetails />
 * </AllPermissionsGate>
 */
export function AllPermissionsGate({ permissions, children, fallback = null }) {
  const { canAll } = usePermission();

  if (!canAll(permissions)) {
    return fallback;
  }

  return <>{children}</>;
}

AllPermissionsGate.propTypes = {
  permissions: PropTypes.arrayOf(PropTypes.string).isRequired,
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
};

/**
 * Renders children only if user has specific role(s)
 *
 * @example
 * <RoleGate roles={['admin', 'manager']}>
 *   <AdminPanel />
 * </RoleGate>
 */
export function RoleGate({ roles, children, fallback = null }) {
  const { is } = usePermission();

  if (!is(...roles)) {
    return fallback;
  }

  return <>{children}</>;
}

RoleGate.propTypes = {
  roles: PropTypes.arrayOf(PropTypes.string).isRequired,
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
};

/**
 * Renders children only if user can access the resource
 * (based on ownership)
 *
 * @example
 * <ResourceGate ownerId={project.created_by}>
 *   <EditButton />
 * </ResourceGate>
 */
export function ResourceGate({ ownerId, children, fallback = null }) {
  const { canAccess } = usePermission();

  if (!canAccess(ownerId)) {
    return fallback;
  }

  return <>{children}</>;
}

ResourceGate.propTypes = {
  ownerId: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
};

/**
 * Higher-order component to wrap a component with permission check
 *
 * @example
 * const ProtectedSettings = withPermission('settings:workspace:update')(SettingsPage);
 */
export function withPermission(permission) {
  return (Component) => {
    function WrappedComponent(props) {
      return (
        <PermissionGate permission={permission}>
          <Component {...props} />
        </PermissionGate>
      );
    }

    WrappedComponent.displayName = `withPermission(${Component.displayName || Component.name})`;
    return WrappedComponent;
  };
}

/**
 * Higher-order component to wrap a component with role check
 *
 * @example
 * const AdminOnlyComponent = withRole('admin')(AdminDashboard);
 */
export function withRole(...roles) {
  return (Component) => {
    function WrappedComponent(props) {
      return (
        <RoleGate roles={roles}>
          <Component {...props} />
        </RoleGate>
      );
    }

    WrappedComponent.displayName = `withRole(${Component.displayName || Component.name})`;
    return WrappedComponent;
  };
}
