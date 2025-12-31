import React, { useState } from 'react';

function SlackIntegrationModal({ isOpen, onClose, integration, onSave }) {
  const [settings, setSettings] = useState({
    channel: integration?.settings?.channel || '#stakeholder-alerts',
    notifications: {
      riskAlerts: integration?.settings?.notifications?.riskAlerts ?? true,
      noUpdateReminders: integration?.settings?.notifications?.noUpdateReminders ?? true,
      aiSuggestions: integration?.settings?.notifications?.aiSuggestions ?? false,
      projectSummaries: integration?.settings?.notifications?.projectSummaries ?? true
    }
  });

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key]
      }
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
          <h2>Slack Integration Settings</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="integration-modal-content">
            {/* Connection Status */}
            <div className="integration-status-banner">
              <div className="status-icon">✓</div>
              <div>
                <h4>Connected to Slack</h4>
                <p className="text-muted">Workspace: {integration?.workspaceName || 'My Workspace'}</p>
              </div>
            </div>

            {/* Channel Selection */}
            <div className="form-group">
              <label className="form-label">Default Channel</label>
              <select
                value={settings.channel}
                onChange={(e) => setSettings({ ...settings, channel: e.target.value })}
                className="form-select"
              >
                <option value="#stakeholder-alerts">#stakeholder-alerts</option>
                <option value="#project-updates">#project-updates</option>
                <option value="#notifications">#notifications</option>
                <option value="#general">#general</option>
              </select>
              <span className="form-hint">Choose where Stakeholder Radar will send notifications</span>
            </div>

            {/* Notification Toggles */}
            <div className="integration-settings-section">
              <h3>Notification Types</h3>
              <p className="text-muted">Choose what alerts to receive in Slack</p>

              <div className="notification-toggles">
                <div className="notification-toggle-item">
                  <div>
                    <h4>⚠️ Stakeholder Risk Alerts</h4>
                    <p className="text-muted">Get notified when stakeholder risk scores increase</p>
                    <div className="example-message">
                      <strong>Example:</strong><br />
                      "⚠️ Stakeholder Risk Increase<br />
                      Priya — High influence + resistant.<br />
                      Owner: Vasanth<br />
                      Suggested action: check-in call."
                    </div>
                  </div>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={settings.notifications.riskAlerts}
                      onChange={() => handleToggle('riskAlerts')}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-switch"></span>
                  </label>
                </div>

                <div className="notification-toggle-item">
                  <div>
                    <h4>📅 No-Update Reminders</h4>
                    <p className="text-muted">Reminders for stakeholders without recent interactions</p>
                  </div>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={settings.notifications.noUpdateReminders}
                      onChange={() => handleToggle('noUpdateReminders')}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-switch"></span>
                  </label>
                </div>

                <div className="notification-toggle-item">
                  <div>
                    <h4>✨ AI Suggestions</h4>
                    <p className="text-muted">AI-generated engagement recommendations</p>
                  </div>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={settings.notifications.aiSuggestions}
                      onChange={() => handleToggle('aiSuggestions')}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-switch"></span>
                  </label>
                </div>

                <div className="notification-toggle-item">
                  <div>
                    <h4>📊 Project Summaries</h4>
                    <p className="text-muted">Weekly project and stakeholder summaries</p>
                  </div>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={settings.notifications.projectSummaries}
                      onChange={() => handleToggle('projectSummaries')}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-switch"></span>
                  </label>
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

export default SlackIntegrationModal;
