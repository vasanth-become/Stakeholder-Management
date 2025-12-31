import React, { useState } from 'react';

/**
 * OAuthButton Component
 * Reusable button for initiating OAuth connections
 */
function OAuthButton({ provider, connected, onDisconnect, className = '' }) {
  const [loading, setLoading] = useState(false);

  const providerConfig = {
    slack: {
      name: 'Slack',
      icon: '💬',
      color: '#4A154B',
      description: 'Send messages and notifications'
    },
    google: {
      name: 'Google',
      icon: '📧',
      color: '#4285F4',
      description: 'Access Gmail and Sheets'
    },
    jira: {
      name: 'Jira',
      icon: '📋',
      color: '#0052CC',
      description: 'Sync issues and tasks'
    }
  };

  const config = providerConfig[provider];

  if (!config) {
    return null;
  }

  const handleConnect = () => {
    setLoading(true);
    // Construct OAuth URL
    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    const authUrl = `${backendUrl}/auth/${provider}?userId=default-user`;

    // Open OAuth flow in same window (redirects to provider)
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    if (!onDisconnect) return;

    if (!window.confirm(`Are you sure you want to disconnect ${config.name}?`)) {
      return;
    }

    setLoading(true);
    try {
      await onDisconnect(provider);
    } catch (error) {
      console.error(`Error disconnecting ${provider}:`, error);
      alert(`Failed to disconnect ${config.name}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`oauth-button-container ${className}`}>
      <div className="oauth-button-header">
        <div className="oauth-button-info">
          <span className="oauth-icon">{config.icon}</span>
          <div>
            <h4>{config.name}</h4>
            <p className="text-muted">{config.description}</p>
          </div>
        </div>
        {connected && <span className="oauth-status-badge connected">Connected</span>}
      </div>

      <div className="oauth-button-actions">
        {connected ? (
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleDisconnect}
            disabled={loading}
          >
            {loading ? 'Disconnecting...' : 'Disconnect'}
          </button>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            onClick={handleConnect}
            disabled={loading}
            style={{ backgroundColor: config.color, borderColor: config.color }}
          >
            {loading ? 'Connecting...' : 'Connect'}
          </button>
        )}
      </div>
    </div>
  );
}

export default OAuthButton;
