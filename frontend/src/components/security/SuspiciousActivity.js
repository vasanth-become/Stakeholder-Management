import React, { useState, useEffect } from 'react';
import './SuspiciousActivity.css';

export default function SuspiciousActivity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuspiciousActivity();
  }, []);

  const fetchSuspiciousActivity = async () => {
    try {
      const response = await fetch('/api/security/suspicious-activity', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities);
      }
    } catch (error) {
      console.error('Failed to fetch suspicious activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#eab308';
      default:
        return '#6b7280';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high':
        return '🚨';
      case 'medium':
        return '⚠️';
      case 'low':
        return 'ℹ️';
      default:
        return '📝';
    }
  };

  if (loading) {
    return null; // Don't show loading state
  }

  if (activities.length === 0) {
    return (
      <div className="suspicious-activity no-issues">
        <div className="all-clear-card">
          <span className="all-clear-icon">✅</span>
          <div className="all-clear-content">
            <h3>All Clear!</h3>
            <p>No suspicious activity detected on your account</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="suspicious-activity">
      <div className="suspicious-header">
        <span className="alert-icon">🔔</span>
        <div className="alert-content">
          <h3>Security Alert</h3>
          <p>We've detected some activity that requires your attention</p>
        </div>
      </div>

      <div className="suspicious-list">
        {activities.map((activity, index) => (
          <div
            key={index}
            className="suspicious-item"
            style={{ borderLeftColor: getSeverityColor(activity.severity) }}
          >
            <div className="suspicious-item-header">
              <span className="severity-icon">{getSeverityIcon(activity.severity)}</span>
              <span className="activity-message">{activity.message}</span>
            </div>

            {activity.details && (
              <div className="suspicious-details">
                {activity.details.map((detail, idx) => (
                  <div key={idx} className="detail-item">
                    <span className="detail-label">{detail.ipAddress}</span>
                    <span className="detail-separator">•</span>
                    <span className="detail-value">{detail.location}</span>
                    <span className="detail-separator">•</span>
                    <span className="detail-timestamp">
                      {new Date(detail.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="suspicious-actions">
        <button className="btn-secondary">Review Activity</button>
        <button className="btn-primary">Secure My Account</button>
      </div>
    </div>
  );
}
