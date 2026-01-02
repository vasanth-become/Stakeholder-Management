import React, { useState, useEffect } from 'react';
import './LoginHistory.css';

export default function LoginHistory({ limit, compact = false }) {
  const [loginHistory, setLoginHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoginHistory();
  }, [limit]);

  const fetchLoginHistory = async () => {
    try {
      const url = limit ? `/api/security/login-history?limit=${limit}` : '/api/security/login-history';
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setLoginHistory(data.loginHistory);
      }
    } catch (error) {
      console.error('Failed to fetch login history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'user_login':
        return '✅';
      case 'login_failed':
        return '❌';
      case 'user_logout':
        return '🚪';
      default:
        return '📝';
    }
  };

  const getEventLabel = (eventType) => {
    switch (eventType) {
      case 'user_login':
        return 'Successful login';
      case 'login_failed':
        return 'Failed login attempt';
      case 'user_logout':
        return 'Logout';
      default:
        return eventType;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  if (loading) {
    return (
      <div className="login-history loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className={`login-history ${compact ? 'compact' : ''}`}>
      {!compact && (
        <div className="login-history-header">
          <h2>Login History</h2>
          <p className="login-history-subtitle">
            Review recent login activity on your account
          </p>
        </div>
      )}

      <div className="login-history-list">
        {loginHistory.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📜</span>
            <p>No login history available</p>
          </div>
        ) : (
          loginHistory.map(entry => (
            <div
              key={entry.id}
              className={`login-entry ${entry.eventType === 'login_failed' ? 'failed' : ''}`}
            >
              <div className="login-entry-icon">
                <span>{getEventIcon(entry.eventType)}</span>
              </div>

              <div className="login-entry-content">
                <div className="login-entry-main">
                  <span className="login-event-type">
                    {getEventLabel(entry.eventType)}
                  </span>
                  <span className="login-timestamp">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>

                <div className="login-entry-details">
                  <span className="login-device">
                    {entry.device.browser} on {entry.device.os}
                  </span>
                  {!compact && (
                    <>
                      <span className="detail-separator">•</span>
                      <span className="login-ip">{entry.ipAddress}</span>
                      <span className="detail-separator">•</span>
                      <span className="login-location">{entry.location}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
