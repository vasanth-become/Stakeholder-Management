/**
 * ProtectedRoute Component
 *
 * Route wrapper that requires authentication and/or specific permissions
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';

/**
 * Route that requires authentication
 *
 * @example
 * <Route path="/dashboard" element={
 *   <ProtectedRoute>
 *     <Dashboard />
 *   </ProtectedRoute>
 * } />
 */
export function ProtectedRoute({ children, redirectTo = '/login' }) {
  const { isAuthenticated } = usePermission();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login, saving the attempted location
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  redirectTo: PropTypes.string,
};

/**
 * Route that requires specific permission
 *
 * @example
 * <Route path="/settings" element={
 *   <PermissionRoute permission="settings:workspace:read">
 *     <Settings />
 *   </PermissionRoute>
 * } />
 */
export function PermissionRoute({
  permission,
  children,
  fallback = null,
  redirectTo = '/403',
}) {
  const { isAuthenticated, can } = usePermission();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!can(permission)) {
    if (fallback) {
      return fallback;
    }

    return (
      <Navigate
        to={redirectTo}
        state={{
          from: location,
          reason: 'You do not have permission to access this page',
          requiredPermission: permission,
        }}
        replace
      />
    );
  }

  return <>{children}</>;
}

PermissionRoute.propTypes = {
  permission: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
  redirectTo: PropTypes.string,
};

/**
 * Route that requires ANY of the permissions
 *
 * @example
 * <Route path="/projects" element={
 *   <AnyPermissionRoute permissions={['project:read', 'project:update']}>
 *     <Projects />
 *   </AnyPermissionRoute>
 * } />
 */
export function AnyPermissionRoute({
  permissions,
  children,
  redirectTo = '/403',
}) {
  const { isAuthenticated, canAny } = usePermission();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!canAny(permissions)) {
    return (
      <Navigate
        to={redirectTo}
        state={{
          from: location,
          reason: 'You do not have permission to access this page',
          requiredPermission: permissions.join(' OR '),
        }}
        replace
      />
    );
  }

  return <>{children}</>;
}

AnyPermissionRoute.propTypes = {
  permissions: PropTypes.arrayOf(PropTypes.string).isRequired,
  children: PropTypes.node.isRequired,
  redirectTo: PropTypes.string,
};

/**
 * Route that requires ALL permissions
 *
 * @example
 * <Route path="/admin" element={
 *   <AllPermissionsRoute permissions={['settings:read', 'settings:update']}>
 *     <AdminPanel />
 *   </AllPermissionsRoute>
 * } />
 */
export function AllPermissionsRoute({
  permissions,
  children,
  redirectTo = '/403',
}) {
  const { isAuthenticated, canAll } = usePermission();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!canAll(permissions)) {
    return (
      <Navigate
        to={redirectTo}
        state={{
          from: location,
          reason: 'You do not have all required permissions to access this page',
          requiredPermission: permissions.join(' AND '),
        }}
        replace
      />
    );
  }

  return <>{children}</>;
}

AllPermissionsRoute.propTypes = {
  permissions: PropTypes.arrayOf(PropTypes.string).isRequired,
  children: PropTypes.node.isRequired,
  redirectTo: PropTypes.string,
};

/**
 * Route that requires specific role(s)
 *
 * @example
 * <Route path="/admin" element={
 *   <RoleRoute roles={['admin']}>
 *     <AdminPanel />
 *   </RoleRoute>
 * } />
 */
export function RoleRoute({ roles, children, redirectTo = '/403' }) {
  const { isAuthenticated, is, role } = usePermission();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!is(...roles)) {
    return (
      <Navigate
        to={redirectTo}
        state={{
          from: location,
          reason: `This page requires ${roles.join(' or ')} role. You are currently: ${role}`,
        }}
        replace
      />
    );
  }

  return <>{children}</>;
}

RoleRoute.propTypes = {
  roles: PropTypes.arrayOf(PropTypes.string).isRequired,
  children: PropTypes.node.isRequired,
  redirectTo: PropTypes.string,
};

/**
 * Route that checks custom condition
 *
 * @example
 * <Route path="/profile/:userId" element={
 *   <ConditionalRoute
 *     condition={(user, params) => user.id === params.userId}
 *     reason="You can only view your own profile"
 *   >
 *     <UserProfile />
 *   </ConditionalRoute>
 * } />
 */
export function ConditionalRoute({
  condition,
  children,
  redirectTo = '/403',
  reason = 'Access denied',
}) {
  const { isAuthenticated } = usePermission();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const allowed = typeof condition === 'function' ? condition() : condition;

  if (!allowed) {
    return (
      <Navigate
        to={redirectTo}
        state={{
          from: location,
          reason,
        }}
        replace
      />
    );
  }

  return <>{children}</>;
}

ConditionalRoute.propTypes = {
  condition: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]).isRequired,
  children: PropTypes.node.isRequired,
  redirectTo: PropTypes.string,
  reason: PropTypes.string,
};
