/**
 * ProtectedButton Component
 *
 * Button that is disabled or hidden based on user permissions
 */

import React from 'react';
import PropTypes from 'prop-types';
import { usePermission } from '../hooks/usePermission';
import { getForbiddenMessage } from '../utils/permissions';

/**
 * Button that respects permissions
 *
 * @param {string} permission - Required permission
 * @param {string} mode - 'hide' or 'disable' (default: 'disable')
 * @param {string} tooltip - Custom tooltip when disabled
 * @param {React.ReactNode} children - Button content
 * @param {Function} onClick - Click handler
 * @param {string} className - Additional CSS classes
 * @param {Object} props - Other button props
 *
 * @example
 * <ProtectedButton
 *   permission="project:create"
 *   onClick={handleCreate}
 *   mode="hide"
 * >
 *   Create Project
 * </ProtectedButton>
 *
 * @example
 * <ProtectedButton
 *   permission="project:delete"
 *   onClick={handleDelete}
 *   mode="disable"
 *   className="btn-danger"
 * >
 *   Delete
 * </ProtectedButton>
 */
export function ProtectedButton({
  permission,
  mode = 'disable',
  tooltip,
  children,
  onClick,
  className = '',
  disabled = false,
  ...props
}) {
  const { can, role } = usePermission();

  const hasPermission = can(permission);
  const isDisabled = disabled || !hasPermission;

  // Hide mode - don't render if no permission
  if (mode === 'hide' && !hasPermission) {
    return null;
  }

  // Get tooltip message
  const tooltipMessage = tooltip || (hasPermission ? '' : getForbiddenMessage(permission, role));

  return (
    <button
      onClick={hasPermission ? onClick : undefined}
      disabled={isDisabled}
      className={`${className} ${!hasPermission ? 'permission-denied' : ''}`}
      title={tooltipMessage}
      aria-disabled={isDisabled}
      {...props}
    >
      {children}
    </button>
  );
}

ProtectedButton.propTypes = {
  permission: PropTypes.string.isRequired,
  mode: PropTypes.oneOf(['hide', 'disable']),
  tooltip: PropTypes.string,
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  className: PropTypes.string,
  disabled: PropTypes.bool,
};

/**
 * Icon button with permission protection
 *
 * @example
 * <ProtectedIconButton
 *   permission="stakeholder:delete"
 *   onClick={handleDelete}
 *   icon="trash"
 *   aria-label="Delete stakeholder"
 * />
 */
export function ProtectedIconButton({
  permission,
  icon,
  mode = 'disable',
  tooltip,
  onClick,
  className = '',
  disabled = false,
  ...props
}) {
  const { can, role } = usePermission();

  const hasPermission = can(permission);
  const isDisabled = disabled || !hasPermission;

  if (mode === 'hide' && !hasPermission) {
    return null;
  }

  const tooltipMessage = tooltip || (hasPermission ? '' : getForbiddenMessage(permission, role));

  return (
    <button
      onClick={hasPermission ? onClick : undefined}
      disabled={isDisabled}
      className={`icon-button ${className} ${!hasPermission ? 'permission-denied' : ''}`}
      title={tooltipMessage}
      aria-disabled={isDisabled}
      {...props}
    >
      <i className={`icon-${icon}`} />
    </button>
  );
}

ProtectedIconButton.propTypes = {
  permission: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  mode: PropTypes.oneOf(['hide', 'disable']),
  tooltip: PropTypes.string,
  onClick: PropTypes.func,
  className: PropTypes.string,
  disabled: PropTypes.bool,
};

/**
 * Link that respects permissions
 *
 * @example
 * <ProtectedLink
 *   permission="settings:workspace:read"
 *   to="/settings"
 * >
 *   Settings
 * </ProtectedLink>
 */
export function ProtectedLink({
  permission,
  to,
  mode = 'disable',
  children,
  className = '',
  ...props
}) {
  const { can } = usePermission();

  const hasPermission = can(permission);

  if (mode === 'hide' && !hasPermission) {
    return null;
  }

  if (!hasPermission) {
    return (
      <span className={`link-disabled ${className}`} {...props}>
        {children}
      </span>
    );
  }

  return (
    <a href={to} className={className} {...props}>
      {children}
    </a>
  );
}

ProtectedLink.propTypes = {
  permission: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  mode: PropTypes.oneOf(['hide', 'disable']),
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

/**
 * Menu item with permission protection
 *
 * @example
 * <ProtectedMenuItem
 *   permission="project:create"
 *   onClick={openCreateDialog}
 *   icon="plus"
 * >
 *   New Project
 * </ProtectedMenuItem>
 */
export function ProtectedMenuItem({
  permission,
  onClick,
  icon,
  mode = 'hide',
  children,
  className = '',
  ...props
}) {
  const { can } = usePermission();

  const hasPermission = can(permission);

  if (!hasPermission && (mode === 'hide' || mode === 'disable')) {
    if (mode === 'hide') return null;

    return (
      <div className={`menu-item disabled ${className}`} {...props}>
        {icon && <i className={`icon-${icon}`} />}
        <span>{children}</span>
      </div>
    );
  }

  return (
    <div
      className={`menu-item ${className}`}
      onClick={onClick}
      role="menuitem"
      tabIndex={0}
      {...props}
    >
      {icon && <i className={`icon-${icon}`} />}
      <span>{children}</span>
    </div>
  );
}

ProtectedMenuItem.propTypes = {
  permission: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  icon: PropTypes.string,
  mode: PropTypes.oneOf(['hide', 'disable']),
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

/**
 * Action dropdown menu with permission-based filtering
 *
 * @example
 * <ProtectedActionMenu
 *   actions={[
 *     { label: 'Edit', permission: 'project:update', onClick: handleEdit },
 *     { label: 'Delete', permission: 'project:delete', onClick: handleDelete },
 *     { label: 'Archive', permission: 'project:archive', onClick: handleArchive },
 *   ]}
 * />
 */
export function ProtectedActionMenu({ actions, className = '' }) {
  const { can } = usePermission();

  const allowedActions = actions.filter((action) => can(action.permission));

  if (allowedActions.length === 0) {
    return null;
  }

  return (
    <div className={`action-menu ${className}`}>
      {allowedActions.map((action, index) => (
        <button
          key={index}
          onClick={action.onClick}
          className="action-menu-item"
          disabled={action.disabled}
        >
          {action.icon && <i className={`icon-${action.icon}`} />}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}

ProtectedActionMenu.propTypes = {
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      permission: PropTypes.string.isRequired,
      onClick: PropTypes.func.isRequired,
      icon: PropTypes.string,
      disabled: PropTypes.bool,
    })
  ).isRequired,
  className: PropTypes.string,
};
