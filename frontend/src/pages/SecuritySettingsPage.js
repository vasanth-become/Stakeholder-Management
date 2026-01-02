/**
 * Security Settings Page
 *
 * Comprehensive security management for user accounts
 * Design: Calm, modern, reassuring aesthetic
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoginHistory from '../components/security/LoginHistory';
import ActiveSessions from '../components/security/ActiveSessions';
import PasswordChange from '../components/security/PasswordChange';
import TwoFactorSetup from '../components/security/TwoFactorSetup';
import SuspiciousActivity from '../components/security/SuspiciousActivity';
import SecurityAlerts from '../components/security/SecurityAlerts';
import './SecuritySettingsPage.css';

export default function SecuritySettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [securityScore, setSecurityScore] = useState(0);

  useEffect(() => {
    calculateSecurityScore();
  }, []);

  const calculateSecurityScore = async () => {
    // Calculate security score based on various factors
    let score = 0;

    try {
      // Check 2FA status
      const settingsResponse = await fetch('/api/security/settings', {
        credentials: 'include',
      });
      const settings = await settingsResponse.json();

      if (settings.twoFactorEnabled) score += 40;

      // Check active sessions count
      const sessionsResponse = await fetch('/api/security/active-sessions', {
        credentials: 'include',
      });
      const { count } = await sessionsResponse.json();

      if (count <= 2) score += 20;
      else if (count <= 5) score += 10;

      // Check for recent password change
      score += 20; // Placeholder

      // Check alerts enabled
      if (settings.emailAlerts) score += 10;
      if (settings.loginAlerts) score += 5;
      if (settings.unusualActivityAlerts) score += 5;

      setSecurityScore(score);
      setLoading(false);
    } catch (error) {
      console.error('Failed to calculate security score:', error);
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '🛡️' },
    { id: 'password', label: 'Password', icon: '🔑' },
    { id: 'sessions', label: 'Sessions', icon: '📱' },
    { id: 'history', label: 'Login History', icon: '📜' },
    { id: '2fa', label: 'Two-Factor Auth', icon: '🔐' },
    { id: 'alerts', label: 'Alerts', icon: '🔔' },
  ];

  return (
    <div className="security-settings-page">
      {/* Header */}
      <div className="security-header">
        <div className="security-header-content">
          <h1>Security Settings</h1>
          <p className="security-subtitle">
            Manage your account security and privacy settings
          </p>
        </div>

        {/* Security Score */}
        {!loading && (
          <div className="security-score-card">
            <div className="security-score-label">Security Score</div>
            <div className="security-score-circle">
              <svg viewBox="0 0 120 120" className="score-ring">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke={getScoreColor(securityScore)}
                  strokeWidth="8"
                  strokeDasharray={`${(securityScore / 100) * 339.292} 339.292`}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                  className="score-progress"
                />
              </svg>
              <div className="score-value">
                <span className="score-number">{securityScore}</span>
                <span className="score-max">/100</span>
              </div>
            </div>
            <div className="security-score-status" style={{ color: getScoreColor(securityScore) }}>
              {getScoreLabel(securityScore)}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="security-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`security-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="security-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <SuspiciousActivity />
            <div className="overview-grid">
              <div className="overview-section">
                <h3>Recent Activity</h3>
                <LoginHistory limit={5} compact />
              </div>
              <div className="overview-section">
                <h3>Active Devices</h3>
                <ActiveSessions compact />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="tab-panel">
            <PasswordChange />
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="tab-panel">
            <ActiveSessions />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="tab-panel">
            <LoginHistory />
          </div>
        )}

        {activeTab === '2fa' && (
          <div className="tab-panel">
            <TwoFactorSetup />
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="tab-panel">
            <SecurityAlerts />
          </div>
        )}
      </div>
    </div>
  );
}
