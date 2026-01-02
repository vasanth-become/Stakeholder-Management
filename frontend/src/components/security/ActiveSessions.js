import React, { useState, useEffect } from 'react';
import './ActiveSessions.css';

export default function ActiveSessions({ compact = false }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(null);
  const [showRevokeAllModal, setShowRevokeAllModal] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/security/active-sessions', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId) => {
    setRevoking(sessionId);

    try {
      const response = await fetch(`/api/security/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId));
      }
    } catch (error) {
      console.error('Failed to revoke session:', error);
    } finally {
      setRevoking(null);
    }
  };

  const revokeAllSessions = async () => {
    try {
      const response = await fetch('/api/security/revoke-all-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ includeCurrentSession: false }),
      });

      if (response.ok) {
        await fetchSessions();
        setShowRevokeAllModal(false);
      }
    } catch (error) {
      console.error('Failed to revoke all sessions:', error);
    }
  };

  const getDeviceIcon = (deviceInfo) => {
    if (deviceInfo.includes('Mobile')) return '📱';
    if (deviceInfo.includes('Tablet')) return '💻';
    return '🖥️';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Active now';
    if (diffMins < 60) return `Active ${diffMins}m ago`;
    if (diffHours < 24) return `Active ${diffHours}h ago`;
    if (diffDays < 7) return `Active ${diffDays}d ago`;

    return `Active ${date.toLocaleDateString()}`;
  };

  if (loading) {
    return (
      <div className="active-sessions loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className={`active-sessions ${compact ? 'compact' : ''}`}>
      {!compact && (
        <div className="active-sessions-header">
          <div className="header-content">
            <h2>Active Sessions</h2>
            <p className="active-sessions-subtitle">
              Manage devices where you're currently logged in
            </p>
          </div>

          {sessions.length > 1 && (
            <button
              className="revoke-all-button"
              onClick={() => setShowRevokeAllModal(true)}
            >
              Sign Out All Devices
            </button>
          )}
        </div>
      )}

      <div className="sessions-list">
        {sessions.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📱</span>
            <p>No active sessions</p>
          </div>
        ) : (
          sessions.map(session => (
            <div
              key={session.id}
              className={`session-card ${session.is_current ? 'current' : ''}`}
            >
              <div className="session-icon">
                <span>{getDeviceIcon(session.device_info)}</span>
              </div>

              <div className="session-content">
                <div className="session-main">
                  <span className="session-device">{session.device_info}</span>
                  {session.is_current && (
                    <span className="current-badge">Current Session</span>
                  )}
                </div>

                <div className="session-details">
                  <span className="session-ip">{session.ip_address}</span>
                  <span className="detail-separator">•</span>
                  <span className="session-timestamp">
                    {formatTimestamp(session.last_used_at || session.created_at)}
                  </span>
                </div>
              </div>

              {!session.is_current && !compact && (
                <button
                  className="revoke-button"
                  onClick={() => revokeSession(session.id)}
                  disabled={revoking === session.id}
                >
                  {revoking === session.id ? 'Revoking...' : 'Sign Out'}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Revoke All Modal */}
      {showRevokeAllModal && (
        <div className="modal-overlay" onClick={() => setShowRevokeAllModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Sign Out All Devices?</h3>
              <button
                className="modal-close"
                onClick={() => setShowRevokeAllModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p>
                This will sign you out from all devices except this one. You'll need to
                log in again on those devices.
              </p>
              <p className="modal-warning">
                ⚠️ This action cannot be undone.
              </p>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowRevokeAllModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={revokeAllSessions}
              >
                Sign Out All Devices
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
