/**
 * Access Denied (403) Page
 *
 * Shown when user tries to access a resource without permission
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';
import { getRoleDisplayName, getRoleDescription } from '../utils/permissions';

export default function AccessDenied() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, permissions } = usePermission();

  const reason = location.state?.reason || 'You do not have permission to access this page';
  const requiredPermission = location.state?.requiredPermission;

  return (
    <div className="access-denied-page">
      <div className="access-denied-container">
        {/* Icon */}
        <div className="access-denied-icon">
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="60" cy="60" r="50" stroke="#DC2626" strokeWidth="4" fill="none" />
            <path
              d="M40 40 L80 80 M80 40 L40 80"
              stroke="#DC2626"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="access-denied-title">Access Denied</h1>

        {/* Error Code */}
        <div className="error-code">403</div>

        {/* Reason */}
        <p className="access-denied-reason">{reason}</p>

        {/* Current Role Info */}
        <div className="role-info">
          <p className="role-label">Your current role:</p>
          <div className="role-badge">
            <span className="role-name">{getRoleDisplayName(role)}</span>
          </div>
          <p className="role-description">{getRoleDescription(role)}</p>
        </div>

        {/* Required Permission */}
        {requiredPermission && (
          <div className="required-permission">
            <p className="permission-label">Required permission:</p>
            <code className="permission-code">{requiredPermission}</code>
          </div>
        )}

        {/* Help Text */}
        <div className="help-text">
          <h3>What can you do?</h3>
          <ul>
            <li>Contact your workspace administrator to request access</li>
            <li>Check if you're logged in with the correct account</li>
            <li>Go back to a page you have access to</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="access-denied-actions">
          <button onClick={() => navigate(-1)} className="btn-secondary">
            Go Back
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Go to Dashboard
          </button>
        </div>

        {/* Debug Info (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="debug-info">
            <summary>Debug Information</summary>
            <div className="debug-content">
              <p>
                <strong>Current Role:</strong> {role}
              </p>
              <p>
                <strong>Attempted Path:</strong> {location.pathname}
              </p>
              {requiredPermission && (
                <p>
                  <strong>Required Permission:</strong> {requiredPermission}
                </p>
              )}
              <p>
                <strong>Your Permissions ({permissions.length}):</strong>
              </p>
              <pre>{JSON.stringify(permissions, null, 2)}</pre>
            </div>
          </details>
        )}
      </div>

      <style jsx>{`
        .access-denied-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);
        }

        .access-denied-container {
          max-width: 600px;
          text-align: center;
          background: white;
          padding: 3rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .access-denied-icon {
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: center;
        }

        .access-denied-title {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .error-code {
          font-size: 4rem;
          font-weight: 700;
          color: #dc2626;
          opacity: 0.2;
          margin-bottom: 1rem;
          line-height: 1;
        }

        .access-denied-reason {
          font-size: 1.125rem;
          color: #6b7280;
          margin-bottom: 2rem;
        }

        .role-info {
          background: #f9fafb;
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 2rem;
        }

        .role-label {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }

        .role-badge {
          display: inline-block;
          background: #4f46e5;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          margin-bottom: 0.5rem;
        }

        .role-name {
          font-weight: 600;
        }

        .role-description {
          font-size: 0.875rem;
          color: #6b7280;
          margin-top: 0.5rem;
        }

        .required-permission {
          margin-bottom: 2rem;
        }

        .permission-label {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }

        .permission-code {
          background: #fef2f2;
          color: #dc2626;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.875rem;
        }

        .help-text {
          text-align: left;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: #eff6ff;
          border-radius: 8px;
        }

        .help-text h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 1rem;
        }

        .help-text ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .help-text li {
          padding: 0.5rem 0;
          color: #4b5563;
          position: relative;
          padding-left: 1.5rem;
        }

        .help-text li:before {
          content: '→';
          position: absolute;
          left: 0;
          color: #3b82f6;
        }

        .access-denied-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .btn-primary,
        .btn-secondary {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #4f46e5;
          color: white;
        }

        .btn-primary:hover {
          background: #4338ca;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .debug-info {
          margin-top: 2rem;
          text-align: left;
          background: #f9fafb;
          padding: 1rem;
          border-radius: 4px;
          font-size: 0.875rem;
        }

        .debug-content {
          margin-top: 0.5rem;
        }

        .debug-content p {
          margin: 0.5rem 0;
        }

        .debug-content pre {
          background: #1f2937;
          color: #f3f4f6;
          padding: 1rem;
          border-radius: 4px;
          overflow-x: auto;
          margin-top: 0.5rem;
        }
      `}</style>
    </div>
  );
}
