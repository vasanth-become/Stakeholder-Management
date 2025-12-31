import React, { useState } from 'react';

function GmailIntegrationModal({ isOpen, onClose, integration, onSave }) {
  const [settings, setSettings] = useState({
    autoLog: integration?.settings?.autoLog ?? false,
    trackContact: integration?.settings?.trackContact ?? true,
    sentimentAnalysis: integration?.settings?.sentimentAnalysis ?? false
  });

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = () => {
    onSave({ ...integration, settings });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Gmail Integration Settings</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="integration-modal-content">
            {/* Connection Status */}
            <div className="integration-status-banner">
              <div className="status-icon">✓</div>
              <div>
                <h4>Connected to Gmail</h4>
                <p className="text-muted">Account: {integration?.email || 'user@company.com'}</p>
              </div>
            </div>

            {/* Settings */}
            <div className="integration-settings-section">
              <h3>Email Communication Tracking</h3>
              <p className="text-muted">Configure how Stakeholder Radar integrates with your email</p>

              <div className="notification-toggles">
                <div className="notification-toggle-item">
                  <div>
                    <h4>📧 Auto-Log Emails</h4>
                    <p className="text-muted">Automatically log emails with stakeholders to their timeline</p>
                    <div className="info-box">
                      <strong>How it works:</strong> When you email a stakeholder, we'll add an interaction entry to their timeline.
                    </div>
                  </div>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={settings.autoLog}
                      onChange={() => handleToggle('autoLog')}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-switch"></span>
                  </label>
                </div>

                <div className="notification-toggle-item">
                  <div>
                    <h4>📅 Track Last Contact Date</h4>
                    <p className="text-muted">Update "last contacted" date based on email exchanges</p>
                  </div>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={settings.trackContact}
                      onChange={() => handleToggle('trackContact')}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-switch"></span>
                  </label>
                </div>

                <div className="notification-toggle-item">
                  <div>
                    <h4>🎯 Sentiment Analysis (Beta)</h4>
                    <p className="text-muted">Analyze email tone to detect engagement changes</p>
                    <div className="info-box">
                      <strong>Coming soon:</strong> AI-powered analysis of email sentiment to help identify relationship risks.
                    </div>
                  </div>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={settings.sentimentAnalysis}
                      onChange={() => handleToggle('sentimentAnalysis')}
                      className="toggle-checkbox"
                      disabled
                    />
                    <span className="toggle-switch"></span>
                  </label>
                </div>
              </div>
            </div>

            {/* Email Templates */}
            <div className="integration-settings-section">
              <h3>Email Templates</h3>
              <p className="text-muted">Quick templates for stakeholder outreach (coming soon)</p>

              <div className="template-list">
                <div className="template-item">
                  <span className="template-icon">📝</span>
                  <span className="template-name">Check-in Email</span>
                  <span className="badge-coming-soon">Coming Soon</span>
                </div>
                <div className="template-item">
                  <span className="template-icon">🎯</span>
                  <span className="template-name">Project Update</span>
                  <span className="badge-coming-soon">Coming Soon</span>
                </div>
                <div className="template-item">
                  <span className="template-icon">🤝</span>
                  <span className="template-name">Engagement Request</span>
                  <span className="badge-coming-soon">Coming Soon</span>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save Settings</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GmailIntegrationModal;
